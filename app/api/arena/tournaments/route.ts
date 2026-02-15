import { NextResponse } from "next/server";
import { listTournaments } from "@/lib/arena";

export async function GET() {
  const rows = listTournaments().map((t) => ({
    id: t.id,
    title: t.title,
    game: t.game,
    teamSize: t.team_size,
    entryFee: t.entry_fee,
    currency: t.currency,
    maxPlayers: t.max_players,
    rake: t.rake,
    status: t.status,
    startsAt: t.starts_at,
    players: (t as any).players ?? 0,
  }));
  return NextResponse.json({ ok: true, tournaments: rows });
}
