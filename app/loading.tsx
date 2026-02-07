"use client";

import { useEffect, useMemo, useState } from "react";

export default function Loading() {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  // Полный boot — только 1 раз за вкладку
  const shouldShow = useMemo(() => {
    if (typeof window === "undefined") return false;
    const key = "pulz_boot_seen";
    const seen = sessionStorage.getItem(key);
    if (seen) return false;
    sessionStorage.setItem(key, "1");
    return true;
  }, []);

  useEffect(() => {
    // микро-задержка чтобы не мигало на быстрых загрузках
    const t0 = setTimeout(() => setPhase(1), 80);   // появление
    const t1 = setTimeout(() => setPhase(2), 420);  // "power on"
    const t2 = setTimeout(() => setPhase(3), 980);  // fade-out
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // На остальных переходах — только тонкий бар (без full-screen)
  if (!shouldShow) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#050509]">
        <div className="absolute left-0 top-0 h-[2px] w-full overflow-hidden bg-white/5">
          <div className="h-full w-1/3 animate-[pulzbar_0.75s_ease-in-out_infinite] bg-cyan-400/85" />
        </div>
        <style jsx global>{`
          @keyframes pulzbar {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(420%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center bg-[#050509] transition-opacity duration-300",
        phase === 3 ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      {/* фоновые glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/18 blur-3xl" />
        <div className="absolute bottom-[-90px] left-1/3 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute top-1/3 right-[-90px] h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      <div className="relative w-[340px]">
        {/* "питание включается": неоновая рамка */}
        <div
          className={[
            "relative overflow-hidden rounded-[28px] border bg-white/5 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_0_55px_rgba(34,211,238,0.08)]",
            phase >= 2 ? "border-cyan-400/35" : "border-white/10",
          ].join(" ")}
        >
          {/* scan line */}
          <div
            className={[
              "absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent blur-[1px]",
              phase >= 2 ? "animate-[scan_0.9s_ease-in-out_infinite]" : "opacity-0",
            ].join(" ")}
          />

          {/* внутренний контент */}
          <div className="relative px-6 pb-6 pt-7">
            {/* лего-челик */}
            <div className="flex justify-center">
              <img
                src="/lego-mascot-bust.png"
                alt=""
                draggable={false}
                className={[
                  "h-[108px] w-[108px] select-none object-contain transition-all duration-500",
                  // фазы анимации: сначала слегка выше и прозрачнее, потом "опускается" и становится ярче
                  phase >= 1 ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
                  phase >= 2 ? "drop-shadow-[0_0_18px_rgba(34,211,238,0.22)]" : "",
                ].join(" ")}
              />
            </div>

            {/* логотип */}
            <div className="mt-3 flex justify-center">
              <img
                src="/pulz-logo-light.png"
                alt="Pulz"
                draggable={false}
                className={[
                  "h-11 w-auto select-none transition-all duration-500",
                  phase >= 1 ? "opacity-100" : "opacity-0",
                ].join(" ")}
              />
            </div>

            {/* статус */}
            <div className="mt-4 flex items-center justify-between text-[10px] tracking-[0.32em] text-cyan-200/70">
              <span className={phase >= 2 ? "opacity-100" : "opacity-60"}>BOOT</span>
              <span className={phase >= 2 ? "opacity-100" : "opacity-60"}>SECURE</span>
              <span className={phase >= 2 ? "opacity-100" : "opacity-60"}>READY</span>
            </div>

            {/* прогресс */}
            <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={[
                  "h-full rounded-full bg-cyan-400/90 transition-all duration-[650ms] ease-out",
                  phase === 0 ? "w-[8%]" : "",
                  phase === 1 ? "w-[42%]" : "",
                  phase === 2 ? "w-[78%]" : "",
                  phase === 3 ? "w-[100%]" : "",
                ].join(" ")}
              />
            </div>

            {/* подпись */}
            <div className="mt-3 text-center text-xs text-white/60">
              <span className={phase >= 2 ? "text-cyan-100/80" : ""}>
                Подключаем неон…
              </span>
            </div>
          </div>

          {/* лёгкая внутренняя подсветка */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-cyan-400/10" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateX(-120%); opacity: 0.15; }
          50% { opacity: 0.55; }
          100% { transform: translateX(320%); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
