import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getTournament, getTournamentPlayersCount, startTournamentIfFull } from "@/lib/arena";
import { lockFunds } from "@/lib/wallet";
import { randomUUID } from "node:crypto";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tournamentId = String(body?.tournamentId || "");
  if (!tournamentId) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

  const t = getTournament(tournamentId);
  if (!t) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (t.status !== "open") return NextResponse.json({ ok: false, error: "NOT_OPEN" }, { status: 400 });

  const db = getDb();
  const already = db
    .prepare("SELECT 1 as x FROM arena_participants WHERE tournament_id = ? AND user_id = ?")
    .get(tournamentId, user.id) as { x: number } | undefined;
  if (already?.x) return NextResponse.json({ ok: true, joined: true });

  const count = getTournamentPlayersCount(tournamentId);
  if (count >= t.max_players) return NextResponse.json({ ok: false, error: "FULL" }, { status: 400 });

  // lock funds
  const lock = lockFunds(user.id, t.currency, t.entry_fee, tournamentId);
  if (!lock.ok) return NextResponse.json({ ok: false, error: lock.error }, { status: 400 });

  db.prepare(
    "INSERT INTO arena_participants (id, tournament_id, user_id, status, created_at) VALUES (?, ?, ?, 'joined', ?)"
  ).run(randomUUID(), tournamentId, user.id, Date.now());

  startTournamentIfFull(tournamentId);
  return NextResponse.json({ ok: true, joined: true });
}
