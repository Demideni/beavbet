import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  const url = new URL(req.url);
  const take = Math.min(parseInt(url.searchParams.get("take") || "50", 10), 200);

  const txs = await prisma.transaction.findMany({
    where: { userId: au.id },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, amountCents: true, meta: true, createdAt: true },
  });

  return jsonOk({ transactions: txs });
}
