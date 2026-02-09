import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const platformId = (process.env.PASSIMPAY_PLATFORM_ID || "").trim();
  const secret = (process.env.PASSIMPAY_API_KEY || "").trim();
  return NextResponse.json({
    ok: true,
    hasPlatformId: !!platformId,
    hasKey: !!secret,
    masked: secret ? `${secret.slice(0, 3)}***${secret.slice(-3)}` : null,
    baseUrl: (process.env.PASSIMPAY_BASE_URL || "https://api.passimpay.io").trim(),
  });
}
