import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export type WalletRow = {
  id: string;
  user_id: string;
  currency: string;
  balance: number; // available
  locked_balance: number; // locked for Arena
};

export function getOrCreateWallet(userId: string, currency: string) {
  const db = getDb();
  const w = db
    .prepare("SELECT id, user_id, currency, balance, locked_balance FROM wallets WHERE user_id = ? AND currency = ?")
    .get(userId, currency) as WalletRow | undefined;

  if (w) return w;
  const now = Date.now();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO wallets (id, user_id, currency, balance, locked_balance, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)"
  ).run(id, userId, currency, now, now);
  return {
    id,
    user_id: userId,
    currency,
    balance: 0,
    locked_balance: 0,
  } satisfies WalletRow;
}

export function addWalletTx(opts: {
  userId: string;
  type: string;
  amount: number;
  currency: string;
  product: "arena" | "casino" | "sportsbook";
  refId?: string;
  meta?: any;
}) {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO wallet_transactions (id, user_id, type, amount, currency, product, ref_id, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    opts.userId,
    opts.type,
    Number(opts.amount.toFixed(2)),
    opts.currency,
    opts.product,
    opts.refId || null,
    opts.meta ? JSON.stringify(opts.meta) : null,
    Date.now()
  );
  return id;
}

export function lockFunds(userId: string, currency: string, amount: number, refId?: string) {
  const db = getDb();
  getOrCreateWallet(userId, currency);

  const row = db
    .prepare("SELECT balance, locked_balance FROM wallets WHERE user_id = ? AND currency = ?")
    .get(userId, currency) as { balance: number; locked_balance: number };
  if ((row?.balance ?? 0) < amount) {
    return { ok: false as const, error: "INSUFFICIENT_FUNDS" };
  }

  const now = Date.now();
  db.prepare(
    "UPDATE wallets SET balance = balance - ?, locked_balance = locked_balance + ?, updated_at = ? WHERE user_id = ? AND currency = ?"
  ).run(amount, amount, now, userId, currency);
  addWalletTx({ userId, type: "lock", amount, currency, product: "arena", refId, meta: { reason: "arena_entry" } });
  return { ok: true as const };
}

/**
 * When tournament starts, we "consume" locked entry fees (money leaves user's wallet).
 */
export function consumeLocked(userId: string, currency: string, amount: number, refId?: string) {
  const db = getDb();
  const now = Date.now();
  db.prepare("UPDATE wallets SET locked_balance = locked_balance - ?, updated_at = ? WHERE user_id = ? AND currency = ?")
    .run(amount, now, userId, currency);
  addWalletTx({ userId, type: "unlock", amount: -amount, currency, product: "arena", refId, meta: { reason: "arena_consumed" } });
}

export function creditPrize(userId: string, currency: string, amount: number, refId?: string, meta?: any) {
  const db = getDb();
  getOrCreateWallet(userId, currency);
  const now = Date.now();
  db.prepare("UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ? AND currency = ?").run(
    amount,
    now,
    userId,
    currency
  );
  addWalletTx({ userId, type: "prize", amount, currency, product: "arena", refId, meta });
}
