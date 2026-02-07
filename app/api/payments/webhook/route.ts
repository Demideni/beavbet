import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { jsonErr, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // (опционально) защита webhook по токену в URL ?token=
    const requiredToken = process.env.PASSIMPAY_WEBHOOK_TOKEN;
    if (requiredToken) {
      const token = req.nextUrl.searchParams.get("token");
      if (!token || token !== requiredToken) return jsonErr("Unauthorized", 401);
    }

    const platformId = process.env.PASSIMPAY_PLATFORM_ID || "";
    const apiKey = process.env.PASSIMPAY_API_KEY || "";
    if (!platformId || !apiKey) return jsonErr("Server misconfigured", 500);

    const signature = (req.headers.get("x-signature") || "").trim();
    if (!signature) return jsonErr("Missing x-signature", 401);

    // ⚠️ raw body читаем ОДИН раз
    const rawBody = await req.text();
    if (!rawBody) return jsonErr("Empty body", 400);

    // ✅ подпись: HMAC_SHA256(key=apiKey, message=platformId;rawBody;apiKey) -> hex
    const message = `${platformId};${rawBody};${apiKey}`;
    const expected = crypto.createHmac("sha256", apiKey).update(message).digest("hex");

    // ✅ FIX: без Buffer (убираем TS ошибку ArrayBufferView)
    const enc = new TextEncoder();
    const a = enc.encode(expected);    // hex-string bytes
    const b = enc.encode(signature);   // hex-string bytes

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return jsonErr("Bad signature", 401);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonErr("Invalid JSON", 400);
    }

    const orderId: string | undefined = payload.orderId || payload.order_id;
    if (!orderId) return jsonErr("Missing orderId", 400);

    // статус оплаты (делаем гибко)
    const statusStr = String(payload.status || payload.state || payload.result || "").toLowerCase();
    const confirmations = typeof payload.confirmations === "number" ? payload.confirmations : undefined;

    const isPaid =
      statusStr === "paid" ||
      statusStr === "success" ||
      statusStr === "completed" ||
      statusStr === "confirmed" ||
      payload.paid === true ||
      payload.success === true ||
      (typeof confirmations === "number" && confirmations >= 1);

    if (!isPaid) {
      return jsonOk({ ok: true, ignored: true });
    }

    const paymentId: string | undefined = payload.paymentId || payload.payment_id || payload.id;
    const txhash: string | undefined = payload.txhash || payload.txHash || payload.tx_id;

    // 1) находим инвойс
    const inv = await prisma.paymentInvoice.findFirst({
      where: {
        OR: [{ id: orderId }, { externalId: orderId }],
      },
    });

    if (!inv) return jsonErr("Invoice not found", 404);

    // 2) идемпотентность: если уже PAID — не начисляем повторно
    if (inv.status === "PAID") return jsonOk({ ok: true, already: true });

    // 3) атомарно: invoice->PAID + credit + transaction
    await prisma.$transaction(async (tx) => {
      await tx.paymentInvoice.update({
        where: { id: inv.id },
        data: {
          status: "PAID",
          // если externalId пустой — сохраним paymentId/txhash (но externalId уникальный!)
          ...(inv.externalId
            ? {}
            : {
                externalId: paymentId || txhash || null,
              }),
        },
      });

      await tx.user.update({
        where: { id: inv.userId },
        data: { balanceCents: { increment: inv.amountCents } },
      });

      await tx.transaction.create({
        data: {
          userId: inv.userId,
          type: "DEPOSIT",
          amountCents: inv.amountCents,
          meta: {
            provider: "PassimPay",
            orderId,
            paymentId,
            txhash,
            confirmations,
            status: statusStr || "paid",
          },
        },
      });
      // affiliate revshare (MVP: percent from deposit)
      try {
        const ref = await tx.referral.findUnique({ where: { referredUserId: inv.userId } });
        if (ref) {
          const aff = await tx.affiliate.findUnique({ where: { id: ref.affiliateId } });
          if (aff && aff.isActive && aff.revshareBps > 0) {
            const earn = Math.floor((inv.amountCents * aff.revshareBps) / 10000);
            if (earn > 0) {
              await tx.affiliateEarning.create({
                data: {
                  affiliateId: aff.id,
                  referredUserId: inv.userId,
                  source: "deposit",
                  invoiceId: inv.id,
                  amountCents: earn,
                  currency: inv.currency || "USD",
                  meta: { provider: "PassimPay", orderId, paymentId },
                },
              });
            }
          }
        }
      } catch {
        // ignore duplicates / optional failures
      }


    });

    return jsonOk({ ok: true, credited: true });
  } catch (e) {
    console.error(e);
    return jsonErr("Server error", 500);
  }
}
