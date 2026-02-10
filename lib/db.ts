import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Simple local SQLite storage for demo/dev.
// For production you can swap this with Postgres/Supabase, keeping the same API.

const DATA_DIR = (process.env.RENDER_DISK_PATH || process.env.BEAVBET_DATA_DIR || path.join(process.cwd(), "data"));
const DB_PATH = path.join(DATA_DIR, "beavbet.db");

function hasColumn(db: any, table: string, column: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function ensureColumn(db: any, table: string, column: string, ddl: string) {
  if (hasColumn(db, table, column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl};`);
}

function ensureSchema(db: any) {
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
      currency TEXT DEFAULT 'EUR',
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

  // Wallets: older code paths expect updated_at; keep it optional for backwards compatibility
  ensureColumn(db, 'wallets', 'updated_at', "updated_at INTEGER");

  // Transactions: Passimpay / providers support
  ensureColumn(db, 'transactions', 'provider', "provider TEXT");
  ensureColumn(db, 'transactions', 'provider_ref', "provider_ref TEXT");
  ensureColumn(db, 'transactions', 'order_id', "order_id TEXT");
  ensureColumn(db, 'transactions', 'updated_at', "updated_at INTEGER");

  // Wallets: some routes and providers expect updated_at
  ensureColumn(db, 'wallets', 'updated_at', "updated_at INTEGER");
}

declare global {
  // eslint-disable-next-line no-var
  var __beavbet_db__: any | undefined;
}

export function getDb() {
  if (global.__beavbet_db__) return global.__beavbet_db__;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  ensureSchema(db);
  global.__beavbet_db__ = db;
  
  // Game aggregator sessions (session_id -> user_id mapping for callbacks)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ga_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

return db;
}

// Backwards-compatible exports used by some routes
export const initDb = getDb;
export function uuid() {
  return randomUUID();
}
