import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAccessToken, setAccessCookie } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (existing) return jsonErr("Email already registered", 400);

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
      },
      select: { id: true, email: true },
    });

    // рефка из cookie, которую ставит middleware
    const refCode = req.cookies.get("aff_ref")?.value;

    if (refCode) {
      const aff = await prisma.affiliate.findUnique({
        where: { code: refCode },
        select: { id: true, isActive: true, userId: true },
      });

      if (aff?.isActive && aff.userId !== user.id) {
        // защищаемся от дубля: на один юзер — одна привязка
        await prisma.referral
          .create({
            data: {
              affiliateId: aff.id,
              referredUserId: user.id,
            },
          })
          .catch(() => {});
      }
    }

    const token = await signAccessToken({ id: user.id, email: user.email });

    // ✅ формируем response
    const res = jsonOk({ user });

    // ✅ ставим access cookie НА response
    setAccessCookie(res, token);

    // ✅ чистим aff_ref НА response, чтобы не "прилипало"
    res.cookies.set("aff_ref", "", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return res;
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonErr("Invalid input", 422, e.issues);
    console.error(e);
    return jsonErr("Server error", 500);
  }
}
