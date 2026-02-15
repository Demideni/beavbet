"use client";

import Link from "next/link";
import { Home, Dice5, Trophy, Gift, Wallet, BarChart3, Users, Shield, Crown, User, Crosshair } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/components/utils/cn";

const items = [
  { href: "/", icon: Home, label: "Главная" },
  { href: "/account", icon: User, label: "Кабинет" },
  { href: "/casino", icon: Dice5, label: "Казино" },
  { href: "/arena", icon: Crosshair, label: "Arena" },
  { href: "/tournaments", icon: Trophy, label: "Турниры" },
  { href: "/bonuses", icon: Gift, label: "Бонусы" },
  { href: "/payments", icon: Wallet, label: "Касса" },
  { href: "/vip", icon: Crown, label: "VIP" },
  { href: "/stats", icon: BarChart3, label: "Статистика" },
  { href: "/community", icon: Users, label: "Комьюнити" },
  { href: "/security", icon: Shield, label: "Безопасность" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[76px] lg:w-[88px] flex-col items-center gap-2 py-3 border-r border-white/5 bg-bg/40">
      <div className="h-1" />
      {items.map((it) => {
        const active = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            title={it.label}
            className={cn(
              "group relative w-[52px] lg:w-[58px] h-[44px] rounded-2xl",
              "flex items-center justify-center",
              "border border-transparent",
              active
                ? "bg-white/10 border-white/10"
                : "hover:bg-white/6 hover:border-white/10"
            )}
          >
            <Icon className={cn("size-5", active ? "text-accent" : "text-white/70 group-hover:text-white")} />
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
      <div className="flex-1" />
      <div className="mb-2 text-[10px] text-white/35">BeavBet</div>
    </aside>
  );
}
