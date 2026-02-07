import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const au = await getUserFromRequest(req);
  if (!au) return jsonErr("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: au.id },
    select: { id: true, email: true, balanceCents: true, createdAt: true },
  });
  if (!user) return jsonErr("Unauthorized", 401);

  return jsonOk({ user });
}
