"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const items = [
  { href: "/menu", label: "Меню", icon: "/icons/menu.png" },
  { href: "/tournaments", label: "Соревно...", icon: "/icons/promotions.png" },
  { href: "/casino", label: "Казино", icon: "/icons/games.png" },
  { href: "/sports", label: "Спорт", icon: "/icons/games.png" },
  { href: "/support", label: "Чат", icon: "/icons/menu.png" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="mx-auto max-w-[520px] px-3 pb-3 pb-safe">
        <div className="rounded-3xl bg-bg/80 backdrop-blur-md border border-white/10 shadow-soft">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <Link key={it.href} href={it.href} className="w-full">
                  <div className={["flex flex-col items-center justify-center gap-1 rounded-2xl py-2", active ? "bg-white/10" : "hover:bg-white/6"].join(" ")}>
                    <Image src={it.icon} alt={it.label} width={20} height={20} className={active ? "opacity-100" : "opacity-70"} />
                    <div className={["text-[11px]", active ? "text-white" : "text-white/55"].join(" ")}>{it.label}</div>
                    {active && <div className="h-1 w-8 rounded-full bg-[rgb(var(--accent))]/80 mt-0.5" />}
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
