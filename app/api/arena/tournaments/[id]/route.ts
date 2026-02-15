import { NextResponse } from "next/server";
import { getTournament, getTournamentPlayersCount, listMatchesForTournament, listParticipants } from "@/lib/arena";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const t = getTournament(id);
  if (!t) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const players = getTournamentPlayersCount(id);
  const participants = listParticipants(id);
  const matches = listMatchesForTournament(id);

  return NextResponse.json({
    ok: true,
    tournament: {
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
      players,
    },
    participants,
    matches,
  });
}
