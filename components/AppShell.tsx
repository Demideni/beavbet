"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FiMenu,
  FiGift,
  FiSearch,
  FiMessageCircle,
  FiAward,
  FiGrid,
  FiActivity,
  FiHelpCircle,
  FiUsers,
  FiStar,
  FiBarChart2,
  FiBox,
  FiBell,
  FiDollarSign,
  FiChevronRight,
  FiX,
} from "react-icons/fi";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function MobileBottomNav() {
  const pathname = usePathname();

  const items: NavItem[] = useMemo(
    () => [
      { href: "/menu", label: "Меню", icon: <FiMenu /> },
      { href: "/tournaments", label: "Соревно...", icon: <FiAward /> },
      { href: "/casino", label: "Казино", icon: <FiGrid /> },
      { href: "/sports", label: "Спорт", icon: <FiActivity /> },
      { href: "/chat", label: "Чат", icon: <FiMessageCircle /> },
    ],
    []
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-auto max-w-[520px] px-3 pb-3">
        <div className="rounded-2xl border border-white/10 bg-[#0b121a]/95 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
          <div className="flex items-stretch justify-between px-2 py-2">
            {items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className="relative flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] text-white/70"
                >
                  <span className={cn("text-[20px]", active && "text-white")}>{it.icon}</span>
                  <span className={cn(active && "text-white")}>{it.label}</span>
                  {active && (
                    <span className="absolute -top-[2px] left-3 right-3 h-[3px] rounded-full bg-gradient-to-r from-[#ff3b5c] via-[#ff2f7a] to-[#ff3b5c]" />
                  )}
                </Link>
              );
            })}
          </div>
          <div className="px-4 pb-3">
            <div className="mx-auto w-fit rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/70">
              betfury.io
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="sticky top-0 z-40 md:hidden">
      <div className="mx-auto max-w-[520px] px-3 pt-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b121a]/85 px-3 py-3 backdrop-blur">
          <button
            onClick={onMenu}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/90"
            aria-label="Открыть меню"
          >
            <FiMenu className="text-xl" />
          </button>

          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/5">
              <Image src="/brand/logo-mark.png" alt="BeavBet" fill className="object-contain p-1.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-white">BeavBet</div>
              <div className="text-[12px] text-white/60">Crypto Casino</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/bonuses"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/90"
              aria-label="Бонусы"
            >
              <FiGift className="text-xl" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/80"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-b from-[#ff3b5c] to-[#c9153b] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(255,59,92,0.35)]"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="sticky top-0 z-40 hidden md:block">
      <div className="mx-auto max-w-[1280px] px-4 pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b121a]/70 px-4 py-3 backdrop-blur">
          <button
            onClick={onMenu}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/90"
            aria-label="Меню"
          >
            <FiMenu className="text-xl" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/5">
              <Image src="/brand/logo-mark.png" alt="BeavBet" fill className="object-contain p-1.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-white">BeavBet</div>
              <div className="text-[12px] text-white/60">Crypto Casino</div>
            </div>
          </Link>

          <Link
            href="/bonuses"
            className="ml-2 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-white/80"
          >
            <FiGift />
            Бонусы
          </Link>

          <div className="ml-3 flex-1">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/70">
              <FiSearch className="text-lg" />
              <input
                placeholder="Search"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/80">
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-b from-[#ff3b5c] to-[#c9153b] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(255,59,92,0.35)]"
            >
              Регистрация
            </Link>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/80" aria-label="Настройки">
              ⚙️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeftRail() {
  const pathname = usePathname();
  const rail = [
    { href: "/casino", icon: <FiGrid />, label: "Казино" },
    { href: "/sports", icon: <FiActivity />, label: "Спорт" },
    { href: "/bonuses", icon: <FiGift />, label: "Бонусы" },
    { href: "/cashier", icon: <FiDollarSign />, label: "Касса" },
    { href: "/account", icon: <FiUsers />, label: "Аккаунт" },
  ];
  return (
    <div className="hidden md:flex">
      <div className="flex w-[64px] flex-col items-center gap-3 pt-28">
        {rail.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "group flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/65 transition",
                active && "bg-white/10 text-white"
              )}
              title={it.label}
            >
              <span className="text-xl">{it.icon}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const sections = useMemo(
    () => [
      {
        items: [
          { href: "/casino", label: "Казино", icon: <FiGrid /> },
          { href: "/sports", label: "Sports", icon: <FiActivity /> },
        ],
      },
      {
        items: [
          { href: "/crypto", label: "Крипта и заработок", icon: <FiDollarSign /> },
          { href: "/promos", label: "Акции", icon: <FiBell /> },
          { href: "/partners", label: "Привести друга", right: "$1500", icon: <FiUsers /> },
          { href: "/vip", label: "VIP Клуб", icon: <FiStar /> },
          { href: "/ranks", label: "Система рангов", icon: <FiBarChart2 /> },
          { href: "/lootboxes", label: "Криптобоксы", icon: <FiBox /> },
          { href: "/news", label: "Новости", icon: <FiBell /> },
          { href: "/support", label: "Поддержка", icon: <FiHelpCircle /> },
        ],
      },
    ],
    []
  );

  return (
    <div className={cn("fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[78%] max-w-[340px] transform rounded-r-2xl border-r border-white/10 bg-[#0b121a] transition-transform",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/5">
            <Image src="/brand/logo-mark.png" alt="BeavBet" fill className="object-contain p-1.5" />
          </div>
          <div className="text-white">
            <div className="text-sm font-semibold">BeavBet</div>
            <div className="text-xs text-white/60">Crypto Casino</div>
          </div>
          <button onClick={onClose} className="ml-auto rounded-xl bg-white/5 p-2 text-white/80" aria-label="Закрыть">
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-3">
            <Link href="/casino" className="flex w-full items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-white/85">
              <FiGrid className="text-lg" /> Казино
            </Link>
            <Link href="/sports" className="flex w-full items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-white/85">
              <FiActivity className="text-lg" /> Sports
            </Link>
          </div>
        </div>

        <div className="h-[1px] bg-white/10" />

        <div className="px-2 py-3">
          {sections.flatMap((sec, idx) => (
            <div key={idx} className="mb-3">
              {sec.items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-white/70 hover:bg-white/5",
                      active && "bg-white/5 text-white"
                    )}
                    onClick={onClose}
                  >
                    <span className="text-xl text-white/45">{it.icon}</span>
                    <span className="flex-1">{it.label}</span>
                    {it.right && <span className="text-sm font-semibold text-[#2fe56b]">{it.right}</span>}
                    <FiChevronRight className="text-lg text-white/25" />
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-auto px-4 pb-4">
          <div className="flex items-center justify-between text-xs text-white/40">
            <div className="flex gap-3">
              <span>G Pay</span>
              <span> Pay</span>
              <span>Mastercard</span>
              <span>VISA</span>
            </div>
          </div>
          <button className="mt-3 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white/85">
            Купить криптовалюту
          </button>
          <div className="mt-4 flex items-center justify-between text-xs text-white/35">
            <span>ПРИЛОЖЕНИЕ</span>
            <span>  🤖  🪟</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-white/35">НАСТРОЙКИ</span>
            <div className="flex items-center gap-2">
              <button className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70">🇷🇺</button>
              <button className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70">⚙️</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(56,98,255,0.18),transparent_55%),radial-gradient(900px_500px_at_90%_0%,rgba(255,52,99,0.18),transparent_55%),#050a12]">
      <DesktopTopBar onMenu={() => setDrawerOpen(true)} />
      <MobileTopBar onMenu={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="mx-auto max-w-[1280px] px-4">
        <div className="flex gap-4">
          <LeftRail />
          <main className="w-full pb-28 md:pb-10">{children}</main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
