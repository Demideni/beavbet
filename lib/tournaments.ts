import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { SqliteDb } from "@/lib/db";

export type TournamentType = "daily" | "monthly";

export type Tournament = {
  id: string;
  game_key: string;
  type: TournamentType;
  title: string;
  prize_pool: number;
  currency: string;
  start_at: number; // ms epoch
  end_at: number; // ms epoch
};

export function getOrCreateActiveTournaments(gameKey: string, nowMs: number = Date.now()) {
  const db = getDb();
  const day = dayWindowUTC(nowMs);
  const month = monthWindowUTC(nowMs);

  const daily = getOrCreateTournament(db, {
    game_key: gameKey,
    type: "daily",
    title: "Ежедневный турнир",
    prize_pool: 150,
    currency: "USD",
    start_at: day.start,
    end_at: day.end,
  });

  const monthly = getOrCreateTournament(db, {
    game_key: gameKey,
    type: "monthly",
    title: "Ежемесячный турнир",
    prize_pool: 3000,
    currency: "USD",
    start_at: month.start,
    end_at: month.end,
  });

  return { daily, monthly };
}

function getOrCreateTournament(db: SqliteDb, t: Omit<Tournament, "id">) {
  const found = db
    .prepare(
      `SELECT * FROM tournaments WHERE game_key=? AND type=? AND start_at=? AND end_at=? LIMIT 1`
    )
    .get(t.game_key, t.type, t.start_at, t.end_at) as Tournament | undefined;

  if (found) return found;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO tournaments (id, game_key, type, title, prize_pool, currency, start_at, end_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, t.game_key, t.type, t.title, t.prize_pool, t.currency, t.start_at, t.end_at, Date.now());

  return { id, ...t };
}

export function recordTournamentResult(opts: {
  tournamentId: string;
  userId: string;
  roundId: string;
  multiplier: number;
  won: boolean;
}) {
  const db = getDb();
  const now = Date.now();
  const existing = db
    .prepare(`SELECT * FROM tournament_entries WHERE tournament_id=? AND user_id=? LIMIT 1`)
    .get(opts.tournamentId, opts.userId) as any | undefined;

  if (!existing) {
    const id = randomUUID();
    const best = opts.won ? Math.max(0, opts.multiplier) : 0;
    db.prepare(
      `INSERT INTO tournament_entries
       (id, tournament_id, user_id, best_multiplier, best_round_id, wins, rounds, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      opts.tournamentId,
      opts.userId,
      best,
      opts.won ? opts.roundId : null,
      opts.won ? 1 : 0,
      1,
      now,
      now
    );
    return;
  }

  const rounds = Number(existing.rounds || 0) + 1;
  const wins = Number(existing.wins || 0) + (opts.won ? 1 : 0);
  let best_multiplier = Number(existing.best_multiplier || 0);
  let best_round_id = existing.best_round_id || null;

  if (opts.won && opts.multiplier > best_multiplier) {
    best_multiplier = opts.multiplier;
    best_round_id = opts.roundId;
  }

  db.prepare(
    `UPDATE tournament_entries SET best_multiplier=?, best_round_id=?, wins=?, rounds=?, updated_at=? WHERE id=?`
  ).run(best_multiplier, best_round_id, wins, rounds, now, existing.id);
}

export function getLeaderboard(tournamentId: string, limit: number = 50) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT te.user_id, te.best_multiplier, te.wins, te.rounds, te.updated_at, u.email
       FROM tournament_entries te
       JOIN users u ON u.id = te.user_id
       WHERE te.tournament_id=?
       ORDER BY te.best_multiplier DESC, te.updated_at ASC
       LIMIT ?`
    )
    .all(tournamentId, limit) as Array<any>;

  return rows.map((r, idx) => ({
    rank: idx + 1,
    userId: r.user_id,
    emailMasked: maskEmail(r.email),
    bestMultiplier: Number(r.best_multiplier || 0),
    wins: Number(r.wins || 0),
    rounds: Number(r.rounds || 0),
    updatedAt: Number(r.updated_at || 0),
  }));
}

export function getMyEntry(tournamentId: string, userId: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM tournament_entries WHERE tournament_id=? AND user_id=? LIMIT 1`)
    .get(tournamentId, userId) as any | undefined;
  if (!row) return null;
  return {
    bestMultiplier: Number(row.best_multiplier || 0),
    wins: Number(row.wins || 0),
    rounds: Number(row.rounds || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

function maskEmail(email: string) {
  const [name, domain] = String(email).split("@");
  if (!domain) return email;
  const head = name.slice(0, 2);
  return head + "***@" + domain;
}

function dayWindowUTC(nowMs: number) {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const start = Date.UTC(y, m, day, 0, 0, 0, 0);
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

function monthWindowUTC(nowMs: number) {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = Date.UTC(y, m, 1, 0, 0, 0, 0);
  const end = Date.UTC(y, m + 1, 1, 0, 0, 0, 0);
  return { start, end };
}
