"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ArenaMatchesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/arena/my-matches", { cache: "no-store", credentials: "include" });
    const j = await r.json().catch(() => ({}));
    setRows(j?.matches ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-[980px] px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-extrabold">Мои матчи</div>
          <div className="mt-1 text-white/60 text-sm">Если есть активный матч — заходи и репорть результат</div>
        </div>
        <Link href="/arena" className="px-4 py-2 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 text-sm text-white/85">
          Arena
        </Link>
      </div>

      <div className="mt-6 grid gap-3">
        {loading ? (
          <div className="text-white/60">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="text-white/60">Матчей пока нет</div>
        ) : (
          rows.map((m) => (
            <Link
              key={m.id}
              href={`/arena/match/${m.id}`}
              className="block rounded-3xl bg-white/5 border border-white/10 hover:bg-white/8 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-white/85 font-semibold">
                  {m.game} • {m.title} • Round {m.round}
                </div>
                <div className="text-white/45 text-sm">{m.status}</div>
              </div>
              <div className="mt-1 text-white/60 text-sm">
                {m.p1_nick || m.p1_user_id?.slice(0, 6)} vs {m.p2_nick || m.p2_user_id?.slice(0, 6)}
              </div>
              <div className="mt-2 text-white/45 text-xs">Entry: {m.entry_fee} {m.currency}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
