import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureAffiliateProfile } from "@/lib/affiliate";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  const db = getDb();
  const profile = ensureAffiliateProfile(session.id);

  // IMPORTANT:
  // On Render / reverse-proxy setups `req.url` may be an internal URL like http://localhost:10000/...
  // Build a public origin from forwarded headers (or an explicit env), so affiliate links are real.
  const envOrigin = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim().replace(/\/$/, "");
  const h = headers();
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  const origin = envOrigin || (host ? `${proto}://${host}` : new URL(req.url).origin);
  const link = `${origin}/?ref=${profile.code}`;

  const clicks = db
    .prepare("SELECT COUNT(*) as c FROM affiliate_clicks WHERE code = ?")
    .get(profile.code) as { c: number };

  const referrals = db
    .prepare(
      `SELECT r.referred_user_id as userId,
              u.email as email,
              u.created_at as createdAt
         FROM referrals r
         JOIN users u ON u.id = r.referred_user_id
        WHERE r.affiliate_user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 200`
    )
    .all(session.id) as Array<{ userId: string; email: string; createdAt: number }>;

  // Deposits by referred users
  const depAgg = db
    .prepare(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(t.amount),0) as sum
         FROM transactions t
         JOIN referrals r ON r.referred_user_id = t.user_id
        WHERE r.affiliate_user_id = ? AND t.type = 'deposit' AND t.status = 'done'`
    )
    .get(session.id) as { cnt: number; sum: number };

  // FTD count: number of referred users that have at least one deposit
  const ftd = db
    .prepare(
      `SELECT COUNT(DISTINCT t.user_id) as c
         FROM transactions t
         JOIN referrals r ON r.referred_user_id = t.user_id
        WHERE r.affiliate_user_id = ? AND t.type = 'deposit' AND t.status = 'done'`
    )
    .get(session.id) as { c: number };

  const commAgg = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('pending','approved','paid') THEN amount ELSE 0 END),0) as earned,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END),0) as approved,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END),0) as paid
       FROM affiliate_commissions
       WHERE affiliate_user_id = ?`
    )
    .get(session.id) as { earned: number; approved: number; paid: number };

  const withdrawalsAgg = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN amount ELSE 0 END),0) as reserved,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END),0) as paid
       FROM withdrawal_requests
       WHERE user_id = ?`
    )
    .get(session.id) as { reserved: number; paid: number };

  const available = Math.max(0, Number((commAgg.approved - withdrawalsAgg.reserved - withdrawalsAgg.paid).toFixed(2)));

  return NextResponse.json({
    ok: true,
    profile: { code: profile.code, status: profile.status, link },
    stats: {
      clicks: clicks.c,
      referredPlayers: referrals.length,
      ftd: ftd.c,
      depositCount: depAgg.cnt,
      depositSum: depAgg.sum,
      earned: commAgg.earned,
      available,
    },
    referrals: referrals.map((r) => ({
      userId: r.userId,
      emailMasked: maskEmail(r.email),
      createdAt: r.createdAt,
    })),
  });
}

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  const user = u.length <= 2 ? u[0] + "*" : u[0] + "***" + u[u.length - 1];
  return `${user}@${d || "***"}`;
}
