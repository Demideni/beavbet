import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, uuid } from "@/lib/db";

/**
 * Game Aggregator callback endpoint.
 * Receives application/x-www-form-urlencoded POSTs with action:
 * balance | bet | win | refund | rollback
 *
 * Security: X-Sign header (HMAC-SHA1) over merged (form params + auth headers) sorted by key.
 */
function jsonOk(body: any) {
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonErr(code: string, description = "") {
  return jsonOk({ error_code: code, error_description: description });
}

function getHeader(req: Request, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase()) ?? "";
}

// Convert FormData entries to a flat object of string -> string
function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    // If duplicates exist, keep last (GA usually sends unique keys)
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

function buildQueryString(params: Record<string, string>) {
  const keys = Object.keys(params).sort((a, b) => a.localeCompare(b));
  const usp = new URLSearchParams();
  for (const k of keys) usp.append(k, params[k]);
  // URLSearchParams uses application/x-www-form-urlencoded semantics (spaces -> +), similar to PHP http_build_query
  return usp.toString();
}

function timingSafeEqualHex(a: string, b: string) {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function verifySignature(req: Request, bodyParams: Record<string, string>) {
  const merchantId = getHeader(req, "X-Merchant-Id");
  const timestamp = getHeader(req, "X-Timestamp");
  const nonce = getHeader(req, "X-Nonce");
  const xSign = getHeader(req, "X-Sign");

  const expectedMerchantId = process.env.GA_MERCHANT_ID || process.env.GAME_AGGREGATOR_MERCHANT_ID || "";
  const merchantKey = process.env.GA_MERCHANT_KEY || process.env.GAME_AGGREGATOR_MERCHANT_KEY || "";

  if (!expectedMerchantId || !merchantKey) {
    return { ok: false, err: "Missing GA_MERCHANT_ID / GA_MERCHANT_KEY env" };
  }

  if (!merchantId || merchantId !== expectedMerchantId) {
    return { ok: false, err: "Invalid merchant id" };
  }

  // timestamp freshness (doc: 30 seconds)
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || tsNum <= 0) {
    return { ok: false, err: "Invalid timestamp" };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > 30) {
    return { ok: false, err: "Request expired" };
  }

  if (!nonce || !xSign) {
    return { ok: false, err: "Missing signature headers" };
  }

  const merged: Record<string, string> = {
    ...bodyParams,
    "X-Merchant-Id": merchantId,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
  };
  const qs = buildQueryString(merged);
  const expected = crypto.createHmac("sha1", merchantKey).update(qs).digest("hex");

  if (!timingSafeEqualHex(xSign, expected)) {
    return { ok: false, err: "Invalid sign" };
  }
  return { ok: true as const };
}

function ensureWallet(userId: string, currency: string) {
  const db = getDb();
  const now = Date.now();
  const existing = db
    .prepare("SELECT id, balance FROM wallets WHERE user_id = ? AND currency = ?")
    .get(userId, currency) as { id: string; balance: number } | undefined;

  if (existing) return existing;

  const id = uuid();
  db.prepare(
    "INSERT INTO wallets (id, user_id, currency, balance, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId, currency, 0, now);
  return { id, balance: 0 };
}

function getBalance(userId: string, currency: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT balance FROM wallets WHERE user_id = ? AND currency = ?")
    .get(userId, currency) as { balance: number } | undefined;
  return row?.balance ?? 0;
}

function setBalance(userId: string, currency: string, balance: number) {
  const db = getDb();
  db.prepare("UPDATE wallets SET balance = ? WHERE user_id = ? AND currency = ?").run(balance, userId, currency);
}

function insertTx(args: {
  userId: string;
  type: string;
  amount: number;
  currency: string;
  provider: string;
  providerRef?: string;
  orderId?: string;
  meta?: any;
}) {
  const db = getDb();
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO transactions
     (id, user_id, type, amount, currency, status, created_at, meta, provider, provider_ref, order_id, updated_at)
     VALUES (?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    args.userId,
    args.type,
    args.amount,
    args.currency,
    now,
    args.meta ? JSON.stringify(args.meta) : null,
    args.provider,
    args.providerRef ?? null,
    args.orderId ?? null,
    now
  );
  return id;
}

function findTxByProviderRef(provider: string, providerRef: string) {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, user_id, type, amount, currency, meta, order_id FROM transactions WHERE provider = ? AND provider_ref = ? LIMIT 1"
    )
    .get(provider, providerRef) as
    | { id: string; user_id: string; type: string; amount: number; currency: string; meta: string | null; order_id: string | null }
    | undefined;
}

function findRefundByBetProviderRef(provider: string, betProviderRef: string) {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, user_id, amount, currency FROM transactions WHERE provider = ? AND type = 'refund' AND order_id = ? LIMIT 1"
    )
    .get(provider, betProviderRef) as
    | { id: string; user_id: string; amount: number; currency: string }
    | undefined;
}

function findRollbackItem(provider: string, mainRollbackProviderRef: string, extTxId: string) {
  const db = getDb();
  return db
    .prepare(
      "SELECT id FROM transactions WHERE provider = ? AND type = 'rollback_item' AND provider_ref = ? AND order_id = ? LIMIT 1"
    )
    .get(provider, mainRollbackProviderRef, extTxId) as { id: string } | undefined;
}

export async function POST(req: Request) {
  // Parse form body
  let params: Record<string, string> = {};
  try {
    const fd = await req.formData();
    params = formDataToObject(fd);
  } catch {
    return jsonErr("INTERNAL_ERROR", "Invalid form body");
  }

  // Verify signature
  const sig = verifySignature(req, params);
  if (!sig.ok) {
    return jsonErr("INTERNAL_ERROR", sig.err);
  }

  const action = (params.action || "").toLowerCase();
  const playerId = params.player_id || "";
  const currency = (params.currency || "USD").toUpperCase();

  if (!action) return jsonErr("INTERNAL_ERROR", "Missing action");
  if (!playerId) return jsonErr("INTERNAL_ERROR", "Missing player_id");

  // Ensure wallet exists
  ensureWallet(playerId, currency);

  try {
    if (action === "balance") {
      const balance = getBalance(playerId, currency);
      return jsonOk({ balance });
    }

    if (action === "bet") {
      const gaTxId = params.transaction_id || "";
      const amount = Number(params.amount);
      if (!gaTxId) return jsonErr("INTERNAL_ERROR", "Missing transaction_id");
      if (!Number.isFinite(amount) || amount <= 0) return jsonErr("INTERNAL_ERROR", "Invalid amount");

      const existing = findTxByProviderRef("ga", gaTxId);
      if (existing) {
        const balance = getBalance(playerId, currency);
        return jsonOk({ balance, transaction_id: existing.id });
      }

      const balanceBefore = getBalance(playerId, currency);
      if (balanceBefore < amount) {
        return jsonErr("INSUFFICIENT_FUNDS", "Not enough money to continue playing");
      }

      const balanceAfter = Number((balanceBefore - amount).toFixed(6));
      setBalance(playerId, currency, balanceAfter);

      const id = insertTx({
        userId: playerId,
        type: "bet",
        amount,
        currency,
        provider: "ga",
        providerRef: gaTxId,
        meta: {
          action,
          game_uuid: params.game_uuid,
          session_id: params.session_id,
          round_id: params.round_id,
          type: params.type,
        },
      });

      return jsonOk({ balance: balanceAfter, transaction_id: id });
    }

    if (action === "win") {
      const gaTxId = params.transaction_id || "";
      const amount = Number(params.amount);
      if (!gaTxId) return jsonErr("INTERNAL_ERROR", "Missing transaction_id");
      if (!Number.isFinite(amount) || amount < 0) return jsonErr("INTERNAL_ERROR", "Invalid amount");

      const existing = findTxByProviderRef("ga", gaTxId);
      if (existing) {
        const balance = getBalance(playerId, currency);
        return jsonOk({ balance, transaction_id: existing.id });
      }

      const balanceBefore = getBalance(playerId, currency);
      const balanceAfter = Number((balanceBefore + amount).toFixed(6));
      setBalance(playerId, currency, balanceAfter);

      const id = insertTx({
        userId: playerId,
        type: "win",
        amount,
        currency,
        provider: "ga",
        providerRef: gaTxId,
        meta: {
          action,
          game_uuid: params.game_uuid,
          session_id: params.session_id,
          round_id: params.round_id,
          type: params.type,
          finished: params.finished,
        },
      });

      return jsonOk({ balance: balanceAfter, transaction_id: id });
    }

    if (action === "refund") {
      const gaTxId = params.transaction_id || "";
      const betGaTxId = params.bet_transaction_id || "";
      const amount = Number(params.amount);
      if (!gaTxId) return jsonErr("INTERNAL_ERROR", "Missing transaction_id");
      if (!betGaTxId) return jsonErr("INTERNAL_ERROR", "Missing bet_transaction_id");
      if (!Number.isFinite(amount) || amount <= 0) return jsonErr("INTERNAL_ERROR", "Invalid amount");

      // Idempotent on refund transaction_id (GA side)
      const existing = findTxByProviderRef("ga", gaTxId);
      if (existing) {
        const balance = getBalance(playerId, currency);
        return jsonOk({ balance, transaction_id: existing.id });
      }

      // Ensure bet_transaction_id refunded only once
      const prevRefund = findRefundByBetProviderRef("ga", betGaTxId);
      if (prevRefund) {
        const balance = getBalance(playerId, currency);
        return jsonOk({ balance, transaction_id: prevRefund.id });
      }

      const balanceBefore = getBalance(playerId, currency);
      const balanceAfter = Number((balanceBefore + amount).toFixed(6));
      setBalance(playerId, currency, balanceAfter);

      const id = insertTx({
        userId: playerId,
        type: "refund",
        amount,
        currency,
        provider: "ga",
        providerRef: gaTxId,
        orderId: betGaTxId,
        meta: {
          action,
          game_uuid: params.game_uuid,
          session_id: params.session_id,
          round_id: params.round_id,
          finished: params.finished,
        },
      });

      return jsonOk({ balance: balanceAfter, transaction_id: id });
    }

    if (action === "rollback") {
      const gaTxId = params.transaction_id || "";
      if (!gaTxId) return jsonErr("INTERNAL_ERROR", "Missing transaction_id");

      // Idempotent on main rollback transaction_id (GA side)
      const existing = findTxByProviderRef("ga", gaTxId);
      if (existing) {
        const balance = getBalance(playerId, currency);
        // Need to return rollback_transactions array from request (best-effort)
        const list = Object.keys(params)
          .filter((k) => k.startsWith("rollback_transactions[") && k.endsWith("][transaction_id]"))
          .map((k) => params[k])
          .filter(Boolean);
        return jsonOk({ balance, transaction_id: existing.id, rollback_transactions: Array.from(new Set(list)) });
      }

      // Parse rollback_transactions from flattened form keys
      // Expected keys like rollback_transactions[0][action], rollback_transactions[0][amount], rollback_transactions[0][transaction_id]
      const idxSet = new Set<number>();
      for (const k of Object.keys(params)) {
        const m = /^rollback_transactions\[(\d+)\]\[/.exec(k);
        if (m) idxSet.add(Number(m[1]));
      }
      const indices = Array.from(idxSet).sort((a, b) => a - b);

      const rollbackItems = indices
        .map((i) => ({
          action: params[`rollback_transactions[${i}][action]`] || "",
          amount: Number(params[`rollback_transactions[${i}][amount]`] || "0"),
          txId: params[`rollback_transactions[${i}][transaction_id]`] || "",
        }))
        .filter((it) => it.txId);

      // Create main rollback tx (integrator id returned)
      const mainId = insertTx({
        userId: playerId,
        type: "rollback",
        amount: 0,
        currency,
        provider: "ga",
        providerRef: gaTxId,
        meta: {
          action,
          provider_round_id: params.provider_round_id,
          round_id: params.round_id,
          session_id: params.session_id,
          rollback_count: rollbackItems.length,
        },
      });

      // Process each item once (tracked via rollback_item rows keyed by provider_ref = main GA rollback tx id, order_id = ext tx id)
      let balance = getBalance(playerId, currency);

      for (const it of rollbackItems) {
        if (findRollbackItem("ga", gaTxId, it.txId)) continue;

        // reverse corresponding original tx if exists
        const original = findTxByProviderRef("ga", it.txId);
        if (original) {
          // If original was a bet => refund amount; if win/refund => remove amount
          const amt = Number(it.amount) || Number(original.amount) || 0;
          if (it.action === "bet") balance = Number((balance + amt).toFixed(6));
          else if (it.action === "win") balance = Number((balance - amt).toFixed(6));
          else if (it.action === "refund") balance = Number((balance - amt).toFixed(6));
          // Note: we do not enforce non-negative on rollback (provider expects to sync)
          setBalance(playerId, currency, balance);
        }

        // record rollback_item
        insertTx({
          userId: playerId,
          type: "rollback_item",
          amount: Number(it.amount) || 0,
          currency,
          provider: "ga",
          providerRef: gaTxId,
          orderId: it.txId,
          meta: { item_action: it.action },
        });
      }

      const rollbackTxIds = rollbackItems.map((x) => x.txId);
      return jsonOk({ balance, transaction_id: mainId, rollback_transactions: rollbackTxIds });
    }

    return jsonErr("INTERNAL_ERROR", "Unknown action");
  } catch (e: any) {
    return jsonErr("INTERNAL_ERROR", e?.message || "Unhandled error");
  }
}
