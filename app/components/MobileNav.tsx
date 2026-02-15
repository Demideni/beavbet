"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/utils/cn";

const items: Array<{
  href: string;
  label: string;
  pngIcon?: string;
}> = [
  { href: "/", label: "Главная", pngIcon: "/icons/nav/nav-home.png" },
  { href: "/casino", label: "Казино", pngIcon: "/icons/nav/nav-casino.png" },
  // Arena between Casino and Sport
  { href: "/arena", label: "Arena", pngIcon: "/icons/nav/nav-arena.png" },
  { href: "/sport", label: "Спорт", pngIcon: "/icons/nav/nav-sport.png" },
  { href: "/tournaments", label: "Турниры", pngIcon: "/icons/nav/nav-tournaments.png" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [bouncingHref, setBouncingHref] = useState<string | null>(null);

  const triggerBounce = (href: string) => {
    setBouncingHref(href);
    window.setTimeout(() => {
      setBouncingHref((cur) => (cur === href ? null : cur));
    }, 280);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[720px]">
        <div className="mx-3 mb-3 rounded-3xl bg-bg/80 backdrop-blur-md border border-white/10 shadow-soft">
          <div className="grid grid-cols-5">
            {items.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "py-3 flex flex-col items-center justify-center gap-1 select-none",
                    "transition-transform duration-150 active:scale-95",
                    bouncingHref === it.href && "tab-bounce",
                    active ? "text-white" : "text-white/60"
                  )}
                  onPointerDown={() => triggerBounce(it.href)}
                >
                  <Image
                    src={it.pngIcon ?? "/icons/nav/nav-home.png"}
                    alt={it.label}
                    width={22}
                    height={22}
                    className={cn(
                      "opacity-90",
                      active ? "opacity-100" : "opacity-75"
                    )}
                    priority={it.href === "/"}
                  />
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
