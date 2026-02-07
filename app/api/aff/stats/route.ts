import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  const aff = await prisma.affiliate.findUnique({ where: { userId: au.id } });
  if (!aff) return jsonErr("Affiliate not found", 404);

  const [clicks, signups, earningsAgg, lockedAgg] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateId: aff.id } }),
    prisma.referral.count({ where: { affiliateId: aff.id } }),
    prisma.affiliateEarning.aggregate({
      where: { affiliateId: aff.id },
      _sum: { amountCents: true },
    }),
    prisma.affiliatePayoutRequest.aggregate({
      where: { affiliateId: aff.id, status: { in: ["PENDING", "APPROVED", "PAID"] } },
      _sum: { amountCents: true },
    }),
  ]);

  const earningsCents = earningsAgg._sum.amountCents || 0;
  const lockedCents = lockedAgg._sum.amountCents || 0;
  const availableCents = Math.max(0, earningsCents - lockedCents);

  return jsonOk({
    code: aff.code,
    revshareBps: aff.revshareBps,
    clicks,
    signups,
    earningsCents,
    lockedCents,
    availableCents,
  });
}
