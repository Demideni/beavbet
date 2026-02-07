"use client";

import { useEffect } from "react";

export default function RobinsonDemoPage() {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Demo мост: "фейковый" баланс и ставки без API/логина
    let balance = 1000; // $1000 demo

    (window as any).PULZ_GAME = {
      getBalance: async () => balance,
      placeBet: async (amount: number) => {
        balance = Math.max(0, balance - Number(amount || 0));
        return { balance, roundId: "demo-" + Date.now() };
      },
      finishRound: async (payload: { roundId: string; multiplier: number; result: "won" | "lost" }) => {
        const mult = Number(payload?.multiplier || 0);
        if (payload?.result === "won") {
          // В демо просто начисляем "выигрыш" как ставка * (mult-1), если игра так считает — это норм
          // Если игра сама ведёт расчёты, этот код всё равно безопасный.
          const win = 0;
          balance = balance + win;
          return { balance, win };
        }
        return { balance, win: 0 };
      },
    };

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050509] overflow-hidden">
      <iframe
        src="/games/robinson/index.html?mode=demo"
        className="h-full w-full border-0 block"
        allow="autoplay; clipboard-write"
      />
    </div>
  );
}
