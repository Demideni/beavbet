import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, initDb } from "@/lib/db";

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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ga_transaction_id TEXT NOT NULL UNIQUE,
      action TEXT NOT NULL,
      user_id TEXT,
      amount REAL,
      currency TEXT,
      ref_transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'ok',
      created_at INTEGER NOT NULL
    );
  `);
}

function resolveUserId(playerId: string): string | null {
  const db = getDb();
  // Try user id
  const u1 = db.prepare(`SELECT id FROM users WHERE id = ?`).get(playerId) as any;
  if (u1?.id) return u1.id;
  // Try email
  const u2 = db.prepare(`SELECT id FROM users WHERE email = ?`).get(playerId) as any;
  if (u2?.id) return u2.id;
  // Try nickname
  const u3 = db
    .prepare(
      `SELECT users.id as id FROM profiles JOIN users ON users.id = profiles.user_id WHERE profiles.nickname = ?`
    )
    .get(playerId) as any;
  if (u3?.id) return u3.id;
  return null;
}

function getBalance(userId: string): number {
  const db = getDb();
  const row = db.prepare(`SELECT balance FROM wallets WHERE user_id = ?`).get(userId) as any;
  return row?.balance ?? 0;
}

function setBalance(userId: string, delta: number) {
  const db = getDb();
  db.prepare(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`).run(delta, userId);
}

function findTx(gaTxId: string) {
  const db = getDb();
  return db.prepare(`SELECT * FROM ga_transactions WHERE ga_transaction_id = ?`).get(gaTxId) as any;
}

function saveTx(params: {
  ga_transaction_id: string;
  action: string;
  user_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  ref_transaction_id?: string | null;
  status?: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO ga_transactions (ga_transaction_id, action, user_id, amount, currency, ref_transaction_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.ga_transaction_id,
    params.action,
    params.user_id ?? null,
    params.amount ?? null,
    params.currency ?? null,
    params.ref_transaction_id ?? null,
    params.status ?? "ok",
    Date.now()
  );
}

function parseRollbackList(form: FormMap) {
  // Keys like rollback_transactions[0][transaction_id], [type], [amount], [ref_transaction_id]
  const items: Record<string, any> = {};
  for (const [k, v] of Object.entries(form)) {
    const m = k.match(/^rollback_transactions\[(\d+)\]\[(.+)\]$/);
    if (!m) continue;
    const idx = m[1];
    const field = m[2];
    items[idx] = items[idx] || {};
    items[idx][field] = v;
  }
  return Object.keys(items)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => items[k]);
}

function verifySignature(form: FormMap, headers: Headers) {
  const merchantId = process.env.GA_MERCHANT_ID || "";
  const key = process.env.GA_MERCHANT_KEY || "";
  if (!merchantId || !key) {
    // No secrets configured – treat as misconfig.
    return { ok: false, reason: "GA_MERCHANT_ID/GA_MERCHANT_KEY not set" as const };
  }

  const xMerchantId = headers.get("x-merchant-id") || headers.get("X-Merchant-Id") || "";
  const xTimestamp = headers.get("x-timestamp") || headers.get("X-Timestamp") || "";
  const xNonce = headers.get("x-nonce") || headers.get("X-Nonce") || "";
  const xSign = headers.get("x-sign") || headers.get("X-Sign") || "";

  if (!xMerchantId || !xTimestamp || !xNonce || !xSign) {
    return { ok: false, reason: "Missing auth headers" as const };
  }
  if (xMerchantId !== merchantId) {
    return { ok: false, reason: "Merchant ID mismatch" as const };
  }

  const ts = Number(xTimestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "Bad timestamp" as const };
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 30) {
    return { ok: false, reason: "Timestamp expired" as const };
  }

  const merged: Record<string, string> = {
    ...form,
    "X-Merchant-Id": xMerchantId,
    "X-Timestamp": xTimestamp,
    "X-Nonce": xNonce,
  };

  const query = buildQuery(merged);
  const expected = hmacSha1Hex(key, query);

  if (expected.toLowerCase() !== xSign.toLowerCase()) {
    return { ok: false, reason: "Invalid signature" as const };
  }

  return { ok: true as const };
}

export async function GET() {
  return jsonOk({
    ok: true,
    note: "GA callback endpoint. Use POST (application/x-www-form-urlencoded).",
  });
}

export async function POST(req: Request) {
  try {
    initDb();
    ensureGaTables();

    const text = await req.text();
    const params = new URLSearchParams(text);
    const form: FormMap = {};
    params.forEach((v, k) => {
      form[k] = v;
    });

    const action = form["action"];
    if (!action) return error("INTERNAL_ERROR", "Missing action");

    const sig = verifySignature(form, req.headers);
    if (!sig.ok) {
      return error("INTERNAL_ERROR", sig.reason);
    }

    const playerId = form["player_id"] || "";
    const userId = playerId ? resolveUserId(playerId) : null;
    if (!userId) return error("INTERNAL_ERROR", "Player not found");

    const currency = form["currency"] || "USD";
    const gaTxId = form["transaction_id"] || "";
    const amount = form["amount"] ? Number(form["amount"]) : 0;

    // Balance
    if (action === "balance") {
      return jsonOk({ balance: Number(getBalance(userId).toFixed(2)) });
    }

    // Idempotency for bet/win/refund/rollback by GA transaction_id
    if (!gaTxId) return error("INTERNAL_ERROR", "Missing transaction_id");
    const existing = findTx(gaTxId);
    if (existing) {
      // Return current balance, echo tx id
      return jsonOk({
        balance: Number(getBalance(userId).toFixed(2)),
        transaction_id: gaTxId,
      });
    }

    if (action === "bet") {
      const bal = getBalance(userId);
      if (amount <= 0 || !Number.isFinite(amount)) {
        saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount: amount || 0, currency, status: "error" });
        return error("INTERNAL_ERROR", "Bad amount");
      }
      if (bal < amount) {
        saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount, currency, status: "error" });
        return error("INSUFFICIENT_FUNDS", "Not enough money to continue playing");
      }
      setBalance(userId, -amount);
      saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount, currency });
      return jsonOk({
        balance: Number(getBalance(userId).toFixed(2)),
        transaction_id: gaTxId,
      });
    }

    if (action === "win") {
      if (amount <= 0 || !Number.isFinite(amount)) {
        saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount: amount || 0, currency, status: "error" });
        return error("INTERNAL_ERROR", "Bad amount");
      }
      setBalance(userId, amount);
      saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount, currency, ref_transaction_id: form["bet_transaction_id"] || null });
      return jsonOk({
        balance: Number(getBalance(userId).toFixed(2)),
        transaction_id: gaTxId,
      });
    }

    if (action === "refund") {
      const betRef = form["bet_transaction_id"] || "";
      if (!betRef) {
        saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount: amount || 0, currency, status: "error" });
        return error("INTERNAL_ERROR", "Missing bet_transaction_id");
      }

      // If already refunded via another GA tx, be idempotent by betRef? We'll check existing with action='refund' and ref_transaction_id=betRef
      const db = getDb();
      const refunded = db
        .prepare(`SELECT ga_transaction_id FROM ga_transactions WHERE action='refund' AND ref_transaction_id=? LIMIT 1`)
        .get(betRef) as any;

      if (!refunded) {
        // Refund amount back
        if (amount > 0 && Number.isFinite(amount)) {
          setBalance(userId, amount);
        }
      }

      saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount: amount || 0, currency, ref_transaction_id: betRef });
      return jsonOk({
        balance: Number(getBalance(userId).toFixed(2)),
        transaction_id: gaTxId,
      });
    }

    if (action === "rollback") {
      const rollbackList = parseRollbackList(form);
      // Apply reversals for known transactions
      for (const item of rollbackList) {
        const txid = item["transaction_id"];
        if (!txid) continue;
        const prev = findTx(txid);
        if (!prev) {
          // mark as rollbacked without changing balance
          saveTx({ ga_transaction_id: txid, action: "rollbacked", user_id: userId, amount: null, currency });
          continue;
        }
        if (prev.action === "bet") {
          setBalance(userId, Number(prev.amount || 0));
        } else if (prev.action === "win") {
          setBalance(userId, -Number(prev.amount || 0));
        }
        // mark rollback tx itself too
        // (we don't update existing rows; keeping simple)
      }
      saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount: null, currency });
      return jsonOk({
        balance: Number(getBalance(userId).toFixed(2)),
        transaction_id: gaTxId,
        rollback_transactions: rollbackList,
      });
    }

    // Unknown action
    saveTx({ ga_transaction_id: gaTxId, action, user_id: userId, amount: amount || 0, currency, status: "error" });
    return error("INTERNAL_ERROR", "Unknown action");
  } catch (e: any) {
    return error("INTERNAL_ERROR", e?.message || "Unhandled error");
  }
}
