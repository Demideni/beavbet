"use client";

import { useEffect, useMemo, useState } from "react";

type Game = {
  uuid?: string;
  game_uuid?: string;
  id?: string;
  name?: string;
  title?: string;
  provider?: string;
  vendor?: string;
  image?: string;
  icon?: string;
  thumbnail?: string;
};

function getId(g: Game) {
  return g.game_uuid || g.uuid || g.id || "";
}

function getName(g: Game) {
  return g.name || g.title || "Game";
}

function getImg(g: Game) {
  return g.image || g.thumbnail || g.icon || "";
}

export default function CasinoClient() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/ga/games", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!j.ok) throw new Error(j.error || "Failed to load games");
        const list = j.data?.games || j.data?.data?.games || j.data?.data || j.data?.items || [];
        setGames(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return games;
    return games.filter((g) => (getName(g) || "").toLowerCase().includes(s) || (g.provider || g.vendor || "").toLowerCase().includes(s));
  }, [games, q]);

  async function openGame(g: Game) {
    const game_uuid = getId(g);
    if (!game_uuid) return;
    setLaunching(true);
    setError(null);

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(max-width: 768px)")?.matches ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

    try {
      const r = await fetch("/api/ga/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_uuid, is_mobile: isMobile }),
      });
      const j = await r.json();
      if (!j.ok) {
        if (r.status === 401) {
          window.location.href = "/auth";
          return;
        }
        throw new Error(j.error || "Init failed");
      }

      if (isMobile) {
        window.location.href = j.url;
      } else {
        setIframeUrl(j.url);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Казино</h1>
          <div className="text-sm text-white/50">
            Seamless-режим через iframe (тестовая валюта провайдера: <span className="font-semibold text-white/70">EUR</span>)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск игр"
            className="w-full sm:w-72 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          />
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-white/60">Загрузка игр…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((g) => {
            const id = getId(g);
            const name = getName(g);
            const img = getImg(g);
            return (
              <button
                key={id || name}
                onClick={() => openGame(g)}
                disabled={launching}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left hover:bg-white/10 disabled:opacity-60"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-black/20">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/30">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-white line-clamp-1">{name}</div>
                  <div className="text-xs text-white/40 line-clamp-1">{g.provider || g.vendor || ""}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Seamless overlay */}
      {iframeUrl && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0 p-2 sm:p-6">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
              <button
                onClick={() => setIframeUrl(null)}
                className="absolute right-3 top-3 z-10 rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm text-white hover:bg-black/70"
              >
                Закрыть
              </button>
              <iframe src={iframeUrl} className="h-full w-full" allow="fullscreen; autoplay" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
