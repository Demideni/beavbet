import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";
import { generateAffiliateCode } from "@/lib/affiliate";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  const aff = await prisma.affiliate.findUnique({
    where: { userId: au.id },
    select: { id: true, userId: true, code: true, revshareBps: true, isActive: true, createdAt: true, updatedAt: true },
  });

  return jsonOk({ affiliate: aff });
}

export async function POST(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  // idempotent create
  const existing = await prisma.affiliate.findUnique({ where: { userId: au.id } });
  if (existing) return jsonOk({ affiliate: existing });

  // create with unique code (retry a few times)
  for (let i = 0; i < 10; i++) {
    const code = generateAffiliateCode(8);
    try {
      const aff = await prisma.affiliate.create({
        data: { userId: au.id, code },
      });
      return jsonOk({ affiliate: aff });
    } catch (e: any) {
      // unique constraint on code
      if (e?.code === "P2002") continue;
      throw e;
    }
  }

  return jsonErr("Failed to generate affiliate code", 500);
}
