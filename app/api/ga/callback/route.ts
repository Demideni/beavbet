import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { gaCurrency, getGaConfig } from "@/lib/gaClient";

export const runtime = "nodejs";

type FormMap = Record<string, string>;

function encodeRFC1738(str: string) {
  // PHP http_build_query default: spaces as +
  return encodeURIComponent(str).replace(/%20/g, "+");
}

function buildQuery(params: Record<string, string>) {
  return Object.keys(params)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${encodeRFC1738(k)}=${encodeRFC1738(params[k] ?? "")}`)
    .join("&");
}

function hmacSha1Hex(secret: string, data: string) {
  return crypto.createHmac("sha1", secret).update(data).digest("hex");
}

function jsonOk(payload: any) {
  return NextResponse.json(payload, { status: 200 });
}

function error(code: string, description: string) {
  return jsonOk({ error_code: code, error_description: description });
}

function ensureGaTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ga_transactions (
      ga_tx_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

function resolveUserId(playerId?: string | null): number | null {
  if (!playerId) return null;
  const db = getDb();
  const u1 = db.prepare(`SELECT id FROM users WHERE id = ?`).get(playerId) as any;
  if (u1?.id) return u1.id;
  const u2 = db.prepare(`SELECT id FROM users WHERE email = ?`).get(playerId) as any;
  if (u2?.id) return u2.id;
  const u3 = db.prepare(`SELECT id FROM users WHERE username = ?`).get(playerId) as any;
  if (u3?.id) return u3.id;
  return null;
}

function resolveUserIdBySession(sessionId?: string | null): number | null {
  if (!sessionId) return null;
  const db = getDb();
  const row = db.prepare(`SELECT user_id FROM ga_sessions WHERE session_id = ?`).get(sessionId) as any;
  return row?.user_id ?? null;
}

function ensureWallet(userId: number, currency: string) {
  const db = getDb();
  const w = db.prepare(`SELECT id, balance FROM wallets WHERE user_id = ? AND currency = ?`).get(userId, currency) as any;
  if (w?.id) return;

  // If user already has a wallet (e.g. USD), mirror its balance for test convenience
  const anyW = db.prepare(`SELECT balance FROM wallets WHERE user_id = ? ORDER BY id ASC LIMIT 1`).get(userId) as any;
  const seed = typeof anyW?.balance === "number" ? anyW.balance : 0;

  db.prepare(`INSERT INTO wallets (user_id, currency, balance, created_at) VALUES (?, ?, ?, ?)`).run(
    userId,
    currency,
    seed,
    Date.now(),
  );
}

function getBalance(userId: number, currency: string): number {
  const db = getDb();
  ensureWallet(userId, currency);
  const row = db.prepare(`SELECT balance FROM wallets WHERE user_id = ? AND currency = ?`).get(userId, currency) as any;
  return row?.balance ?? 0;
}

function addBalance(userId: number, currency: string, delta: number) {
  const db = getDb();
  ensureWallet(userId, currency);
  db.prepare(`UPDATE wallets SET balance = balance + ? WHERE user_id = ? AND currency = ?`).run(delta, userId, currency);
}

function findTx(gaTxId: string) {
  const db = getDb();
  return db.prepare(`SELECT ga_tx_id, type, amount FROM ga_transactions WHERE ga_tx_id = ?`).get(gaTxId) as any;
}

function saveTx(gaTxId: string, type: string, userId: number, amount: number) {
  const db = getDb();
  db.prepare(
    `INSERT INTO ga_transactions (ga_tx_id, type, user_id, amount, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(gaTxId, type, userId, amount, Date.now());
}

async function parseForm(req: Request): Promise<FormMap> {
  const txt = await req.text();
  const params = new URLSearchParams(txt);
  const out: FormMap = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function verifySignature(form: FormMap, headers: Headers): { ok: true } | { ok: false; error: any } {
  let cfg: any;
  try {
    cfg = getGaConfig();
  } catch (e: any) {
    return { ok: false, error: error("CONFIG", e?.message ?? "GA config missing") };
  }

  const xMerchantId = headers.get("x-merchant-id") || headers.get("X-Merchant-Id") || "";
  const xNonce = headers.get("x-nonce") || headers.get("X-Nonce") || "";
  const xTimestamp = headers.get("x-timestamp") || headers.get("X-Timestamp") || "";
  const xSign = (headers.get("x-sign") || headers.get("X-Sign") || "").toLowerCase();

  if (!xMerchantId || !xNonce || !xTimestamp || !xSign) {
    return { ok: false, error: error("SIGN", "Missing signature headers") };
  }

  // signed string = form params + header values as params
  const signed: Record<string, string> = {
    ...form,
    "X-Merchant-Id": xMerchantId,
    "X-Nonce": xNonce,
    "X-Timestamp": xTimestamp,
  };

  const query = buildQuery(signed);
  const expected = hmacSha1Hex(cfg.merchantKey, query).toLowerCase();

  if (expected !== xSign) {
    return { ok: false, error: error("SIGN", "Invalid signature") };
  }

  return { ok: true };
}

async function handle(form: FormMap, headers: Headers) {
  ensureGaTables();

  const sig = verifySignature(form, headers);
  if (!sig.ok) return sig.error;

  const action = (form.action || "").toLowerCase();
  const gaTxId = form.tx_id || form.transaction_id || form.round_id || form.id || "";
  const sessionId = form.session_id || form.session || "";
  const playerId = form.user_id || form.player_id || "";

  const currency = (form.currency || gaCurrency() || "EUR").toUpperCase();

  const userId = resolveUserIdBySession(sessionId) ?? resolveUserId(playerId);
  if (!userId) return error("USER", "User not found");

  if (action === "balance") {
    const bal = getBalance(userId, currency);
    return jsonOk({ balance: bal });
  }

  if (!gaTxId) return error("TX", "Missing tx_id");

  const amount = Number(form.amount ?? "0");
  if (!Number.isFinite(amount)) return error("AMOUNT", "Invalid amount");

  // idempotency
  const exists = findTx(gaTxId);
  if (exists) {
    return jsonOk({ balance: getBalance(userId, currency), tx_id: gaTxId });
  }

  // bet decreases balance, win increases, refund increases, rollback cancels previous bet
  if (action === "bet") {
    const bal = getBalance(userId, currency);
    if (bal < amount) return error("NO_FUNDS", "Insufficient funds");
    addBalance(userId, currency, -amount);
    saveTx(gaTxId, "bet", userId, amount);
    return jsonOk({ balance: getBalance(userId, currency), tx_id: gaTxId });
  }

  if (action === "win") {
    addBalance(userId, currency, amount);
    saveTx(gaTxId, "win", userId, amount);
    return jsonOk({ balance: getBalance(userId, currency), tx_id: gaTxId });
  }

  if (action === "refund") {
    addBalance(userId, currency, amount);
    saveTx(gaTxId, "refund", userId, amount);
    return jsonOk({ balance: getBalance(userId, currency), tx_id: gaTxId });
  }

  if (action === "rollback") {
    const ref = form.reference_tx_id || form.ref_tx_id || form.original_tx_id || "";
    if (!ref) return error("TX", "Missing reference_tx_id");
    const refTx = findTx(ref);
    if (!refTx) return error("TX", "reference_tx_id not found");
    // Only rollback bets
    if (refTx.type === "bet") {
      addBalance(userId, currency, Number(refTx.amount));
    }
    saveTx(gaTxId, "rollback", userId, amount);
    return jsonOk({ balance: getBalance(userId, currency), tx_id: gaTxId });
  }

  return error("ACTION", `Unknown action: ${action}`);
}

export async function POST(req: Request) {
  const form = await parseForm(req);
  return handle(form, req.headers);
}

// Provider sometimes validates callback URL with GET
export async function GET(req: Request) {
  const url = new URL(req.url);
  const form: FormMap = {};
  url.searchParams.forEach((v, k) => (form[k] = v));
  return handle(form, req.headers);
}
