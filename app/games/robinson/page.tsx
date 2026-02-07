"use client";

import { useEffect } from "react";

export default function RobinsonPage() {
  useEffect(() => {
    // Prevent the site from scrolling under the iframe
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Bridge казино → игра
    (window as any).PULZ_GAME = {
      getBalance: async () => {
        const r = await fetch("/api/games/robinson/balance", { credentials: "include" });
        if (!r.ok) throw new Error("balance failed");
        const j = await r.json();
        if (!j?.ok) throw new Error(j?.error?.message || "balance failed");
        return (j.data.balanceCents as number) / 100;
      },

      placeBet: async (amount: number) => {
        const r = await fetch("/api/games/robinson/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount }),
        });
        if (!r.ok) throw new Error("start failed");
        const j = await r.json();
        if (!j?.ok) throw new Error(j?.error?.message || "start failed");
        return { balance: (j.data.balanceCents as number) / 100, roundId: j.data.roundId as string };
      },

      finishRound: async (payload: { roundId: string; multiplier: number; result: "won" | "lost" }) => {
        const r = await fetch("/api/games/robinson/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("finish failed");
        const j = await r.json();
        if (!j?.ok) throw new Error(j?.error?.message || "finish failed");
        return { balance: (j.data.balanceCents as number) / 100, win: (j.data.winCents as number) / 100 };
      },
    };

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    // Mobile: truly full-screen. Desktop: centered game with side panel.
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#050509]">
      <div className="h-full w-full lg:flex lg:items-stretch lg:justify-center lg:gap-6 lg:p-6">
        {/* GAME AREA */}
        <div className="h-full w-full lg:h-auto lg:w-auto lg:flex-1 lg:max-w-[1100px] lg:rounded-3xl lg:border lg:border-slate-800/70 lg:bg-black/30 lg:p-4">
          <div className="h-full w-full lg:flex lg:items-center lg:justify-center">
            <div className="h-full w-full lg:h-auto lg:aspect-[9/16] lg:max-h-[calc(100vh-96px)] lg:max-w-[560px] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-800/70 lg:bg-black">
              <iframe
                src="/games/robinson/index.html"
                className="h-full w-full border-0 block"
                allow="autoplay; clipboard-write"
              />
            </div>
          </div>
        </div>

        {/* DESKTOP SIDE PANEL */}
        <div className="hidden lg:flex lg:w-[360px] lg:flex-col lg:gap-4">
          <div className="rounded-3xl border border-slate-800/70 bg-black/30 p-4">
            <div className="text-xs text-slate-500">Robinson</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Desktop mode</div>
            <div className="mt-2 text-sm leading-relaxed text-slate-300">
              Game UI is inside the frame. Use mouse in-game. For the best view press{" "}
              <span className="font-semibold">F11</span>.
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/70 bg-black/30 p-4">
            <div className="text-sm font-semibold text-slate-100">Quick actions</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href="/cashier"
                className="rounded-2xl border border-slate-800 bg-black/40 px-3 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
              >
                Cashier
              </a>
              <a
                href="/tournaments"
                className="rounded-2xl border border-slate-800 bg-black/40 px-3 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
              >
                Tournaments
              </a>
              <a
                href="/menu"
                className="rounded-2xl border border-slate-800 bg-black/40 px-3 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
              >
                Menu
              </a>
              <a
                href="/status"
                className="rounded-2xl border border-slate-800 bg-black/40 px-3 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
              >
                Status
              </a>
            </div>
          </div>

          <div className="mt-auto rounded-3xl border border-slate-800/70 bg-black/30 p-4 text-xs text-slate-500">
            <div className="font-semibold text-slate-300">Tip</div>
            <div className="mt-2 leading-relaxed">
              If the game looks too small — zoom browser to 100% and use fullscreen.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
