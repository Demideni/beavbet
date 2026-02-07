import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);
  if (!isAdminEmail(au.email)) return jsonErr("Forbidden", 403);

  const body = await req.json().catch(() => null) as null | { amountUsd?: number | string; reason?: string };
  if (!body) return jsonErr("Bad JSON", 400);

  const amountUsd = Number(body.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd === 0) return jsonErr("Invalid amountUsd", 400);

  const reason = String(body.reason || "").trim().slice(0, 200);
  const amountCents = Math.round(amountUsd * 100);

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!user) return jsonErr("Not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { balanceCents: { increment: amountCents } },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "ADJUST",
        amountCents,
        meta: { reason, by: au.email },
      },
    });
  });

  return jsonOk({ ok: true });
}
