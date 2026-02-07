"use client";

import { useEffect } from "react";

export default function RobinsonPage() {
  useEffect(() => {
    // Fullscreen game page: prevent the site from scrolling under the iframe
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Мост казино → игра
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
    // Cover header/footer/bottom nav to make the game truly full-screen on mobile
    <div className="fixed inset-0 z-[9999] bg-[#050509] overflow-hidden">
      <iframe
        src="/games/lego-candy-slots/index.html"
        className="h-full w-full border-0 block"
        allow="autoplay; clipboard-write"
      />
    </div>
  );
}
