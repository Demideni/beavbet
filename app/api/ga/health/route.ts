import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const id = process.env.GA_MERCHANT_ID || null;
  const key = process.env.GA_MERCHANT_KEY || null;

  return NextResponse.json({
    ok: true,
    hasMerchantId: !!id,
    hasMerchantKey: !!key,
    maskedMerchantId: id ? String(id).slice(0, 3) + "***" + String(id).slice(-3) : null,
  });
}
