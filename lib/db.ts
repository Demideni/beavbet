import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// better-sqlite3 exports a default Database class. Its instance type is what we use everywhere.
export type SqliteDb = InstanceType<typeof Database>;

// Simple local SQLite storage for demo/dev.
// For production you can swap this with Postgres/Supabase, keeping the same API.

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "beavbet.db");

function hasColumn(db: SqliteDb, table: string, column: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function ensureColumn(db: SqliteDb, table: string, column: string, ddl: string) {
  if (hasColumn(db, table, column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl};`);
}

function ensureSchema(db: SqliteDb) {
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      nickname TEXT,
      currency TEXT DEFAULT 'USD',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, currency)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- deposit | withdraw | bonus | bet | win
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'done', -- pending | done | failed
      created_at INTEGER NOT NULL,
      meta TEXT
    );

    -- Affiliate
    CREATE TABLE IF NOT EXISTS affiliate_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' -- active | disabled
    );

    CREATE TABLE IF NOT EXISTS affiliate_clicks (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      ip_hash TEXT,
      ua_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      affiliate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      UNIQUE(referred_user_id)
    );

    CREATE TABLE IF NOT EXISTS affiliate_commissions (
      id TEXT PRIMARY KEY,
      affiliate_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      basis_type TEXT NOT NULL, -- deposit | manual
      basis_amount REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | paid
      created_at INTEGER NOT NULL,
      meta TEXT
    );

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      method TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | paid | rejected
      admin_note TEXT,
      txid TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      meta TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL,
      sport_key TEXT NOT NULL,
      league_title TEXT,
      event_id TEXT,
      commence_time TEXT,
      home_team TEXT,
      away_team TEXT,
      market_key TEXT NOT NULL,
      outcome_name TEXT NOT NULL,
      odds REAL NOT NULL,
      stake REAL NOT NULL,
      potential_payout REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', -- open | settled | void
      created_at INTEGER NOT NULL,
      meta TEXT
    );


    -- Robinson game rounds
    CREATE TABLE IF NOT EXISTS game_rounds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_key TEXT NOT NULL,
      bet REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', -- open | settled
      result TEXT, -- won | lost
      multiplier REAL,
      created_at INTEGER NOT NULL,
      settled_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_rounds_user_created ON game_rounds(user_id, created_at DESC);

    -- Tournaments
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      game_key TEXT NOT NULL,
      type TEXT NOT NULL, -- daily | monthly
      title TEXT NOT NULL,
      prize_pool REAL NOT NULL,
      currency TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tournaments_game_time ON tournaments(game_key, start_at DESC, end_at DESC);

    CREATE TABLE IF NOT EXISTS tournament_entries (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      best_multiplier REAL NOT NULL DEFAULT 0,
      best_round_id TEXT,
      wins INTEGER NOT NULL DEFAULT 0,
      rounds INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(tournament_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_tournament_best ON tournament_entries(tournament_id, best_multiplier DESC, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_tx_user_created ON transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bets_user_created ON bets(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_aff_click_code_created ON affiliate_clicks(code, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ref_affiliate_created ON referrals(affiliate_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comm_affiliate_created ON affiliate_commissions(affiliate_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_withdraw_user_created ON withdrawal_requests(user_id, created_at DESC);
  `);

  // Lightweight migrations for older DBs
  ensureColumn(db, 'users', 'role', "role TEXT NOT NULL DEFAULT 'user'");
}

declare global {
  // eslint-disable-next-line no-var
  var __beavbet_db__: SqliteDb | undefined;
}

export function getDb() {
  if (global.__beavbet_db__) return global.__beavbet_db__;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  ensureSchema(db);
  global.__beavbet_db__ = db;
  return db;
}

// Backwards-compatible aliases used across route handlers.
// Some parts of the codebase import `initDb` and `uuid` from here.
export const initDb = getDb;

export function uuid(): string {
  // Node 18+ supports crypto.randomUUID(). Keep a small fallback for safety.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require("node:crypto") as typeof import("node:crypto");
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
