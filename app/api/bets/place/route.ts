import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { initDb, uuid } from "@/lib/db";

type PlaceBetBody = {
  currency?: string;
  stake: number;
  selection: {
    sportKey: string;
    leagueTitle?: string;
    eventId?: string;
    commenceTime?: string;
    homeTeam?: string;
    awayTeam?: string;
    marketKey: string; // e.g. h2h
    outcomeName: string; // e.g. Home/Away/Draw
    odds: number;
    bookKey?: string;
    bookTitle?: string;
  };
};

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PlaceBetBody;
  try {
    body = (await req.json()) as PlaceBetBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currency = (body.currency || "EUR").toUpperCase();
  const stake = Number(body.stake);
  const odds = Number(body.selection?.odds);

  if (!Number.isFinite(stake) || stake <= 0) {
    return NextResponse.json({ error: "Invalid stake" }, { status: 400 });
  }
  if (!Number.isFinite(odds) || odds <= 1) {
    return NextResponse.json({ error: "Invalid odds" }, { status: 400 });
  }
  if (!body.selection?.sportKey || !body.selection?.marketKey || !body.selection?.outcomeName) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }

  const db = initDb();

  // Ensure wallet exists
  const nowEnsure = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO wallets (id, user_id, currency, balance, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`
  ).run(uuid(), user.id, currency, nowEnsure, nowEnsure);

  const w = db
    .prepare("SELECT balance FROM wallets WHERE user_id = ? AND currency = ?")
    .get(user.id, currency) as { balance: number } | undefined;

  const balance = w?.balance ?? 0;
  if (balance < stake) {
    return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
  }

  const betId = uuid();
  const now = Date.now();
  const potential = Number((stake * odds).toFixed(2));

  const tx = db.transaction(() => {
    db.prepare("UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ? AND currency = ?")
      .run(stake, now, user.id, currency);

    db.prepare(
      `INSERT INTO bets (
        id, user_id, currency, sport_key, league_title, event_id, commence_time,
        home_team, away_team, market_key, outcome_name, odds, stake, potential_payout,
        status, created_at, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
    ).run(
      betId,
      user.id,
      currency,
      body.selection.sportKey,
      body.selection.leagueTitle ?? null,
      body.selection.eventId ?? null,
      body.selection.commenceTime ?? null,
      body.selection.homeTeam ?? null,
      body.selection.awayTeam ?? null,
      body.selection.marketKey,
      body.selection.outcomeName,
      odds,
      stake,
      potential,
      now,
      JSON.stringify({
        bookKey: body.selection.bookKey,
        bookTitle: body.selection.bookTitle,
      })
    );

    db.prepare(
      "INSERT INTO transactions (id, user_id, type, amount, currency, status, created_at, meta) VALUES (?, ?, 'bet', ?, ?, 'done', ?, ?)"
    ).run(uuid(), user.id, stake, currency, now, JSON.stringify({ betId }));
  });

  try {
    tx();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to place bet" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, betId, newBalance: Number((balance - stake).toFixed(2)) });
}
