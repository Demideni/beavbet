"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/utils/cn";
import {
  Menu,
  Trophy,
  Dice5,
  CircleDot,
  Crosshair,
  MessageCircle,
} from "lucide-react";

const items = [
  { href: "/", label: "Меню", icon: Menu },
  { href: "/casino", label: "Казино", icon: Dice5 },
  { href: "/sport", label: "Спорт", icon: CircleDot },
  { href: "/arena", label: "BeavBet", icon: Crosshair, special: "beavbet" },
  { href: "/tournaments", label: "Турниры", icon: Trophy },
  { href: "/community", label: "Чат", icon: MessageCircle },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[720px]">
        <div className="mx-3 mb-3 rounded-3xl bg-bg/80 backdrop-blur-md border border-white/10 shadow-soft">
          <div className="grid grid-cols-6">
            {items.map((it) => {
              const active = pathname === it.href;
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "py-3 flex flex-col items-center justify-center gap-1",
                    active ? "text-white" : "text-white/60"
                  )}
                >
                  <Icon className={cn("size-5", active ? "text-accent" : "text-white/70")} />
                  <div className="text-[11px] leading-none">
                    {it.special === "beavbet" ? (
                      <span>
                        <span className="text-accent">Beav</span>
                        <span className="text-white">Bet</span>
                      </span>
                    ) : (
                      it.label
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
