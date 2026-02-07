import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);
  if (!isAdminEmail(au.email)) return jsonErr("Forbidden", 403);

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, balanceCents: true, createdAt: true },
  });
  if (!user) return jsonErr("Not found", 404);

  const tx = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: { id: true, type: true, amountCents: true, createdAt: true, meta: true },
  });

  return jsonOk({ user, tx });
}
