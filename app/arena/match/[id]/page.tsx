"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/components/utils/cn";

export default function ArenaMatchPage() {
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [match, setMatch] = useState<any>(null);
  const [busy, setBusy] = useState<"win" | "lose" | null>(null);

  async function load() {
    // reuse my-matches list and pick by id (fast MVP)
    const r = await fetch("/api/arena/my-matches", { cache: "no-store", credentials: "include" });
    const j = await r.json().catch(() => ({}));
    const found = (j?.matches ?? []).find((x: any) => x.id === id);
    setMatch(found || null);
  }

  useEffect(() => {
    if (id) load();
    // refresh every 5s while open
    const t = setInterval(() => load(), 5000);
    return () => clearInterval(t);
  }, [id]);

  async function report(result: "win" | "lose") {
    setBusy(result);
    const r = await fetch("/api/arena/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: id, result }),
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) {
      alert(j?.error || "Ошибка");
      return;
    }
    await load();
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-[980px] px-4 py-6 text-white/60">
        Матч не найден (или ты не участник).
        <div className="mt-4">
          <Link href="/arena/matches" className="px-4 py-2 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 text-sm text-white/85">
            Назад
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[980px] px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-extrabold">Match Room</div>
          <div className="mt-1 text-white/60 text-sm">
            {match.game} • {match.title} • Round {match.round}
          </div>
        </div>
        <Link href="/arena/matches" className="px-4 py-2 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 text-sm text-white/85">
          Мои матчи
        </Link>
      </div>

      <div className="mt-6 rounded-3xl bg-white/5 border border-white/10 p-5">
        <div className="text-white/85 font-semibold">
          {match.p1_nick || match.p1_user_id?.slice(0, 6)} vs {match.p2_nick || match.p2_user_id?.slice(0, 6)}
        </div>
        <div className="mt-1 text-white/60 text-sm">Entry: {match.entry_fee} {match.currency}</div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            disabled={busy !== null || match.status === "done"}
            onClick={() => report("win")}
            className={cn("py-3 rounded-2xl font-semibold", "btn-accent", busy === "win" && "opacity-70")}
          >
            I WON
          </button>
          <button
            disabled={busy !== null || match.status === "done"}
            onClick={() => report("lose")}
            className={cn(
              "py-3 rounded-2xl font-semibold",
              "bg-white/8 border border-white/10 hover:bg-white/10 text-white",
              busy === "lose" && "opacity-70"
            )}
          >
            I LOST
          </button>
        </div>

        <div className="mt-4 text-white/50 text-xs">
          Если оба игрока репортят одинаково (оба WIN/LOSE) — матч уйдёт в <b>Pending Review</b>.
        </div>
      </div>
    </div>
  );
}
