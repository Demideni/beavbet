import { NextRequest, NextResponse } from "next/server";
import { clearAccessCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearAccessCookie(res);
  return res;
}
