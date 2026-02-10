"use client";

import { Globe, Search, Settings, MessageCircle, Gift } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import { cn } from "@/components/utils/cn";
import { useEffect, useState } from "react";

type MeUser = { id: string; email: string; nickname: string | null; currency?: string; balance?: number } | null;

export function Topbar() {
  const [user, setUser] = useState<MeUser>(null);

  async function fetchMe() {
    const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    setUser(j?.user ?? null);
  }

  useEffect(() => {
    fetchMe();

    const onRefresh = () => fetchMe();
    window.addEventListener("wallet:refresh", onRefresh);
    return () => window.removeEventListener("wallet:refresh", onRefresh);
  }, []);

  const initials = user?.nickname?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase();
  const balanceText = user?.balance != null ? `${user.balance.toFixed(2)} ${user.currency || "EUR"}` : null;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/70 border-b border-white/5">
      <div className="h-16 px-4 lg:px-6 flex items-center gap-3">
        <Logo />

        {/* Mobile: square бонусы icon like in the reference */}
        <Link
          href="/bonuses"
          className="md:hidden inline-flex items-center justify-center size-11 rounded-2xl icon-pill text-white/85"
          aria-label="Бонусы"
        >
          <Gift className="size-5" />
        </Link>

        {/* Desktop: бонусы + search */}
        <button className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl icon-pill text-sm text-white/80 hover:text-white">
          <span className="text-base">🎁</span>
          Бонусы
        </button>

        <div className="hidden md:flex flex-1 items-center">
          <div className="w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/45" />
            <input
              placeholder="Поиск игр"
              className={cn(
                "w-full pl-10 pr-3 py-2.5 rounded-xl",
                "bg-white/5 border border-white/10",
                "outline-none focus:border-white/20 focus:bg-white/7",
                "text-sm text-white/85 placeholder:text-white/35"
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <div className="flex items-center gap-2">
              {balanceText ? (
                <Link
                  href="/payments"
                  className="inline-flex items-center px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/85 hover:bg-white/8"
                  aria-label="Баланс"
                >
                  {balanceText}
                </Link>
              ) : null}
              <Link
                href="/account"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/8 border border-white/10 text-sm hover:bg-white/10"
                aria-label="Профиль"
              >
              <span className="size-8 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-semibold">
                {initials}
              </span>
              <span className="hidden sm:block">Кабинет</span>
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/auth?tab=login"
                className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 text-sm hover:bg-white/10"
              >
                Войти
              </Link>
              <Link
                href="/auth?tab=register"
                className="px-4 py-2 rounded-2xl btn-accent text-sm font-semibold"
              >
                Регистрация
              </Link>
            </>
          )}

          <button className="hidden md:inline-flex items-center justify-center size-10 rounded-xl bg-white/6 border border-white/10 hover:bg-white/8">
            <Globe className="size-4" />
          </button>
          <button className="hidden md:inline-flex items-center justify-center size-10 rounded-xl bg-white/6 border border-white/10 hover:bg-white/8">
            <Settings className="size-4" />
          </button>
          <button className="inline-flex items-center justify-center size-10 rounded-xl bg-white/6 border border-white/10 hover:bg-white/8">
            <MessageCircle className="size-4" />
          </button>
        </div>
      </div>

      {/* subtle progress line like in the reference header */}
      <div className="h-[2px] bg-white/5">
        <div className="h-full w-[18%] bg-white/35" />
      </div>
    </header>
  );
}
