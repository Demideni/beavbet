"use client";

import Link from "next/link";

export default function TournamentsSheetContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Турниры</div>
          <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
            Активно 24/7
          </div>
        </div>

        {/* Banner (put your image here: /public/banners/tournaments/daily-sprint.png) */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/40">
          <div className="relative aspect-[16/9] w-full">
            {/* using <img> to avoid next/image config issues */}
            <img
              src="/banners/tournaments/daily-sprint.png"
              alt="Daily Sprint 24/7"
              className="h-full w-full object-cover"
              onError={(e) => {
                // fallback (hide broken image icon)
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-3">
              <div>
                <div className="text-sm font-semibold text-white">Daily Sprint 24/7</div>
                <div className="text-xs text-slate-200/90">Выбивай самый высокий множитель</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-200/90">Призовой фонд</div>
                <div className="text-sm font-semibold text-white">$5,000</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold text-slate-100">Правила</div>
          <div className="mt-2 space-y-2 text-sm text-slate-300">
            <div>
              Побеждает тот, кто выбьет <span className="font-semibold text-slate-100">самый высокий X</span> в полёте.
              Просто начинай раунд и старайся поймать максимальный множитель.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Мин. ставка</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">$1</div>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Призы</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">Top 50</div>
              </div>
            </div>
            <div>
              Призовой фонд <span className="font-semibold text-slate-100">$5,000</span> делится между
              <span className="font-semibold text-slate-100"> Top‑50</span> участниками по итогам рейтинга.
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            <Link
              href="/tournaments"
              className="rounded-2xl border border-slate-700/70 bg-slate-900/40 px-4 py-3 text-center text-sm text-slate-100 hover:bg-slate-900/55"
              onClick={onClose}
            >
              Открыть страницу турниров
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          onClick={onClose}
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
