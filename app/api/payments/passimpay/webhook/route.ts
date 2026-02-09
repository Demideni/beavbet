import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassimpaySignatureFromRaw } from "@/lib/passimpay";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const platformId = (process.env.PASSIMPAY_PLATFORM_ID || "").trim();
  const secret = (process.env.PASSIMPAY_API_KEY || "").trim();

  if (!platformId || !secret) {
    return NextResponse.json(
      { ok: false, error: "PASSIMPAY_PLATFORM_ID/PASSIMPAY_API_KEY is not set" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("x-signature") || req.headers.get("X-Signature") || "";

  // IMPORTANT: verify against RAW JSON string, not re-serialized object
  const raw = await req.text().catch(() => "");
  if (!raw) return NextResponse.json({ ok: false, error: "empty_body" }, { status: 400 });

  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!verifyPassimpaySignatureFromRaw(platformId, raw, secret, signature)) {
    // Keep ack=401 so Passimpay retries (helps debugging)
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 401 });
  }

  // We expect payment webhooks. Ignore other types safely.
  const eventType = body.type;
  if (eventType !== "payment") return NextResponse.json({ ok: true });

  const orderId = body.orderId || body.order_id;
  if (!orderId) return NextResponse.json({ ok: true });

  const db = getDb();
  const tx = db
    .prepare(`SELECT * FROM transactions WHERE order_id = ? AND provider = 'passimpay' LIMIT 1`)
    .get(orderId) as any;

  if (!tx) {
    // Unknown orderId - still ack to avoid retries storm.
    return NextResponse.json({ ok: true });
  }

  // idempotency: already processed
  if (tx.status === "done" || tx.status === "paid") return NextResponse.json({ ok: true });

  // Some providers send confirmations, some send status only.
  const confirmations = Number(body.confirmations ?? 0);
  const status = String(body.status ?? "").toLowerCase();
  const minConfirmations = 1;

  const paidAmount = Number(body.amountReceive ?? body.amount ?? tx.amount);

  // Update transaction meta with latest webhook (keep history)
  const meta = (() => {
    try {
      return tx.meta ? JSON.parse(tx.meta) : {};
    } catch {
      return {};
    }
  })();
  const hooks = Array.isArray(meta.webhooks) ? meta.webhooks : [];
  hooks.push({ at: Date.now(), body });
  meta.webhooks = hooks;

  const now = Date.now();
  db.prepare(`UPDATE transactions SET meta = ?, updated_at = ? WHERE id = ?`).run(JSON.stringify(meta), now, tx.id);

  // If webhook uses confirmations model - wait for it.
  // If webhook uses status model - credit on paid/success.
  const isPaidByStatus = status === "paid" || status === "success" || status === "completed";
  if (!isPaidByStatus && confirmations < minConfirmations) {
    return NextResponse.json({ ok: true });
  }

  // Ensure wallet exists
  const { randomUUID } = await import("node:crypto");
  db.prepare(
    `INSERT OR IGNORE INTO wallets (id, user_id, currency, balance, created_at)
     VALUES (?, ?, ?, 0, ?)`
  ).run(randomUUID(), tx.user_id, tx.currency, now);

  // Credit wallet once
  db.prepare(`UPDATE wallets SET balance = balance + ? WHERE user_id = ? AND currency = ?`).run(
    paidAmount,
    tx.user_id,
    tx.currency
  );

  // Mark transaction done
  db.prepare(`UPDATE transactions SET status = 'done', updated_at = ? WHERE id = ?`).run(now, tx.id);

  return NextResponse.json({ ok: true });
}
