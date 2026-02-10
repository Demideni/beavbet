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

function baseUrl(): string {
  return (
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://beavbet.com"
  );
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser(); // ВАЖНО: без аргументов
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = Body.parse(await req.json());
    const db = getDb();

    const sessionId = uuid();

    // 1) session mapping for callbacks
    db.prepare(
      `INSERT INTO ga_sessions (session_id, user_id, created_at) VALUES (?, ?, ?)`
    ).run(sessionId, user.id, Date.now());

    // 2) ensure EUR wallet exists
    const currency = gaCurrency(); // must be EUR in test
    const exists = db
      .prepare(`SELECT 1 FROM wallets WHERE user_id = ? AND currency = ? LIMIT 1`)
      .get(user.id, currency);

    if (!exists) {
      db.prepare(
        `INSERT INTO wallets (id, user_id, currency, balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuid(), user.id, currency, 0, Date.now(), Date.now());
    }

    const returnUrl = `${baseUrl()}/casino?ga=return`;

    // 3) player_name
    const playerName =
      (user as any)?.username ??
      (user as any)?.name ??
      (user as any)?.email ??
      `player_${user.id}`;

    const resp = await gaInit({
      game_uuid: body.game_uuid,
      user_id: String(user.id),
      session_id: sessionId,
      return_url: returnUrl,
      currency,
      language: "ru",
      is_mobile: !!body.is_mobile,
      player_id: String(user.id),
      player_name: String(playerName).slice(0, 50),
    });

    // 4) Self-validate (staging requirement). Best-effort: do not fail init if staging is flaky.
    // Provider will call our /api/ga/callback during this step.
    try {
      // Lazy import to avoid circular deps in case of edge runtimes
      const { gaSelfValidate } = await import("@/lib/gaClient");
      await gaSelfValidate(sessionId);
    } catch {
      // ignore
    }

    const url = resp?.url ?? resp?.data?.url ?? resp?.game_url ?? resp?.data?.game_url;
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "No url in GA init response", resp },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url, sessionId, currency }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
