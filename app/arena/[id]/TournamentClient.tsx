"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/components/utils/cn";

export default function TournamentClient() {
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/arena/tournaments/${id}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    setData(j);
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function join() {
    setBusy(true);
    const r = await fetch("/api/arena/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: id }),
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      alert(j?.error || "Ошибка");
      return;
    }
    window.dispatchEvent(new Event("wallet:refresh"));
    await load();
  }

  const t = data?.tournament;
  const participants = data?.participants ?? [];
  const matches = data?.matches ?? [];

  if (!t) {
    return (
      <div className="mx-auto max-w-[980px] px-4 py-6 text-white/60">
        Загрузка…
      </div>
    );
  }

  const prizePool = Number((t.entryFee * t.maxPlayers * (1 - t.rake)).toFixed(2));

  return (
    <div className="mx-auto max-w-[980px] px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-extrabold">{t.game} • {t.title}</div>
          <div className="mt-1 text-white/60 text-sm">
            Entry: <span className="text-white/85 font-semibold">{t.entryFee} {t.currency}</span> • Prize pool: <span className="text-white/85 font-semibold">{prizePool} {t.currency}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/arena"
            className="px-4 py-2 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 text-sm text-white/85"
          >
            Назад
          </Link>
          <button
            disabled={t.status !== "open" || busy}
            onClick={join}
            className={cn(
              "px-4 py-2 rounded-2xl text-sm font-semibold",
              t.status === "open" ? "btn-accent" : "bg-white/10 text-white/40",
              busy && "opacity-70"
            )}
          >
            {t.status === "open" ? (busy ? "…" : "JOIN") : t.status.toUpperCase()}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
          <div className="text-white font-semibold">Участники</div>
          <div className="mt-3 space-y-2">
            {participants.length === 0 ? (
              <div className="text-white/60 text-sm">Пока никого</div>
            ) : (
              participants.map((p: any) => (
                <div key={p.user_id} className="flex items-center justify-between text-sm">
                  <div className="text-white/85">{p.nickname || p.user_id.slice(0, 6)}</div>
                  <div className="text-white/45">{p.status}</div>
                </div>
              ))
            )}
            <div className="pt-2 text-white/50 text-xs">{participants.length}/{t.maxPlayers} slots</div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
          <div className="text-white font-semibold">Сетка</div>
          <div className="mt-3 space-y-2">
            {matches.length === 0 ? (
              <div className="text-white/60 text-sm">Сетка появится когда турнир заполнится</div>
            ) : (
              matches.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/arena/match/${m.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/85">Round {m.round}: {m.p1_nick || m.p1_user_id.slice(0, 6)} vs {m.p2_nick || m.p2_user_id.slice(0, 6)}</div>
                    <div className="text-xs text-white/45">{m.status}</div>
                  </div>
                  {m.winner_user_id ? (
                    <div className="mt-1 text-xs text-white/60">Winner: {m.winner_nick || m.winner_user_id.slice(0, 6)}</div>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
