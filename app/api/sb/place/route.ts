import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { americanToDecimal } from "@/lib/oddsApi";

type PlaceLeg = {
  eventId: string;
  sportKey: string;
  commenceTime: string; // ISO
  homeTeam: string;
  awayTeam: string;
  marketKey: "h2h" | "totals" | string;
  selection: string;
  oddsAmerican: number;
  line?: number;
};

type PlaceBody = {
  type: "SINGLE" | "PARLAY";
  stakeCents: number;
  currency?: string;
  isLive?: boolean;
  legs: PlaceLeg[];
};

function clampInt(n: any, def = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return def;
  return Math.trunc(x);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as PlaceBody | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const stakeCents = clampInt(body.stakeCents, 0);
  const type = body.type;
  const legs = Array.isArray(body.legs) ? body.legs : [];
  const currency = (body.currency || "USDT").toUpperCase();
  const isLive = !!body.isLive;

  if (stakeCents < 100) {
    return NextResponse.json({ error: "Min stake is 1.00" }, { status: 400 });
  }
  if (stakeCents > 500_00) {
    return NextResponse.json({ error: "Max stake is 500.00" }, { status: 400 });
  }
  if (type !== "SINGLE" && type !== "PARLAY") {
    return NextResponse.json({ error: "Invalid slip type" }, { status: 400 });
  }
  if (type === "SINGLE" && legs.length !== 1) {
    return NextResponse.json({ error: "SINGLE requires exactly 1 leg" }, { status: 400 });
  }
  if (type === "PARLAY" && (legs.length < 2 || legs.length > 10)) {
    return NextResponse.json({ error: "PARLAY requires 2-10 legs" }, { status: 400 });
  }

  // validate legs
  for (const l of legs) {
    if (!l?.eventId || !l?.sportKey || !l?.commenceTime) {
      return NextResponse.json({ error: "Invalid leg" }, { status: 400 });
    }
    if (typeof l.oddsAmerican !== "number" || !Number.isFinite(l.oddsAmerican)) {
      return NextResponse.json({ error: "Invalid odds" }, { status: 400 });
    }
  }

  // compute potential payout (approx, we use fixed snapshot odds)
  let combinedDecimal = 1;
  for (const l of legs) {
    combinedDecimal *= americanToDecimal(l.oddsAmerican);
  }
  const potentialPayoutCents = Math.max(stakeCents, Math.floor(stakeCents * combinedDecimal));

  // place atomically: check balance, deduct, create slip + legs + tx
  const result = await db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: user.id } });
    if (!u) throw new Error("User not found");
    if (u.balanceCents < stakeCents) {
      throw new Error("Insufficient balance");
    }

    const slip = await tx.betSlip.create({
      data: {
        userId: user.id,
        type,
        currency,
        stakeCents,
        potentialPayoutCents,
        isLive,
        meta: {
          placedFrom: "web",
        },
        legs: {
          create: legs.map((l) => ({
            eventId: l.eventId,
            sportKey: l.sportKey,
            commenceTime: new Date(l.commenceTime),
            homeTeam: l.homeTeam,
            awayTeam: l.awayTeam,
            marketKey: l.marketKey,
            selection: l.selection,
            oddsAmerican: Math.trunc(l.oddsAmerican),
            line: l.line,
          })),
        },
      },
      include: { legs: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { balanceCents: { decrement: stakeCents } },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "BET",
        amountCents: -stakeCents,
        meta: {
          slipId: slip.id,
          slipType: type,
          legs: legs.map((l) => ({
            eventId: l.eventId,
            sportKey: l.sportKey,
            marketKey: l.marketKey,
            selection: l.selection,
            oddsAmerican: l.oddsAmerican,
            line: l.line,
          })),
        },
      },
    });

    return slip;
  });

  return NextResponse.json({ ok: true, slip: result });
}
