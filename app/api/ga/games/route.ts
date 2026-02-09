import { NextResponse } from "next/server";
import { gaGames } from "@/lib/gaClient";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await gaGames();
    // Provider returns { success: true, games: [...] } or similar
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
