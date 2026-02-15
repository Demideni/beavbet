"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/components/utils/cn";

type T = {
  id: string;
  title: string;
  game: string;
  teamSize: number;
  entryFee: number;
  currency: string;
  maxPlayers: number;
  players: number;
  status: "open" | "live" | "finished";
};

export default function ArenaClient() {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/arena/tournaments", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    setItems(j?.tournaments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function join(tournamentId: string) {
    setBusy(tournamentId);
    const r = await fetch("/api/arena/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId }),
      credentials: "include",
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) {
      alert(j?.error || "Ошибка");
      return;
    }
    // refresh wallet chip + list
    window.dispatchEvent(new Event("wallet:refresh"));
    await load();
  }

  return (
    <div className="mx-auto max-w-[980px] px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-white text-3xl font-extrabold">Beav<span className="text-accent">Bet</span> Arena</div>
          <div className="mt-1 text-white/60 text-sm">Турниры с entry fee → призовой фонд → выплаты топ-N</div>
        </div>
        <Link
          href="/arena/matches"
          className="px-4 py-2 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 text-sm text-white/85"
        >
          Мои матчи
        </Link>
      </div>

      <div className="mt-6 grid gap-3">
        {loading ? (
          <div className="text-white/60">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="text-white/60">Нет турниров</div>
        ) : (
          items.map((t) => {
            const pct = Math.round((t.players / t.maxPlayers) * 100);
            const isOpen = t.status === "open";
            return (
              <div key={t.id} className="rounded-3xl bg-white/5 border border-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold text-lg">
                      {t.game} • {t.title}
                    </div>
                    <div className="mt-1 text-white/60 text-sm">
                      Entry: <span className="text-white/85 font-semibold">{t.entryFee} {t.currency}</span> • Players: {t.players}/{t.maxPlayers}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/arena/${t.id}`}
                      className="px-4 py-2 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 text-sm text-white/85"
                    >
                      Открыть
                    </Link>
                    <button
                      disabled={!isOpen || busy === t.id}
                      onClick={() => join(t.id)}
                      className={cn(
                        "px-4 py-2 rounded-2xl text-sm font-semibold",
                        isOpen ? "btn-accent" : "bg-white/10 text-white/40",
                        busy === t.id && "opacity-70"
                      )}
                    >
                      {isOpen ? (busy === t.id ? "…" : "JOIN") : t.status.toUpperCase()}
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
