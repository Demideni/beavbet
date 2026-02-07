import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/http";
import { passimpaySignature } from "@/lib/passimpay";

export const runtime = "nodejs";

const Body = z.object({
  amountUsd: z.number().positive(),
  currency: z.string().optional().default("USDT"), // UI hint only (we can restrict later via currency IDs)
});

function toAmountString(amountUsd: number) {
  return amountUsd.toFixed(2);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return jsonErr("Unauthorized", 401);

    const body = Body.parse(await req.json());
    const amountUsd = body.amountUsd;
    const currency = body.currency || "USDT";

    // Create local invoice first
    const invoice = await prisma.paymentInvoice.create({
      data: {
        userId: user.id,
        provider: "PassimPay",
        currency,
        amountCents: Math.round(amountUsd * 100),
        status: "PENDING",
      },
    });

    // We'll use our local invoice id as PassimPay orderId, so webhook can find it deterministically.
    await prisma.paymentInvoice.update({
      where: { id: invoice.id },
      data: { externalId: invoice.id },
    });

    const platformId = process.env.PASSIMPAY_PLATFORM_ID;
    const secret = process.env.PASSIMPAY_API_KEY;

    if (!platformId || !secret) {
      return jsonErr("PassimPay env missing: PASSIMPAY_PLATFORM_ID / PASSIMPAY_API_KEY", 500);
    }

    // Create invoice link (redirect user to PassimPay hosted checkout)
    // Docs: POST https://api.passimpay.io/v2/createorder
    const payload: any = {
      platformId: Number(platformId),
      orderId: invoice.id,
      amount: toAmountString(amountUsd),
      symbol: "USD",
      type: 1, // crypto only
      // currencies: "..." // optional currency IDs. We'll add mapping later if you want strict selection.
    };

    const signature = passimpaySignature(payload.platformId, payload, secret);

    const r = await fetch("https://api.passimpay.io/v2/createorder", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-signature": signature,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => null);

    if (!r.ok || !data || data.result !== 1 || !data.url) {
      console.error("PassimPay createorder failed:", r.status, data);
      return jsonErr("PassimPay createorder failed", 502, data);
    }

    const checkoutUrl: string = data.url;

    const updated = await prisma.paymentInvoice.update({
      where: { id: invoice.id },
      data: { checkoutUrl },
    });

    return jsonOk({ invoice: updated });
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonErr("Invalid input", 422, e.issues);
    console.error(e);
    return jsonErr("Server error", 500);
  }
}
