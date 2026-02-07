"use client";

import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PRIZES = [
  "Бонус +10%",
  "Фриспины 20",
  "Кэшбек 5%",
  "x2 к первому депозиту",
  "Секретный подарок",
];

export default function FortuneWheelModal({ open, onClose }: Props) {
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  if (!open) return null;

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    const prize =
      PRIZES[Math.floor(Math.random() * PRIZES.length)];

    // имитация анимации вращения ~2.5 сек
    setTimeout(() => {
      setIsSpinning(false);
      setResult(prize);
    }, 2500);
  };

  const handleBackdropClick = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (e.target === e.currentTarget && !isSpinning) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-3xl border border-blue-900/70 bg-gradient-to-b from-[#12020a] via-black to-[#050509] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.9)]">
        {/* заголовок + кнопка закрытия */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              Pulz Wheel
            </div>
            <div className="text-[11px] text-slate-400">
              Первый спин для команды — бесплатно.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Закрыть
          </button>
        </div>

        {/* САМО КОЛЕСО (твой код) */}
        <div className="mb-4 flex flex-col items-center">
          <div className="relative h-52 w-52">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.6),transparent_60%),radial-gradient(circle_at_100%_100%,rgba(251,191,36,0.55),transparent_55%)] opacity-80 blur-sm" />
            <div className="absolute inset-[6px] rounded-full bg-gradient-to-b from-[#1b0208] via-black to-[#050509] ring-2 ring-blue-700/70" />
            <div
              className={`absolute inset-[16px] rounded-full border border-blue-500/80 bg-[conic-gradient(#fecaca_0deg,#fecaca_30deg,#fb923c_30deg,#fb923c_60deg,#fee2e2_60deg,#fee2e2_90deg,#f97373_90deg,#f97373_120deg,#fed7aa_120deg,#fed7aa_150deg,#fecaca_150deg,#fecaca_180deg,#fb923c_180deg,#fb923c_210deg,#fee2e2_210deg,#fee2e2_240deg,#f97373_240deg,#f97373_270deg,#fed7aa_270deg,#fed7aa_300deg,#fecaca_300deg,#fecaca_330deg,#fb923c_330deg,#fb923c_360deg)] ${
                isSpinning ? "animate-spin-slow" : ""
              }`}
            />
            <div className="absolute inset-[46px] rounded-full bg-slate-950/95" />
            <button
              type="button"
              onClick={handleSpin}
              className="absolute inset-[58px] flex items-center justify-center rounded-full bg-gradient-to-b from-blue-500 via-blue-400 to-amber-300 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow-[0_0_25px_rgba(59,130,246,0.9)] hover:brightness-110"
            >
              {isSpinning ? "Крутим..." : "Крутить"}
            </button>
            {/* Стрелка */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className="h-5 w-3 origin-bottom rounded-b-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
            </div>
          </div>
        </div>

        {/* Результат + оффер регистрации */}
        {result && (
          <div className="space-y-2 text-center text-sm">
            <div className="text-slate-100">Твой бонус: {result}</div>
            <div className="text-[12px] text-slate-400">
              Чтобы закрепить бонус, зарегистрируй демо-аккаунт Pulz.
            </div>
            <div className="mt-2 flex justify-center gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-600/80 px-4 py-1.5 text-xs text-slate-200 hover:bg-slate-800/80"
                onClick={onClose}
              >
                Позже
              </button>
              <button className="rounded-full bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-[0_0_20px_rgba(239,68,68,0.85)] hover:bg-blue-500">
                Регистрация
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
