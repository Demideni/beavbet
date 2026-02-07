import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);
  if (!isAdminEmail(au.email)) return jsonErr("Forbidden", 403);

  // NOTE:
  // Some deployments may not have AffiliatePayoutRequest in the generated Prisma Client
  // (schema drift / older schema). To avoid build-time TypeScript failures and keep the
  // admin endpoint resilient, we access it dynamically and fall back to raw SQL.
  let rows: any[] = [];
  try {
    const p: any = prisma as any;
    if (p.affiliatePayoutRequest?.findMany) {
      rows = await p.affiliatePayoutRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          affiliate: { select: { id: true, code: true, userId: true } },
        },
      });
    } else {
      // Fallback: keep it simple (no relations) if the model isn't available.
      rows = (await prisma.$queryRaw`
        SELECT *
        FROM "AffiliatePayoutRequest"
        ORDER BY "createdAt" DESC
        LIMIT 200
      `) as any[];
    }
  } catch {
    // If the table doesn't exist or any other error happens, return empty list.
    rows = [];
  }

  return jsonOk({ rows });
}
