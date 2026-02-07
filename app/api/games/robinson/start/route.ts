import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({
  amount: z.number().positive(), // bet amount in USD (MVP)
});

function toCents(amountUsd: number) {
  return Math.round(amountUsd * 100);
}

export async function POST(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  try {
    const body = Body.parse(await req.json());
    const betCents = toCents(body.amount);
    const roundId = crypto.randomUUID();

    const user = await prisma.user.findUnique({
      where: { id: au.id },
      select: { balanceCents: true },
    });
    if (!user) return jsonErr("Unauthorized", 401);

    if (user.balanceCents < betCents) return jsonErr("Insufficient balance", 402);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: au.id },
        data: { balanceCents: { decrement: betCents } },
      });
      await tx.transaction.create({
        data: {
          userId: au.id,
          type: "BET",
          amountCents: betCents,
          meta: { game: "robinson", roundId },
        },
      });
    });

    const updated = await prisma.user.findUnique({
      where: { id: au.id },
      select: { balanceCents: true },
    });

    return jsonOk({ balanceCents: updated?.balanceCents ?? 0, roundId });
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonErr("Invalid input", 422, e.issues);
    console.error(e);
    return jsonErr("Server error", 500);
  }
}
