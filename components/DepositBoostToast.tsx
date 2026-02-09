"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  minutes?: number;
  percent?: number;
  storageKey?: string;
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.dismissed) return;
        setEndAt(parsed.endAt);
        setHidden(false);
        return;
      }
      const e = Date.now() + ttlMs;
      localStorage.setItem(storageKey, JSON.stringify({ endAt: e }));
      setEndAt(e);
      setHidden(false);
    } catch {
      setEndAt(Date.now() + ttlMs);
      setHidden(false);
    }
  }, [storageKey, ttlMs]);

  useEffect(() => {
    if (hidden || !endAt) return;
    const id = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(id);
  }, [hidden, endAt]);

  const remainingMs = useMemo(
    () => (endAt ? Math.max(0, endAt - now) : 0),
    [endAt, now]
  );

  const sec = Math.floor(remainingMs / 1000);
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;

  if (hidden || remainingMs <= 0) return null;

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(
      storageKey,
      JSON.stringify({ endAt, dismissed: true })
    );
  };

return (
  <div
    className="
      fixed z-[60]
      right-2 sm:right-4          /* ⬅️ прижали к правому краю */
      bottom-[15vh]
      w-[78%] max-w-[380px]       /* ⬅️ компактная ширина */
    "
  >

   <div
  className="
    flex items-center justify-between gap-2
    rounded-xl
    px-3 py-2
    border border-blue-300/20
    bg-gradient-to-r from-blue-700/60 via-blue-600/50 to-blue-500/40
    backdrop-blur
    shadow-xl
  "
>

        <div className="flex items-center gap-3">
          {/* текст больше */}
          <div className="text-base font-semibold text-white">
            Буст депозита 🔥 {percent}%
          </div>

          {/* таймер больше */}
          <div className="text-base font-bold text-white/95 tabular-nums">
            {pad2(mm)}:{pad2(ss)}
          </div>
        </div>

        <button
          onClick={dismiss}
          className="
            h-7 w-7 rounded-lg
            grid place-items-center
            text-white/70 hover:text-white
            hover:bg-white/15
          "
        >
          ✕
        </button>
      </div>
    </div>
  );
}
