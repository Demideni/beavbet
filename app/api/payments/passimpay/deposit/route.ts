import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { passimpaySignature } from "@/lib/passimpay";

export const runtime = "nodejs";

const BodySchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(10).optional().default("USD"),
  // optional customer info
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phoneNo: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { amount, currency, firstName, lastName, email, phoneNo } = parsed.data;

  const platformId = (process.env.PASSIMPAY_PLATFORM_ID || "").trim();
  const secret = (process.env.PASSIMPAY_API_KEY || "").trim();
  const baseUrl = (process.env.PASSIMPAY_BASE_URL || "https://api.passimpay.io").trim();

  if (!platformId || !secret) {
    return NextResponse.json({ error: "PASSIMPAY_PLATFORM_ID/PASSIMPAY_API_KEY is not set" }, { status: 500 });
  }

  const orderId = randomUUID();

  const body: Record<string, any> = {
    platformId,
    orderId,
    amount: amount.toFixed(2),
    symbol: currency,
  };

  if (firstName) body.firstName = firstName;
  if (lastName) body.lastName = lastName;
  if (email) body.email = email;
  if (phoneNo) body.phoneNo = phoneNo;

  const signature = passimpaySignature(platformId, body, secret);

  const r = await fetch(baseUrl + "/v2/createorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": signature,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    return NextResponse.json({ error: "passimpay_error", details: data }, { status: 400 });
  }

  const db = getDb();
  const now = Date.now();

  // Ensure wallet exists
  db.prepare(
    `INSERT OR IGNORE INTO wallets (id, user_id, currency, balance, created_at)
     VALUES (?, ?, ?, 0, ?)`
  ).run(randomUUID(), user.id, currency, now);

  // Record transaction (status pending until webhook confirms)
  db.prepare(
    `INSERT INTO transactions
      (id, user_id, type, amount, currency, status, created_at, meta, provider, provider_ref, order_id, updated_at)
     VALUES
      (?, ?, 'deposit', ?, ?, 'pending', ?, ?, 'passimpay', ?, ?, ?)`
  ).run(
    randomUUID(),
    user.id,
    amount,
    currency,
    now,
    JSON.stringify({ orderId, passimpay: data }),
    data.paymentId ?? null,
    orderId,
    now
  );

  return NextResponse.json({ url: data.url, orderId });
}
