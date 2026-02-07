"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Volatility = "low" | "medium" | "high";
type Category = "slot" | "crash" | "live" | "original";

type Game = {
  id: string;
  name: string;
  provider: string;
  rtp: number;
  volatility: Volatility;
  category: Category;
  isPulzOriginal?: boolean;
  isNew?: boolean;
  isHot?: boolean;
};

const GAMES: Game[] = [
  {
    id: "robinson",
    name: "ROBINSON",
    provider: "Pulz Originals",
    rtp: 97.2,
    volatility: "medium",
    category: "original",
    isPulzOriginal: true,
    isHot: true,
  },
  {
  id: "lego-candy-slots",
  name: "Lego Candy Slots",
  provider: "Pulz Originals",
  rtp: 96.5,
  volatility: "high",
  category: "slot",
  isPulzOriginal: true,
  isNew: true,
  isHot: true,
},
  {
    id: "sweet-lava-bonanza",
    name: "Sweet Lava Bonanza",
    provider: "Pulz Originals",
    rtp: 96.8,
    volatility: "high",
    category: "slot",
    isPulzOriginal: true,
    isNew: true,
  },
  {
    id: "pulz-crash",
    name: "Pulz Crash X",
    provider: "Pulz Originals",
    rtp: 97.0,
    volatility: "high",
    category: "crash",
    isPulzOriginal: true,
  },
  {
    id: "gates-of-olympus",
    name: "Gates of Olympus",
    provider: "Pragmatic Play",
    rtp: 96.5,
    volatility: "high",
    category: "slot",
  },
  {
    id: "sweet-bonanza",
    name: "Sweet Bonanza",
    provider: "Pragmatic Play",
    rtp: 96.5,
    volatility: "medium",
    category: "slot",
  },
  {
    id: "aviator",
    name: "Aviator",
    provider: "Spribe",
    rtp: 97.0,
    volatility: "high",
    category: "crash",
  },
  {
    id: "crazy-time",
    name: "Crazy Time",
    provider: "Evolution",
    rtp: 96.0,
    volatility: "medium",
    category: "live",
  },
];

const CATEGORY_FILTERS: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "Все игры" },
  { id: "original", label: "Pulz Originals" },
  { id: "slot", label: "Слоты" },
  { id: "crash", label: "Crash" },
  { id: "live", label: "Live" },
];

function formatVolatility(v: Volatility) {
  if (v === "low") return "Низкая";
  if (v === "medium") return "Средняя";
  return "Высокая";
}

export default function GamesPage() {
  const [category, setCategory] = useState<"all" | Category>("all");
  const [search, setSearch] = useState("");

  const filteredGames = useMemo(() => {
    return GAMES.filter((g) => {
      if (category !== "all" && g.category !== category) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.provider.toLowerCase().includes(q)
      );
    });
  }, [category, search]);

  return (
    <div className="px-4 pb-6 pt-4 space-y-4">
      {/* Шапка */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Игры Pulz</h1>
          <p className="mt-1 text-xs text-slate-400">
            Слоты, crash-игры и live-шоу в едином неоновом стиле. RobinzON и
            другие Pulz Originals скоро будут доступны.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="rounded-full border border-blue-500/50 bg-blue-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-blue-200">
          </span>
          <span></span>
        </div>
      </header>

      {/* Фильтры */}
      <section className="space-y-3">
        {/* Категории */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-[11px]">
          {CATEGORY_FILTERS.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as any)}
                className={`
                  whitespace-nowrap rounded-full border px-3 py-1.5 uppercase tracking-[0.18em]
                  ${
                    active
                      ? "border-blue-500/80 bg-blue-600 text-slate-50 shadow-[0_0_20px_rgba(37,99,235,0.9)]"
                      : "border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-blue-500/60 hover:bg-blue-500/5"
                  }
                `}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Поиск */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/90 px-3 py-2 text-sm text-slate-100">
          <span className="text-[13px] text-slate-500">🔍</span>
          <input
            type="text"
            placeholder="Поиск игры или провайдера..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </div>
      </section>

      {/* Сетка игр */}
      <section>
        {filteredGames.length === 0 ? (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 px-4 py-6 text-center text-sm text-slate-400">
            Ничего не найдено. Попробуй изменить фильтры или поиск.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const href = `/games/${game.id}`;
  // Пока что используем один арт RobinzON как заглушку
  const imageSrc = "/games/robinzon.png";

  return (
    <Link
      href={href}
      className="
        group relative flex flex-col overflow-hidden rounded-3xl
        border border-slate-800/80 bg-slate-950/80
        hover:border-blue-500/80 hover:bg-blue-500/5
        hover:shadow-[0_0_30px_rgba(37,99,235,0.7)]
        transition-all
      "
    >
      {/* Картинка */}
      <div className="relative h-24 w-full overflow-hidden rounded-2xl">
        <Image
          src={imageSrc}
          alt={game.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Теги вверху */}
        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1 text-[9px]">
          {game.isPulzOriginal && (
            <span className="rounded-full bg-blue-600/90 px-2 py-0.5 font-semibold text-slate-50 shadow-[0_0_10px_rgba(37,99,235,0.8)]">
              Pulz
            </span>
          )}
          {game.isNew && (
            <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 font-semibold text-slate-50">
              NEW
            </span>
          )}
          {game.isHot && (
            <span className="rounded-full bg-pink-600/90 px-2 py-0.5 font-semibold text-slate-50">
              HOT
            </span>
          )}
        </div>
      </div>

      {/* Текстовая часть */}
      <div className="space-y-1 px-2.5 pb-2 pt-2">
        <div className="text-[13px] font-semibold text-slate-50 line-clamp-1">
          {game.name}
        </div>
        <div className="text-[11px] text-slate-400 line-clamp-1">
          {game.provider}
        </div>

        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
          <span className="rounded-full bg-slate-900/80 px-2 py-0.5">
            RTP: {game.rtp.toFixed(1)}%
          </span>
          <span className="rounded-full bg-slate-900/80 px-2 py-0.5">
            Волатильность: {formatVolatility(game.volatility)}
          </span>
        </div>
      </div>

      {/* Невидимый градиент при наведении */}
      <div
        className="
          pointer-events-none absolute inset-0
          bg-gradient-to-t from-blue-500/20 via-transparent to-transparent
          opacity-0 transition-opacity duration-300
          group-hover:opacity-100
        "
      />
    </Link>
  );
}
