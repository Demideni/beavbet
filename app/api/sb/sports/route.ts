import { NextResponse } from "next/server";
import { oddsGet } from "@/lib/oddsApi";

export const dynamic = "force-dynamic"; // важно: не даём Next пытаться "пререндерить" API

// Returns list of sports (dynamic) from The Odds API
export async function GET() {
  if (!process.env.ODDS_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "ODDS_API_KEY is not set", data: [] },
      { status: 503 }
    );
  }

  const { data, usage } = await oddsGet<any[]>("/sports", { all: "false" });
  return NextResponse.json({ ok: true, usage, data });
}
