import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassimpaySignature } from "@/lib/passimpay";
import { accrueCommissionFromDeposit } from "@/lib/affiliate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "BAD_JSON" }, { status: 400 });

  const platformId = (process.env.PASSIMPAY_PLATFORM_ID || "").trim();
  const secret = (process.env.PASSIMPAY_API_KEY || "").trim();
  const sig = req.headers.get("x-signature");

  if (!platformId || !secret) return NextResponse.json({ ok: false }, { status: 200 });

  if (!verifyPassimpaySignature(platformId, body, secret, sig)) {
    return NextResponse.json({ ok: false, error: "BAD_SIGNATURE" }, { status: 401 });
  }

  // We only care about payment callbacks
  if (body.type !== "payment") return NextResponse.json({ ok: true });

  const orderId = body.orderId;
  if (!orderId) return NextResponse.json({ ok: true });

  const db = getDb();
  const now = Date.now();

  const tx = db
    .prepare("SELECT id, user_id, currency, status, amount FROM transactions WHERE order_id = ? LIMIT 1")
    .get(orderId) as { id: string; user_id: string; currency: string; status: string; amount: number } | undefined;

  if (!tx) return NextResponse.json({ ok: true });

  // Idempotency: already processed
  if (tx.status === "done" || tx.status === "paid") return NextResponse.json({ ok: true });

  // Passimpay provides confirmations; some chains send multiple callbacks.
  // Credit when we have at least 2 confirmations OR if confirmations is missing (fiat/card).
  const confirmations = typeof body.confirmations === "number" ? body.confirmations : null;
  const shouldCredit = confirmations === null ? true : confirmations >= 2;

  const amountReceive =
    typeof body.amountReceive === "number"
      ? body.amountReceive
      : typeof body.amountReceive === "string"
      ? Number(body.amountReceive)
      : null;

  const creditAmount = Number.isFinite(amountReceive as any) && (amountReceive as any) > 0 ? (amountReceive as number) : tx.amount;

  const trx = db.transaction(() => {
    // Update meta/status
    db.prepare("UPDATE transactions SET status = ?, meta = ?, updated_at = ? WHERE id = ?").run(
      shouldCredit ? "done" : "pending",
      JSON.stringify({ webhook: body }),
      now,
      tx.id
    );

    if (shouldCredit) {
      db.prepare("UPDATE wallets SET balance = balance + ? WHERE user_id = ? AND currency = ?").run(
        creditAmount,
        tx.user_id,
        tx.currency
      );
    }
  });

  trx();

  // Affiliate commission only when credited
  if (shouldCredit) {
    try {
      accrueCommissionFromDeposit(tx.user_id, creditAmount, tx.currency);
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
