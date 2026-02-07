import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

// Universal promo click router:
// - if logged in -> cashier
// - if not -> login/register flow, then cashier
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const url = new URL(req.url);

  const target = "/cashier";
  const redirectTo = user ? target : `/login?next=${encodeURIComponent(target)}`;

  return NextResponse.redirect(new URL(redirectTo, url.origin), { status: 302 });
}
