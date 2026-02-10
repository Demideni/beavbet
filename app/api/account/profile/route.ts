import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

const ProfileSchema = z.object({
  nickname: z.string().min(2).max(24).optional(),
  currency: z.enum(["USD", "EUR", "USDT", "BTC"]).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = ProfileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const db = getDb();
  const current = db
    .prepare("SELECT nickname, currency FROM profiles WHERE user_id = ?")
    .get(session.id) as { nickname?: string; currency?: string } | undefined;

  const nickname = (parsed.data.nickname ?? current?.nickname ?? session.email.split("@")[0]).trim();
  const currency = parsed.data.currency ?? current?.currency ?? "EUR";

  db.prepare("UPDATE profiles SET nickname = ?, currency = ? WHERE user_id = ?").run(
    nickname,
    currency,
    session.id
  );

  // Ensure wallet exists for selected currency
  const w = db
    .prepare("SELECT id FROM wallets WHERE user_id = ? AND currency = ?")
    .get(session.id, currency) as { id: string } | undefined;
  if (!w) {
    db.prepare(
      "INSERT INTO wallets (id, user_id, currency, balance, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), session.id, currency, 0, Date.now());
  }

  return NextResponse.json({ ok: true, profile: { nickname, currency } });
}
