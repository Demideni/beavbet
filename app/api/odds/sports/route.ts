import { NextResponse } from "next/server";

import { getCached, getOddsApiKey, oddsFetchJson, setCached } from "@/app/lib/oddsApi";

export const dynamic = "force-dynamic";

type OddsSport = {
  key: string;
  group: string;
  title: string;
  description?: string;
  active: boolean;
  has_outrights?: boolean;
};

// GET /api/odds/sports
// Возвращает список активных sport_key из The Odds API.
export async function GET() {
  try {
    const cacheKey = "odds:sports:v1";
    const cached = getCached<OddsSport[]>(cacheKey);
    if (cached) return NextResponse.json({ data: cached });

    const apiKey = getOddsApiKey();

    // https://api.the-odds-api.com/v4/sports/?apiKey=...
    const { data: sports } = await oddsFetchJson<OddsSport[]>(
      `https://api.the-odds-api.com/v4/sports/?apiKey=${encodeURIComponent(apiKey)}`
    );

    const active = (sports || [])
      .filter((s) => s && s.active)
      // на всякий случай нормализуем поля
      .map((s) => ({
        key: s.key,
        group: s.group || "Other",
        title: s.title || s.key,
        description: s.description,
        active: !!s.active,
        has_outrights: s.has_outrights,
      }))
      .sort((a, b) => (a.group + a.title).localeCompare(b.group + b.title));

    // кэш на 5 минут (список спорта меняется редко)
    setCached(cacheKey, active, 300_000);

    return NextResponse.json({ data: active });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Odds API request failed" },
      { status: 500 }
    );
  }
}
