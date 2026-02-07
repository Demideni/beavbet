import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/lib/db";
import { americanToDecimal, oddsGet } from "@/lib/oddsApi";

type ScoreEvent = {
  id: string;
  completed: boolean;
  commence_time: string;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
};

function parseScore(scores: ScoreEvent["scores"], team: string) {
  const s = scores?.find((x) => x.name === team)?.score;
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  const u = await getUserFromRequest(req);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(u.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // load pending legs that should be settled (commence_time already passed)
  const pendingLegs = await db.betLeg.findMany({
    where: {
      status: "PENDING",
      commenceTime: { lt: new Date(Date.now() - 60_000) }, // 1m after start
      slip: { status: "PENDING" },
    },
    include: { slip: true },
    take: 500,
  });

  if (pendingLegs.length === 0) {
    return NextResponse.json({ ok: true, message: "Nothing to settle" });
  }

  // group by sportKey to reduce API calls
  const bySport = new Map<string, typeof pendingLegs>();
  for (const l of pendingLegs) {
    const arr = bySport.get(l.sportKey) || [];
    arr.push(l);
    bySport.set(l.sportKey, arr);
  }

  const scoreMap = new Map<string, ScoreEvent>();
  for (const [sportKey] of bySport) {
    const { data } = await oddsGet<ScoreEvent[]>(`/sports/${sportKey}/scores`, {
      daysFrom: 3,
      dateFormat: "iso",
    });
    for (const ev of data) scoreMap.set(ev.id, ev);
  }

  const updatedSlipIds = new Set<string>();

  await db.$transaction(async (tx) => {
    for (const leg of pendingLegs) {
      const ev = scoreMap.get(leg.eventId);
      if (!ev || !ev.completed) continue;

      const hs = parseScore(ev.scores, leg.homeTeam);
      const as = parseScore(ev.scores, leg.awayTeam);
      if (hs === null || as === null) {
        // cannot parse scores -> void
        await tx.betLeg.update({
          where: { id: leg.id },
          data: { status: "VOID", settledAt: new Date(), meta: { reason: "scores_missing" } },
        });
        updatedSlipIds.add(leg.slipId);
        continue;
      }

      let status: "WON" | "LOST" | "VOID" = "VOID";

      if (leg.marketKey === "h2h") {
        if (hs === as) status = "VOID";
        else {
          const winner = hs > as ? leg.homeTeam : leg.awayTeam;
          status = leg.selection === winner ? "WON" : "LOST";
        }
      } else if (leg.marketKey === "totals") {
        const line = leg.line;
        if (line === null || line === undefined) status = "VOID";
        else {
          const total = hs + as;
          if (total === line) status = "VOID";
          else if (total > line) status = leg.selection === "over" ? "WON" : "LOST";
          else status = leg.selection === "under" ? "WON" : "LOST";
        }
      } else {
        // Unknown market -> void for now
        status = "VOID";
      }

      await tx.betLeg.update({
        where: { id: leg.id },
        data: { status, settledAt: new Date() },
      });
      updatedSlipIds.add(leg.slipId);
    }

    // now settle slips that have updates
    for (const slipId of updatedSlipIds) {
      const slip = await tx.betSlip.findUnique({ where: { id: slipId }, include: { legs: true } });
      if (!slip) continue;
      if (slip.status !== "PENDING") continue;

      const legs = slip.legs;
      if (legs.some((l) => l.status === "PENDING")) continue;

      const hasLost = legs.some((l) => l.status === "LOST");
      if (hasLost) {
        await tx.betSlip.update({ where: { id: slipId }, data: { status: "LOST", settledAt: new Date() } });
        continue;
      }

      // if all VOID -> refund stake
      const nonVoid = legs.filter((l) => l.status === "WON");
      if (nonVoid.length === 0) {
        await tx.betSlip.update({ where: { id: slipId }, data: { status: "VOID", settledAt: new Date() } });
        await tx.user.update({ where: { id: slip.userId }, data: { balanceCents: { increment: slip.stakeCents } } });
        await tx.transaction.create({
          data: {
            userId: slip.userId,
            type: "ADJUST",
            amountCents: slip.stakeCents,
            meta: { slipId, reason: "sportsbook_void_refund" },
          },
        });
        continue;
      }

      let combinedDecimal = 1;
      for (const l of nonVoid) combinedDecimal *= americanToDecimal(l.oddsAmerican);
      const payout = Math.max(slip.stakeCents, Math.floor(slip.stakeCents * combinedDecimal));

      await tx.betSlip.update({
        where: { id: slipId },
        data: {
          status: "WON",
          settledAt: new Date(),
          potentialPayoutCents: payout,
          meta: { ...(slip.meta as any), finalPayoutCents: payout, voidLegs: legs.filter((l) => l.status === "VOID").length },
        },
      });

      await tx.user.update({ where: { id: slip.userId }, data: { balanceCents: { increment: payout } } });
      await tx.transaction.create({
        data: {
          userId: slip.userId,
          type: "WIN",
          amountCents: payout,
          meta: { slipId, slipType: slip.type, payoutCents: payout },
        },
      });
    }
  });

  return NextResponse.json({ ok: true, settledCandidates: pendingLegs.length, updatedSlips: updatedSlipIds.size });
}
