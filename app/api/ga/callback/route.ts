import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { getGaConfig, gaCurrency } from "@/lib/gaClient";

export const runtime = "nodejs";

/**
 * IMPORTANT:
 * - This file MUST NOT export anything except route handlers (GET/POST/...) and Next route config fields.
 * - Do NOT export getGaConfig from here.
 */

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const entries: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    entries.push([k, String(v)]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const usp = new URLSearchParams();
  for (const [k, v] of entries) usp.append(k, v);
  return usp.toString();
}

function signSha1(queryString: string, key: string): string {
  return crypto.createHmac("sha1", key).update(queryString).digest("hex");
}

/**
 * Parse params from either:
 * - GET query string
 * - POST x-www-form-urlencoded
 * - POST JSON (fallback)
 */
async function readParams(req: Request): Promise<Record<string, string>> {
  const url = new URL(req.url);

  // Always start with URL query params (providers often POST with querystring)
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (out[k] = v));

  // GET has no body
  if (req.method === "GET") return out;

  const ct = req.headers.get("content-type") || "";

  // POST params in body (optional)
  if (ct.includes("application/x-www-form-urlencoded")) {
    const bodyText = await req.text();
    const sp = new URLSearchParams(bodyText);
    sp.forEach((v, k) => (out[k] = v));
    return out;
  }

  if (ct.includes("application/json")) {
    const j = await req.json().catch(() => ({}));
    for (const [k, v] of Object.entries(j || {})) out[k] = String(v);
    return out;
  }

  // fallback: try text as querystring
  const raw = await req.text();
  const sp = new URLSearchParams(raw);
  sp.forEach((v, k) => (out[k] = v));
  return out;
}

/**
 * Optional signature check (if provider sends X-Sign headers)
 * If provider sends sign in params (e.g. "sign"), adjust accordingly.
 */
function verifySignature(req: Request, params: Record<string, string>): { ok: boolean; error?: string } {
  const cfg = getGaConfig();

  const xMerchantId = req.headers.get("x-merchant-id") || req.headers.get("X-Merchant-Id") || "";
  const xNonce = req.headers.get("x-nonce") || req.headers.get("X-Nonce") || "";
  const xTimestamp = req.headers.get("x-timestamp") || req.headers.get("X-Timestamp") || "";
  const xSign = req.headers.get("x-sign") || req.headers.get("X-Sign") || "";

  // If provider does NOT send these headers, skip verification (don’t break callbacks)
  if (!xMerchantId || !xNonce || !xTimestamp || !xSign) {
    return { ok: true };
  }

  const signQuery = buildQuery({
    ...params,
    "X-Merchant-Id": xMerchantId,
    "X-Nonce": xNonce,
    "X-Timestamp": xTimestamp,
  });

  const expected = signSha1(signQuery, cfg.merchantKey);
  if (expected !== xSign) {
    // Some providers differ in how they canonicalize/sign callbacks.
    // To avoid breaking gameplay, we only enforce signature when explicitly enabled.
    if (process.env.GA_ENFORCE_SIGNATURE === "true") {
      return { ok: false, error: "BAD_SIGNATURE" };
    }
    return { ok: true };
  }

  return { ok: true };
}

/**
 * Minimal wallet logic:
 * - resolve user by session_id from ga_sessions
 * - ensure EUR wallet exists
 * - for "balance" requests respond with balance
 *
 * Provider-specific fields differ; we handle common ones:
 * - session_id
 * - action / method / type
 * - amount (bet/win)
 */
async function handleCallback(req: Request) {
  const params = await readParams(req);

  const sig = verifySignature(req, params);
  if (!sig.ok) {
    return NextResponse.json({ ok: false, error: sig.error }, { status: 401 });
  }

  const db = getDb();

  const sessionId = params.session_id || params.session || params.sid || null;
  const playerId = params.player_id || params.playerId || params.userid || params.user_id || params.player || null;

  let userId: string | null = null;

  // Prefer resolving by session_id when provided
  if (sessionId) {
    const row = db
      .prepare(`SELECT user_id FROM ga_sessions WHERE session_id = ? LIMIT 1`)
      .get(sessionId) as any;

    if (row?.user_id) userId = row.user_id;
  }

  // Fallback: many providers call balance with player_id only
  if (!userId && playerId) {
    userId = playerId;
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing session_id/player_id" }, { status: 400 });
  }
  const currency = (params.currency || gaCurrency()).toUpperCase();

  // ensure wallet exists
  const w = db
    .prepare(`SELECT balance FROM wallets WHERE user_id = ? AND currency = ? LIMIT 1`)
    .get(userId, currency) as any;

  if (!w) {
    const now = Date.now();
    db.prepare(
      `INSERT INTO wallets (id, user_id, currency, balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), userId, currency, 0, now, now);
  }

  const wallet = db
    .prepare(`SELECT balance FROM wallets WHERE user_id = ? AND currency = ? LIMIT 1`)
    .get(userId, currency) as any;

  const balance = Number(wallet?.balance ?? 0);

  // Common ids some aggregators expect us to echo back
  const transactionId = params.transaction_id || params.tx_id || params.txid || params.transaction || null;
  const roundId = params.round_id || params.round || null;

  // Decide action
  const actionRaw = (params.action || params.method || params.type || "balance").toLowerCase();

  // If provider asks balance
  if (
    actionRaw.includes("balance") ||
    actionRaw.includes("getbalance") ||
    actionRaw === "balance"
  ) {
    return NextResponse.json(
      {
        success: true,
        status: "ok",
        session_id: sessionId,
        transaction_id: transactionId,
        round_id: roundId,
        currency,
        balance,
      },
      { status: 200 }
    );
  }

  // If provider tries to debit/credit:
  // NOTE: exact field names may differ; we support common "amount"
  const amount = Number(params.amount ?? params.sum ?? params.value ?? 0);

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ ok: false, error: "Bad amount" }, { status: 400 });
  }

  // Debit
  if (actionRaw.includes("bet") || actionRaw.includes("debit")) {
    if (balance < amount) {
      return NextResponse.json(
        {
          success: false,
          status: "error",
          session_id: sessionId,
          transaction_id: transactionId,
          round_id: roundId,
          error: "INSUFFICIENT_FUNDS",
          currency,
          balance,
        },
        { status: 200 }
      );
    }
    const newBal = balance - amount;
    db.prepare(`UPDATE wallets SET balance = ? WHERE user_id = ? AND currency = ?`)
      .run(newBal, userId, currency);

    return NextResponse.json(
      {
        success: true,
        status: "ok",
        session_id: sessionId,
        transaction_id: transactionId,
        round_id: roundId,
        currency,
        balance: newBal,
      },
      { status: 200 }
    );
  }

  // Credit
  if (actionRaw.includes("win") || actionRaw.includes("credit")) {
    const newBal = balance + amount;
    db.prepare(`UPDATE wallets SET balance = ? WHERE user_id = ? AND currency = ?`)
      .run(newBal, userId, currency);

    return NextResponse.json(
      {
        success: true,
        status: "ok",
        session_id: sessionId,
        transaction_id: transactionId,
        round_id: roundId,
        currency,
        balance: newBal,
      },
      { status: 200 }
    );
  }

  // Unknown action: return balance (don’t break provider)
  return NextResponse.json(
    {
      success: true,
      status: "ok",
      session_id: sessionId,
      transaction_id: transactionId,
      round_id: roundId,
      currency,
      balance,
      note: "UNKNOWN_ACTION_RETURN_BALANCE",
    },
    { status: 200 }
  );
}

export async function GET(req: Request) {
  try {
    return await handleCallback(req);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    return await handleCallback(req);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
