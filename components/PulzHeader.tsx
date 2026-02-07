"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV = [
  { href: "/", label: "Главная" },
  { href: "/games", label: "Игры" },
  { href: "/bonuses", label: "Бонусы" },
  { href: "/cashier", label: "Касса" },
  { href: "/status", label: "Статус" }
];

export default function PulzHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/pulz-logo-dark.png"
            alt="Pulz Casino"
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="hidden gap-4 text-xs sm:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "rounded-full px-3 py-1 transition " +
                  (active
                    ? "bg-pulzRed text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                    : "text-slate-300 hover:bg-white/5")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-slate-100 hover:bg-black/70 sm:inline">
            Войти
          </button>
          <button className="rounded-full bg-pulzRed px-3 py-1 text-xs font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.7)] hover:brightness-110">
            Регистрация
          </button>
        </div>
      </div>
    </header>
  );
}
