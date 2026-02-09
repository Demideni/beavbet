import { NextResponse } from "next/server";

export async function GET() {
  const id = process.env.GA_MERCHANT_ID || process.env.GAME_AGGREGATOR_MERCHANT_ID || null;
  const key = process.env.GA_MERCHANT_KEY || process.env.GAME_AGGREGATOR_MERCHANT_KEY || null;
  const masked = key ? `${key.slice(0,3)}***${key.slice(-3)}` : null;

  return NextResponse.json({
    ok: true,
    hasMerchantId: Boolean(id),
    hasMerchantKey: Boolean(key),
    maskedMerchantKey: masked,
    nodeEnv: process.env.NODE_ENV,
  });
}
