"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/utils/cn";
import {
  Menu,
  Trophy,
  Dice5,
  CircleDot,
  Crosshair,
} from "lucide-react";

const items: Array<{
  href: string;
  label: string;
  icon?: any;
  pngIcon?: string;
}> = [
  { href: "/", label: "Меню", icon: Menu },
  { href: "/casino", label: "Казино", icon: Dice5 },
  // Arena between Casino and Sport
  { href: "/arena", label: "Arena", pngIcon: "/icons/tab-arena.png" },
  { href: "/sport", label: "Спорт", icon: CircleDot },
  { href: "/tournaments", label: "Турниры", icon: Trophy },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[720px]">
        <div className="mx-3 mb-3 rounded-3xl bg-bg/80 backdrop-blur-md border border-white/10 shadow-soft">
          <div className="grid grid-cols-5">
            {items.map((it) => {
              const active = pathname === it.href;
              const Icon = it.icon ?? Crosshair;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "py-3 flex flex-col items-center justify-center gap-1",
                    active ? "text-white" : "text-white/60"
                  )}
                >
                  {it.pngIcon ? (
                    <Image
                      src={it.pngIcon}
                      alt={it.label}
                      width={20}
                      height={20}
                      className={cn(
                        "opacity-90",
                        active ? "opacity-100" : "opacity-80"
                      )}
                    />
                  ) : (
                    <Icon className={cn("size-5", active ? "text-accent" : "text-white/70")} />
                  )}
                  <div className="text-[11px] leading-none">
                    {it.label}
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
