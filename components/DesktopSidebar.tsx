"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const ITEMS = [
  { href: "/", icon: "/icons/menu.png", label: "Home" },
  { href: "/casino", icon: "/icons/games.png", label: "Casino" },
  { href: "/sports", icon: "/icons/games.png", label: "Sport" },
  { href: "/tournaments", icon: "/icons/promotions.png", label: "Tournaments" },
  { href: "/cashier", icon: "/icons/wallet.png", label: "Cashier" },
  { href: "/partners", icon: "/icons/promotions.png", label: "Partners" },
];

function activePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-[76px] lg:flex-col lg:items-center lg:gap-3 lg:py-4">
      <div className="w-full flex flex-col items-center gap-2">
        {ITEMS.map((it) => {
          const active = activePath(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "group relative flex size-11 items-center justify-center rounded-2xl border transition",
                active
                  ? "border-white/15 bg-white/10"
                  : "border-white/8 bg-white/5 hover:bg-white/8 hover:border-white/12",
              ].join(" ")}
              aria-label={it.label}
              title={it.label}
            >
              <Image src={it.icon} alt={it.label} width={22} height={22} className="opacity-80 group-hover:opacity-100" />
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-[rgb(var(--accent))]" />}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
