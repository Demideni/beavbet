import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { consumeLocked, creditPrize } from "./wallet";

export type ArenaTournament = {
  id: string;
  title: string;
  game: string;
  team_size: number;
  entry_fee: number;
  currency: string;
  max_players: number;
  rake: number;
  status: "open" | "live" | "finished";
  starts_at: number | null;
  created_at: number;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ensureSeedTournaments() {
  const db = getDb();
  const c = db.prepare("SELECT COUNT(*) as n FROM arena_tournaments").get() as { n: number };
  if ((c?.n ?? 0) > 0) return;

  const now = Date.now();
  const seeds: Array<Pick<ArenaTournament, "title" | "game" | "team_size" | "entry_fee" | "currency" | "max_players" | "rake">> = [
    { title: "Express Cup", game: "CS2", team_size: 1, entry_fee: 5, currency: "EUR", max_players: 8, rake: 0.1 },
    { title: "Daily Cup", game: "Dota 2", team_size: 1, entry_fee: 10, currency: "EUR", max_players: 16, rake: 0.1 },
    { title: "Express Cup", game: "Valorant", team_size: 1, entry_fee: 5, currency: "EUR", max_players: 8, rake: 0.1 },
  ];
  const ins = db.prepare(
    "INSERT INTO arena_tournaments (id, title, game, team_size, entry_fee, currency, max_players, rake, status, starts_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, ?, ?)"
  );
  for (const s of seeds) {
    ins.run(randomUUID(), s.title, s.game, s.team_size, s.entry_fee, s.currency, s.max_players, s.rake, now, now);
  }
}

export function getTournament(id: string): ArenaTournament | null {
  const db = getDb();
  const t = db.prepare("SELECT * FROM arena_tournaments WHERE id = ?").get(id) as ArenaTournament | undefined;
  return t ?? null;
}

export function getTournamentPlayersCount(tournamentId: string) {
  const db = getDb();
  const r = db
    .prepare("SELECT COUNT(*) as n FROM arena_participants WHERE tournament_id = ?")
    .get(tournamentId) as { n: number };
  return r?.n ?? 0;
}

export function listTournaments() {
  const db = getDb();
  ensureSeedTournaments();
  const rows = db
    .prepare(
      "SELECT t.*, (SELECT COUNT(*) FROM arena_participants p WHERE p.tournament_id = t.id) as players FROM arena_tournaments t ORDER BY status ASC, created_at DESC"
    )
    .all() as Array<ArenaTournament & { players: number }>;
  return rows;
}

export function listParticipants(tournamentId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.user_id, p.status, pr.nickname
       FROM arena_participants p
       LEFT JOIN profiles pr ON pr.user_id = p.user_id
       WHERE p.tournament_id = ?
       ORDER BY p.created_at ASC`
    )
    .all(tournamentId) as Array<{ user_id: string; status: string; nickname: string | null }>;
}

export function listMatchesForTournament(tournamentId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT m.*, 
          p1.nickname as p1_nick,
          p2.nickname as p2_nick,
          w.nickname as winner_nick
       FROM arena_matches m
       LEFT JOIN profiles p1 ON p1.user_id = m.p1_user_id
       LEFT JOIN profiles p2 ON p2.user_id = m.p2_user_id
       LEFT JOIN profiles w ON w.user_id = m.winner_user_id
       WHERE m.tournament_id = ?
       ORDER BY m.round ASC, m.created_at ASC`
    )
    .all(tournamentId);
}

function createRoundMatches(tournamentId: string, round: number, players: string[]) {
  const db = getDb();
  const now = Date.now();
  const ins = db.prepare(
    "INSERT INTO arena_matches (id, tournament_id, round, p1_user_id, p2_user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)"
  );
  for (let i = 0; i < players.length; i += 2) {
    ins.run(randomUUID(), tournamentId, round, players[i], players[i + 1], now, now);
  }
}

export function startTournamentIfFull(tournamentId: string) {
  const db = getDb();
  const t = getTournament(tournamentId);
  if (!t || t.status !== "open") return;
  const count = getTournamentPlayersCount(tournamentId);
  if (count < t.max_players) return;

  // Consume locked entry fees now (money leaves players' locked balances).
  const users = db
    .prepare("SELECT user_id FROM arena_participants WHERE tournament_id = ? ORDER BY created_at ASC")
    .all(tournamentId) as Array<{ user_id: string }>;
  for (const u of users) consumeLocked(u.user_id, t.currency, t.entry_fee, tournamentId);

  const now = Date.now();
  db.prepare("UPDATE arena_tournaments SET status = 'live', starts_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, tournamentId);

  // Round 1 bracket
  const shuffled = shuffle(users.map((u) => u.user_id));
  createRoundMatches(tournamentId, 1, shuffled);
}

function maybeAdvance(tournamentId: string, round: number) {
  const db = getDb();
  const t = getTournament(tournamentId);
  if (!t) return;

  // all matches in this round must be done
  const open = db
    .prepare("SELECT COUNT(*) as n FROM arena_matches WHERE tournament_id = ? AND round = ? AND status != 'done'")
    .get(tournamentId, round) as { n: number };
  if ((open?.n ?? 0) > 0) return;

  const winners = db
    .prepare("SELECT winner_user_id as w FROM arena_matches WHERE tournament_id = ? AND round = ? ORDER BY created_at ASC")
    .all(tournamentId, round)
    .map((r: any) => r.w)
    .filter(Boolean) as string[];

  if (winners.length <= 1) {
    if (winners.length === 1) finishTournament(tournamentId, winners[0]);
    return;
  }

  // if next round already exists, don't duplicate
  const nextExists = db
    .prepare("SELECT COUNT(*) as n FROM arena_matches WHERE tournament_id = ? AND round = ?")
    .get(tournamentId, round + 1) as { n: number };
  if ((nextExists?.n ?? 0) > 0) return;

  createRoundMatches(tournamentId, round + 1, winners);
}

function finishTournament(tournamentId: string, winnerUserId: string) {
  const db = getDb();
  const t = getTournament(tournamentId);
  if (!t || t.status === "finished") return;

  const total = t.entry_fee * t.max_players;
  const fee = Number((total * t.rake).toFixed(2));
  const pool = Number((total - fee).toFixed(2));

  // Determine placements: winner + runner-up + third.
  const finalMatch = db
    .prepare("SELECT p1_user_id, p2_user_id FROM arena_matches WHERE tournament_id = ? ORDER BY round DESC, created_at DESC LIMIT 1")
    .get(tournamentId) as { p1_user_id: string; p2_user_id: string } | undefined;
  const runnerUp = finalMatch ? (finalMatch.p1_user_id === winnerUserId ? finalMatch.p2_user_id : finalMatch.p1_user_id) : null;

  // Third place: losers from semi-finals (last round-1). Pick first not runnerUp.
  const semiRound = Math.max(1, Math.log2(t.max_players) - 1);
  const semis = db
    .prepare("SELECT p1_user_id, p2_user_id, winner_user_id FROM arena_matches WHERE tournament_id = ? AND round = ?")
    .all(tournamentId, semiRound) as Array<{ p1_user_id: string; p2_user_id: string; winner_user_id: string }>;
  const semiLosers: string[] = [];
  for (const m of semis) {
    if (!m.winner_user_id) continue;
    semiLosers.push(m.p1_user_id === m.winner_user_id ? m.p2_user_id : m.p1_user_id);
  }
  const third = semiLosers.find((x) => x && x !== runnerUp && x !== winnerUserId) || null;

  const payouts: Array<{ userId: string; amount: number; place: number }> = [];
  if (t.max_players >= 8 && runnerUp && third) {
    payouts.push({ userId: winnerUserId, amount: Number((pool * 0.7).toFixed(2)), place: 1 });
    payouts.push({ userId: runnerUp, amount: Number((pool * 0.2).toFixed(2)), place: 2 });
    payouts.push({ userId: third, amount: Number((pool * 0.1).toFixed(2)), place: 3 });
  } else if (runnerUp) {
    payouts.push({ userId: winnerUserId, amount: Number((pool * 0.75).toFixed(2)), place: 1 });
    payouts.push({ userId: runnerUp, amount: Number((pool * 0.25).toFixed(2)), place: 2 });
  } else {
    payouts.push({ userId: winnerUserId, amount: pool, place: 1 });
  }

  for (const p of payouts) {
    creditPrize(p.userId, t.currency, p.amount, tournamentId, { place: p.place, tournamentId });
  }

  const now = Date.now();
  db.prepare("UPDATE arena_tournaments SET status = 'finished', updated_at = ? WHERE id = ?").run(now, tournamentId);
  db.prepare("UPDATE arena_participants SET status = CASE WHEN user_id = ? THEN 'winner' ELSE 'eliminated' END WHERE tournament_id = ?").run(
    winnerUserId,
    tournamentId
  );
}

export function reportMatchResult(matchId: string, userId: string, result: "win" | "lose") {
  const db = getDb();
  const match = db
    .prepare("SELECT id, tournament_id, round, p1_user_id, p2_user_id, status FROM arena_matches WHERE id = ?")
    .get(matchId) as any;
  if (!match) return { ok: false as const, error: "NOT_FOUND" };
  if (match.status === "done") return { ok: true as const };
  if (userId !== match.p1_user_id && userId !== match.p2_user_id) return { ok: false as const, error: "FORBIDDEN" };

  // Upsert report
  const now = Date.now();
  db.prepare(
    "INSERT OR REPLACE INTO arena_match_reports (id, match_id, user_id, result, created_at) VALUES (COALESCE((SELECT id FROM arena_match_reports WHERE match_id = ? AND user_id = ?), ?), ?, ?, ?, ?)"
  ).run(matchId, userId, randomUUID(), matchId, userId, result, now);

  const reports = db
    .prepare("SELECT user_id, result FROM arena_match_reports WHERE match_id = ?")
    .all(matchId) as Array<{ user_id: string; result: string }>;
  if (reports.length < 2) {
    db.prepare("UPDATE arena_matches SET status = 'reported', updated_at = ? WHERE id = ?").run(now, matchId);
    return { ok: true as const, status: "reported" as const };
  }

  const r1 = reports.find((r) => r.user_id === match.p1_user_id)?.result;
  const r2 = reports.find((r) => r.user_id === match.p2_user_id)?.result;

  if (!r1 || !r2) return { ok: true as const, status: "reported" as const };

  // Resolve
  const consistent = (r1 === "win" && r2 === "lose") || (r1 === "lose" && r2 === "win");
  if (!consistent) {
    db.prepare("UPDATE arena_matches SET status = 'pending_review', updated_at = ? WHERE id = ?").run(now, matchId);
    return { ok: true as const, status: "pending_review" as const };
  }

  const winner = r1 === "win" ? match.p1_user_id : match.p2_user_id;
  db.prepare("UPDATE arena_matches SET winner_user_id = ?, status = 'done', updated_at = ? WHERE id = ?").run(winner, now, matchId);

  maybeAdvance(match.tournament_id, match.round);
  return { ok: true as const, status: "done" as const, winner };
}
