"use client";

import { Globe, Search, Settings, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/components/utils/cn";

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/70 border-b border-white/5">
      <div className="h-16 px-4 lg:px-6 flex items-center gap-4">
        <Logo />

        <button className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl icon-pill text-sm text-white/80 hover:text-white">
          <span className="text-base">🎁</span>
          Бонусы
        </button>

        <div className="flex-1 flex items-center">
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

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-sm hover:bg-white/10">
            Войти
          </button>
          <button className="px-4 py-2 rounded-xl btn-accent text-sm font-semibold">
            Регистрация
          </button>

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
    </header>
  );
}
