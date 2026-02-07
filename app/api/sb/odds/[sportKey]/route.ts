import { NextResponse } from "next/server";
import { oddsGet } from "@/lib/oddsApi";

export async function GET(
  req: Request,
  { params }: { params: { sportKey: string } }
) {
  const { searchParams } = new URL(req.url);

  const regions = searchParams.get("regions") || "us";
  const markets = searchParams.get("markets") || "h2h,totals"; // MVP
  const oddsFormat = searchParams.get("oddsFormat") || "american";
  const dateFormat = searchParams.get("dateFormat") || "iso";
  const bookmakers = searchParams.get("bookmakers") || undefined;

  const { data, usage } = await oddsGet<any[]>(`/sports/${params.sportKey}/odds`, {
    regions,
    markets,
    oddsFormat,
    dateFormat,
    bookmakers,
  });

  return NextResponse.json({ usage, data });
}
