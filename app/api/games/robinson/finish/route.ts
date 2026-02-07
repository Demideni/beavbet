import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({
  roundId: z.string().min(1),
  multiplier: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  try {
    const body = Body.parse(await req.json());

    // Find the bet transaction for this round
    const betTx = await prisma.transaction.findFirst({
      where: {
        userId: au.id,
        type: "BET",
        meta: { path: ["roundId"], equals: body.roundId },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!betTx) return jsonErr("Round not found", 404);

    // Prevent double-finish (simple check: if WIN exists for this round)
    const winExists = await prisma.transaction.findFirst({
      where: {
        userId: au.id,
        type: "WIN",
        meta: { path: ["roundId"], equals: body.roundId },
      },
    });
    if (winExists) return jsonOk({ balanceCents: (await prisma.user.findUnique({where:{id:au.id},select:{balanceCents:true}}))?.balanceCents ?? 0, winCents: 0 });

    const payoutCents = Math.max(0, Math.round(betTx.amountCents * body.multiplier));

    await prisma.$transaction(async (tx) => {
      if (payoutCents > 0) {
        await tx.user.update({
          where: { id: au.id },
          data: { balanceCents: { increment: payoutCents } },
        });
      }
      await tx.transaction.create({
        data: {
          userId: au.id,
          type: "WIN",
          amountCents: payoutCents,
          meta: { game: "robinson", roundId: body.roundId, multiplier: body.multiplier },
        },
      });

// --- Tournament (Daily Sprint 24/7) ---
try {
  const now = new Date();
  const t = await tx.tournament.findFirst({
    where: { slug: "daily-sprint", status: "ACTIVE", endsAt: { gt: now } },
  });

  if (t) {
    const stake = betTx.amountCents;
    const points = Math.sqrt(stake / 100) * body.multiplier * t.kFactor;

    // idempotent per tournamentId+roundId
    await tx.tournamentRound.upsert({
      where: { tournamentId_roundId: { tournamentId: t.id, roundId: body.roundId } },
      create: {
        tournamentId: t.id,
        userId: au.id,
        roundId: body.roundId,
        stakeCents: stake,
        multiplier: body.multiplier,
        points,
      },
      update: {
        stakeCents: stake,
        multiplier: body.multiplier,
        points,
      },
    });

    const existing = await tx.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: t.id, userId: au.id } },
    });

    if (!existing) {
      await tx.tournamentEntry.create({
        data: {
          tournamentId: t.id,
          userId: au.id,
          points,
          bestMultiplier: body.multiplier,
          roundsCount: 1,
          lastRoundAt: now,
        },
      });
    } else {
      await tx.tournamentEntry.update({
        where: { id: existing.id },
        data: {
          points: { increment: points },
          bestMultiplier: Math.max(existing.bestMultiplier, body.multiplier),
          roundsCount: { increment: 1 },
          lastRoundAt: now,
        },
      });
    }
  }
} catch (e) {
  console.error("tournament update failed", e);
}
    });

    const updated = await prisma.user.findUnique({
      where: { id: au.id },
      select: { balanceCents: true },
    });

    return jsonOk({ balanceCents: updated?.balanceCents ?? 0, winCents: payoutCents });
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonErr("Invalid input", 422, e.issues);
    console.error(e);
    return jsonErr("Server error", 500);
  }
}
