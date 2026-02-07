import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonErr, jsonOk } from "@/lib/http";
import { fingerprintHashes } from "@/lib/affiliate";

export const runtime = "nodejs";

const Body = z.object({
  code: z.string().min(3).max(32).transform((s) => s.trim().toUpperCase()),
  landingPath: z.string().max(200).optional(),
  referrer: z.string().max(400).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const aff = await prisma.affiliate.findUnique({ where: { code: body.code } });
    if (!aff || !aff.isActive) return jsonOk({ ok: true, ignored: true });

    const { ipHash, uaHash } = fingerprintHashes(req);

    await prisma.affiliateClick.create({
      data: {
        affiliateId: aff.id,
        ipHash,
        uaHash,
        landingPath: body.landingPath,
        referrer: body.referrer,
      },
    });

    return jsonOk({ ok: true });
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonErr("Invalid input", 422, e.issues);
    // don't break landing
    return jsonOk({ ok: true, ignored: true });
  }
}
