export const dynamic = "force-dynamic";

async function getData() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/tournaments`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function TournamentsPage() {
  const data = await getData();

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Tournaments</h1>
      <p style={{ opacity: 0.8 }}>Daily Sprint 24/7</p>

      {!data ? (
        <p style={{ marginTop: 12 }}>Failed to load.</p>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <div><b>Prize pool:</b> {data.tournament.prizePoolCents / 100}</div>
            <div><b>K:</b> {data.tournament.kFactor}</div>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>Leaderboard</h2>
          <ol style={{ marginTop: 8 }}>
            {data.leaderboard?.map((r: any) => (
              <li key={r.userId} style={{ marginBottom: 6 }}>
                {r.email} — {r.points.toFixed(2)} pts
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
