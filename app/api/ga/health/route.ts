import { NextResponse } from "next/server";
import { getGaConfig } from "@/lib/gaClient";

export const runtime = "nodejs";

function safeCfg() {
  try {
    return getGaConfig();
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export async function GET() {
  const cfg = safeCfg() as any;
  const merchantId = cfg.merchantId ?? null;
  const merchantKey = cfg.merchantKey ?? null;

  return NextResponse.json({
    ok: true,
    hasMerchantId: !!merchantId,
    hasMerchantKey: !!merchantKey,
    maskedMerchantId: merchantId ? String(merchantId).slice(0, 3) + "***" + String(merchantId).slice(-3) : null,
    apiUrl: cfg.apiUrl ?? process.env.GA_API_URL ?? null,
    envSeen: {
      GA_MERCHANT_ID: !!process.env.GA_MERCHANT_ID,
      MERCHANT_ID: !!process.env.MERCHANT_ID,
      GA_MERCHANT_KEY: !!process.env.GA_MERCHANT_KEY,
      MERCHANT_KEY: !!process.env.MERCHANT_KEY,
      GA_API_URL: !!process.env.GA_API_URL,
    },
    error: cfg.error ?? null,
  });
}
