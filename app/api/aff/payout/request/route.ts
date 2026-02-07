import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const amountCents = Number(body?.amountCents || 0);
  const destination = String(body?.destination || "").trim();

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return jsonErr("Bad amount", 400);
  }
  if (destination.length < 6) {
    return jsonErr("Bad destination", 400);
  }

  const aff = await prisma.affiliate.findUnique({ where: { userId: au.id } });
  if (!aff) return jsonErr("Affiliate not found", 404);

  const earnedAgg = await prisma.affiliateEarning.aggregate({
    where: { affiliateId: aff.id },
    _sum: { amountCents: true },
  });
  const earned = earnedAgg._sum.amountCents || 0;

  const lockedAgg = await prisma.affiliatePayoutRequest.aggregate({
    where: { affiliateId: aff.id, status: { in: ["PENDING", "APPROVED", "PAID"] } },
    _sum: { amountCents: true },
  });
  const locked = lockedAgg._sum.amountCents || 0;

  const available = earned - locked;
  if (amountCents > available) {
    return jsonErr("INSUFFICIENT_AVAILABLE", 400, { available });
  }

  const created = await prisma.affiliatePayoutRequest.create({
    data: {
      affiliateId: aff.id,
      amountCents,
      destination,
      status: "PENDING",
      currency: "USD",
    },
    select: { id: true },
  });

  return jsonOk({ ok: true, requestId: created.id });
}
