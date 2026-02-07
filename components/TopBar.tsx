"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type User = { id: string; email: string; balanceCents: number };

function fmtMoney(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function extractUser(payload: any): User | null {
  const u = payload?.data?.user ?? payload?.user ?? (payload?.ok ? payload?.user : null);
  if (!u?.id) return null;
  return u as User;
}

export default function TopBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        setUser(extractUser(json));
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-3 lg:px-6">
        {/* Left: burger + brand */}
        <div className="flex items-center gap-3">
          <button className="hidden lg:inline-flex size-11 items-center justify-center rounded-2xl icon-pill">
            <span className="text-white/80">☰</span>
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="size-10 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center">
              🦫
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="font-extrabold tracking-tight">BeavBet</div>
              <div className="text-xs text-white/55">Crypto Casino</div>
            </div>
          </Link>
        </div>

        {/* Center: бонусы + поиск (desktop) */}
        <div className="flex-1 flex items-center justify-center lg:justify-start gap-3">
          <button className="inline-flex md:hidden items-center justify-center size-11 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/8" aria-label="Бонусы">
            🎁
          </button>

          <button className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-2xl icon-pill text-sm text-white/80 hover:text-white">
            <span className="text-base">🎁</span>
            Бонусы
          </button>

          <div className="hidden md:block w-full max-w-md relative">
            <input
              className="w-full rounded-2xl bg-white/6 border border-white/10 px-4 py-2 text-sm text-white/80 placeholder:text-white/35 outline-none focus:border-white/20"
              placeholder="Search"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35">⌕</div>
          </div>
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/cashier" className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/8">
              <span className="text-white/60 text-sm">Баланс</span>
              <span className="font-semibold">{fmtMoney(user.balanceCents)}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 text-sm hover:bg-white/10"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-2xl btn-accent text-sm font-semibold"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
