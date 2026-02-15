import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT m.id, m.tournament_id, m.round, m.status, m.winner_user_id,
              t.title, t.game, t.entry_fee, t.currency,
              p1.nickname as p1_nick,
              p2.nickname as p2_nick
       FROM arena_matches m
       JOIN arena_tournaments t ON t.id = m.tournament_id
       LEFT JOIN profiles p1 ON p1.user_id = m.p1_user_id
       LEFT JOIN profiles p2 ON p2.user_id = m.p2_user_id
       WHERE (m.p1_user_id = ? OR m.p2_user_id = ?)
       ORDER BY t.created_at DESC, m.round DESC, m.created_at DESC
       LIMIT 50`
    )
    .all(user.id, user.id);

  return NextResponse.json({ ok: true, matches: rows });
}
