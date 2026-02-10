import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  const db = getDb();

  const profile = db
    .prepare("SELECT currency FROM profiles WHERE user_id = ?")
    .get(session.id) as { currency?: string } | undefined;

  const wallets = db
    .prepare("SELECT currency, balance FROM wallets WHERE user_id = ? ORDER BY currency")
    .all(session.id) as Array<{ currency: string; balance: number }>;

  const defaultCurrency = profile?.currency || "EUR";
  const main = wallets.find((w) => w.currency === defaultCurrency) || wallets[0] || null;

  const tx = db
    .prepare(
      "SELECT id, type, amount, currency, status, created_at as createdAt FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .all(session.id) as Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: number;
  }>;

  return NextResponse.json({
    ok: true,
    defaultCurrency,
    wallets,
    main,
    transactions: tx,
  });
}
