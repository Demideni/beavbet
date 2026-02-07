import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().min(5),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);
  if (!isAdminEmail(au.email)) return jsonErr("Forbidden", 403);

  const body = Body.parse(await req.json());

  const updated = await prisma.affiliatePayoutRequest.update({
    where: { id: body.id },
    data: { status: body.status, note: body.note },
    select: { id: true, status: true },
  });

  return jsonOk({ updated });
}
