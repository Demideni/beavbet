import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function endOfTodayUTC() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return end;
}

export async function GET(req: NextRequest) {
  const au = await getUserFromRequest(req).catch(() => null);

  try {
    const now = new Date();

    // find active daily sprint (24/7 style)
    let t = await prisma.tournament.findFirst({
      where: { slug: "daily-sprint", status: "ACTIVE", endsAt: { gt: now } },
    });

    if (!t) {
      // create if missing
      t = await prisma.tournament.create({
        data: {
          id: crypto.randomUUID(),
          slug: "daily-sprint",
          name: "Daily Sprint 24/7",
          type: "DAILY_SPRINT",
          status: "ACTIVE",
          startsAt: now,
          endsAt: endOfTodayUTC(),
          kFactor: 10,
          prizePoolCents: 0,
        },
      });
    }

    const top = await prisma.tournamentEntry.findMany({
      where: { tournamentId: t.id },
      orderBy: [{ points: "desc" }, { updatedAt: "asc" }],
      take: 100,
      include: { user: { select: { id: true, email: true } } },
    });

    let me: any = null;
    if (au) {
      const entry = await prisma.tournamentEntry.findUnique({
        where: { tournamentId_userId: { tournamentId: t.id, userId: au.id } },
        include: { user: { select: { id: true, email: true } } },
      });
      if (entry) {
        // compute rank (cheap: count above)
        const higher = await prisma.tournamentEntry.count({
          where: { tournamentId: t.id, points: { gt: entry.points } },
        });
        me = { ...entry, rank: higher + 1 };
      } else {
        me = { rank: null, points: 0 };
      }
    }

    return jsonOk({
      tournament: t,
      leaderboard: top.map((r) => ({
        userId: r.userId,
        email: r.user.email,
        points: r.points,
        bestMultiplier: r.bestMultiplier,
        roundsCount: r.roundsCount,
        updatedAt: r.updatedAt,
      })),
      me,
    });
  } catch (e) {
    console.error(e);
    return jsonErr("Server error", 500);
  }
}
