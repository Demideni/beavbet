import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: true, user: null });

  const db = getDb();
  const profile = db
    .prepare("SELECT nickname, currency FROM profiles WHERE user_id = ?")
    .get(session.id) as { nickname?: string; currency?: string } | undefined;

  const currency = profile?.currency || "EUR";
  const wallet = db
    .prepare("SELECT balance FROM wallets WHERE user_id = ? AND currency = ?")
    .get(session.id, currency) as { balance: number } | undefined;

  return NextResponse.json({
    ok: true,
    user: {
      id: session.id,
      email: session.email,
      nickname: profile?.nickname || null,
      currency,
      balance: wallet?.balance || 0,
    },
  });
}
