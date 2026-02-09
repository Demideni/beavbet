import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { gaInit, gaCurrency } from "@/lib/gaClient";
import { getDb, uuid } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  game_uuid: z.string().min(1),
  is_mobile: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const body = Body.parse(await req.json());
    const db = getDb();

    const sessionId = uuid();
    // store mapping for callbacks (session_id -> user_id)
    db.prepare(
      `INSERT INTO ga_sessions (session_id, user_id, created_at) VALUES (?, ?, ?)`,
    ).run(sessionId, user.id, Date.now());

    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://beavbet.com";
    const returnUrl = `${baseUrl}/casino?ga=return`;

    const currency = gaCurrency(); // must be EUR for test
    const resp = await gaInit({
      game_uuid: body.game_uuid,
      user_id: String(user.id),
      session_id: sessionId,
      return_url: returnUrl,
      currency,
      language: "ru",
      is_mobile: !!body.is_mobile,
    });

    // Most providers return { url: "..." } or { data: { url } }
    const url = resp?.url || resp?.data?.url || resp?.game_url || resp?.data?.game_url;
    if (!url) {
      return NextResponse.json({ ok: false, error: "No url in GA init response", resp }, { status: 500 });
    }
    return NextResponse.json({ ok: true, url, sessionId, currency }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
