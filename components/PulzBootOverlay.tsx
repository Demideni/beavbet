"use client";

import { useEffect, useState } from "react";

export default function PulzBootOverlay() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    setMounted(true);

    const key = "pulz_boot_seen";
    const seen = sessionStorage.getItem(key);

    if (!seen) {
      sessionStorage.setItem(key, "1");
      setShow(true);
      setPhase(1);

      const t1 = setTimeout(() => setPhase(2), 1100);
      const t2 = setTimeout(() => setPhase(3), 1600);
      const t3 = setTimeout(() => setShow(false), 2000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, []);

  if (!mounted || !show) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center bg-[#050509] transition-opacity duration-300",
        phase === 3 ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      {/* PREMIUM BACKGROUND */}
      <div className="pointer-events-none absolute inset-0">
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.02),rgba(0,0,0,0.88)_65%,rgba(0,0,0,0.98)_100%)]" />

        {/* soft neon clouds */}
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/14 blur-3xl" />
        <div className="absolute bottom-[-260px] left-[20%] h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-3xl" />

        {/* noise */}
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay
          [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22140%22 height=%22140%22 filter=%22url(%23n)%22 opacity=%220.55%22/%3E%3C/svg%3E')]" />
      </div>

      {/* CENTER */}
      <div className="relative flex w-[300px] flex-col items-center">
        {/* LOGO */}
        <img
          src="/pulz-logo-dark.png"
          alt="Pulz"
          draggable={false}
          className={[
            "mb-10 h-16 w-auto select-none transition-all duration-500",
            phase >= 2
              ? "opacity-100 drop-shadow-[0_0_40px_rgba(34,211,238,0.45)]"
              : "opacity-80 drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]",
          ].join(" ")}
        />

        {/* NEON LOADING BAR */}
        <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-white/10">
          {/* glow */}
          <div className="absolute inset-0 rounded-full blur-md bg-cyan-400/40" />

          {/* progress */}
          <div
            className={[
              "relative h-full rounded-full bg-cyan-400 transition-all duration-[650ms] ease-out",
              phase === 1 ? "w-[32%]" : "",
              phase === 2 ? "w-[78%]" : "",
              phase === 3 ? "w-[100%]" : "",
            ].join(" ")}
          />

          {/* scan highlight */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-1/3 top-0 h-full w-1/3 animate-[scan_1.6s_ease-in-out_infinite]
              bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-60" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
}
