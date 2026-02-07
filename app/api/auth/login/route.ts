import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAccessToken, setAccessCookie } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) return jsonErr("Invalid email or password", 401);

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return jsonErr("Invalid email or password", 401);

    const token = await signAccessToken({
      id: user.id,
      email: user.email,
    });

    const res = jsonOk({
      user: { id: user.id, email: user.email, balanceCents: user.balanceCents },
    });

    // ✅ КЛЮЧЕВОЙ ФИКС
    setAccessCookie(res, token);
    return res;
  } catch (e: any) {
    return jsonErr("Server error", 500);
  }
}

