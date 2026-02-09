"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  minutes?: number;      // по умолчанию 30
  percent?: number;      // по умолчанию 170
  storageKey?: string;   // чтобы можно было менять кампании
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function DepositBoostToast({
  minutes = 30,
  percent = 170,
  storageKey = "beavbet_deposit_boost_v1",
}: Props) {
  const ttlMs = minutes * 60 * 1000;

  const [hidden, setHidden] = useState(true);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Загружаем/инициализируем кампанию
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { endAt: number; dismissed?: boolean };
        if (parsed.dismissed) {
          setHidden(true);
          return;
        }
        setEndAt(parsed.endAt);
        setHidden(false);
        return;
      }

      const newEndAt = Date.now() + ttlMs;
      localStorage.setItem(storageKey, JSON.stringify({ endAt: newEndAt, dismissed: false }));
      setEndAt(newEndAt);
      setHidden(false);
    } catch {
      // если localStorage недоступен — просто покажем на текущую сессию
      setEndAt(Date.now() + ttlMs);
      setHidden(false);
    }
  }, [storageKey, ttlMs]);

  // Тик таймера
  useEffect(() => {
    if (hidden || !endAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [hidden, endAt]);

  const remainingMs = useMemo(() => {
    if (!endAt) return 0;
    return Math.max(0, endAt - now);
  }, [endAt, now]);

  const remainingSec = Math.floor(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;

  // Автоскрытие по окончанию
  useEffect(() => {
    if (!endAt) return;
    if (remainingMs <= 0 && !hidden) {
      setHidden(true);
    }
  }, [remainingMs, endAt, hidden]);

  const dismiss = () => {
    setHidden(true);
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...parsed, dismissed: true }));
    } catch {}
  };

  if (hidden || !endAt || remainingMs <= 0) return null;

  return (
    <div
      className="
        fixed z-[60]
        bottom-3 right-3
        max-sm:left-3 max-sm:right-3
      "
    >
      <div
        className="
          flex items-center justify-between gap-3
          rounded-2xl px-4 py-3
          border border-white/10
          bg-gradient-to-r from-sky-600/40 via-sky-500/30 to-sky-400/20
          backdrop-blur
          shadow-lg
        "
      >
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-white">
            Буст депозита 🔥 <span className="text-white/90">{percent}%</span>
          </div>

          <div className="text-sm font-semibold text-white/90 tabular-nums">
            {pad2(mm)}:{pad2(ss)}
          </div>
        </div>

        <button
          onClick={dismiss}
          className="
            h-8 w-8 rounded-xl
            grid place-items-center
            text-white/70 hover:text-white
            hover:bg-white/10
          "
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
