"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SportRow = {
  key: string;
  group: string;
  title: string;
  description?: string;
  active?: boolean;
};

export default function SportsHome() {
  const [query, setQuery] = useState("");
  const [sports, setSports] = useState<SportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/sb/sports", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load sports");
        if (live) {
          setSports((j?.data || []) as SportRow[]);
          setErr(null);
        }
      } catch (e: any) {
        if (live) setErr(e?.message || "Error");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = sports.filter((s) => s.active !== false);
    if (!q) return base;
    return base.filter((s) =>
      `${s.title} ${s.group} ${s.key}`.toLowerCase().includes(q)
    );
  }, [sports, query]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Спорт</h1>
        <Link
          href="/account"
          className="rounded-xl border border-slate-700/70 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/5"
        >
          Баланс / Аккаунт
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-700/70 bg-[#0b0f1a] p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск лиги (EPL, NBA, UFC...)"
          className="w-full rounded-xl bg-[#11141f] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>

      {loading && (
        <div className="text-sm text-slate-300">Загрузка спорта...</div>
      )}
      {err && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((s) => (
          <Link
            key={s.key}
            href={`/sports/${encodeURIComponent(s.key)}`}
            className="group rounded-2xl border border-slate-700/70 bg-[#0b0f1a] p-4 hover:bg-white/5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {s.title}
                </div>
                <div className="mt-1 text-xs text-slate-400">{s.group}</div>
              </div>
              <div className="text-xs font-semibold text-blue-300 group-hover:text-blue-200">
                Открыть →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && !err && filtered.length === 0 && (
        <div className="mt-6 text-sm text-slate-400">
          Ничего не нашли. Попробуй другое название.
        </div>
      )}
    </div>
  );
}
