"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Trophy, Spade, Volleyball, MessageCircle } from "lucide-react";

export function MobileBottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Меню", icon: Menu, isButton: true },
    { href: "/tournaments", label: "Соревно...", icon: Trophy },
    { href: "/casino", label: "Казино", icon: Spade },
    { href: "/sport", label: "Спорт", icon: Volleyball },
    { href: "/chat", label: "Чат", icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-auto max-w-[520px] px-3 pb-3">
        <div className="rounded-3xl bg-bg/80 backdrop-blur-md border border-white/10">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {items.map((it, i) => {
              const Icon = it.icon;
              const active = !it.isButton && pathname === it.href;

              const content = (
                <div className={`flex flex-col items-center gap-1 py-2 rounded-2xl ${active ? "bg-white/10" : ""}`}>
                  <Icon className={`size-5 ${active ? "text-accent" : "text-white/70"}`} />
                  <div className="text-[11px] text-white/70">{it.label}</div>
                </div>
              );

              if (it.isButton) {
                return <button key={i} onClick={onMenu}>{content}</button>;
              }

              return <Link key={i} href={it.href}>{content}</Link>;
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
