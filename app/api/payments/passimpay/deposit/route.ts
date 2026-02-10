import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { passimpaySignature } from "@/lib/passimpay";

export const runtime = "nodejs";

const Schema = z.object({
  amount: z.number().finite().positive().max(1000000),
  currency: z.enum(["USD", "EUR", "USDT", "BTC"]).default("EUR"),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const platformId = (process.env.PASSIMPAY_PLATFORM_ID || "").trim();
  const secret = (process.env.PASSIMPAY_API_KEY || "").trim();
  const baseUrl = (process.env.PASSIMPAY_BASE_URL || "https://api.passimpay.io").trim();

  if (!platformId || !secret) {
    return NextResponse.json({ ok: false, error: "PASSIMPAY_NOT_CONFIGURED" }, { status: 500 });
  }

  const { amount, currency } = parsed.data;

  // Ensure wallet exists now (so UI can show it) but DO NOT credit here
  const db = getDb();
  const now = Date.now();

  const w = db
    .prepare("SELECT id FROM wallets WHERE user_id = ? AND currency = ?")
    .get(session.id, currency) as { id: string } | undefined;
  if (!w) {
    db.prepare("INSERT INTO wallets (id, user_id, currency, balance, created_at) VALUES (?, ?, ?, ?, ?)").run(
      randomUUID(),
      session.id,
      currency,
      0,
      now
    );
  }

  const orderId = randomUUID();

  const body = {
    platformId,
    orderId,
    amount: amount.toFixed(2),
    symbol: currency,
  };

  const signature = passimpaySignature(platformId, body, secret);

  const r = await fetch(`${baseUrl}/v2/createorder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": signature,
    },
    body: JSON.stringify(body),
    // IMPORTANT: do not cache
    cache: "no-store",
  });

  const data = await r.json().catch(() => null);

  if (!r.ok || !data?.url) {
    return NextResponse.json({ ok: false, error: "PASSIMPAY_ERROR", details: data }, { status: 400 });
  }

  // Save a pending transaction
  const txId = randomUUID();
  db.prepare(
    "INSERT INTO transactions (id, user_id, type, amount, currency, status, created_at, meta, provider, provider_ref, order_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    txId,
    session.id,
    "deposit",
    amount,
    currency,
    "pending",
    now,
    JSON.stringify({ passimpay: { url: data.url, response: data } }),
    "passimpay",
    data.paymentId ?? null,
    orderId,
    now
  );

  return NextResponse.json({ ok: true, url: data.url, orderId });
}
