// app/api/games/route.ts
import { NextResponse } from "next/server";

export type Game = {
  id: string;
  name: string;
  provider: string;
  rtp: number;
  volatility: "low" | "medium" | "high";
  category: "slots" | "crash" | "live" | "table";
  featureTags: string[];
  image: string;
};

const games: Game[] = [
  {
    id: "gates-of-olympus",
    name: "Gates of Olympus",
    provider: "Pragmatic Play",
    rtp: 96.5,
    volatility: "high",
    category: "slots",
    featureTags: ["Top", "Bonus Buy"],
    image: "/games/gates-of-olympus.jpg",
  },
  {
    id: "sweet-bonanza",
    name: "Sweet Bonanza",
    provider: "Pragmatic Play",
    rtp: 96.5,
    volatility: "medium",
    category: "slots",
    featureTags: ["Hits", "Tumbles"],
    image: "/games/sweet-bonanza.jpg",
  },
  {
    id: "aviator",
    name: "Aviator",
    provider: "Spribe",
    rtp: 97.0,
    volatility: "high",
    category: "crash",
    featureTags: ["Crash", "Popular"],
    image: "/games/aviator.jpg",
  },
  {
    id: "pulz-exclusive-1",
    name: "Pulz Lightning",
    provider: "Pulz Exclusive",
    rtp: 98.2,
    volatility: "high",
    category: "slots",
    featureTags: ["Exclusive", "High RTP"],
    image: "/games/pulz-exclusive-1.jpg",
  },
];

export async function GET() {
  return NextResponse.json(games);
}
