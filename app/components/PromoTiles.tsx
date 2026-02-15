import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

function Tile({
  title,
  desc,
  href,
  art,
  mobileBg,
}: {
  title: string;
  desc: string;
  href: string;
  art: string;
  mobileBg?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl card-glass p-5 lg:p-7 min-h-[150px] hover:translate-y-[-1px] transition min-w-[260px] md:min-w-0 snap-start"
    >
      {/* Mobile-only banner background */}
      {mobileBg ? (
        <div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url(${mobileBg})` }}
        />
      ) : null}

      {/* Subtle dark overlay for text readability on mobile */}
      {mobileBg ? <div className="absolute inset-0 bg-black/25 md:hidden" /> : null}

      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-extrabold">{title}</div>
          <ChevronRight className="size-5 text-white/55 group-hover:text-white/80 transition" />
        </div>
        {/* Keep description on desktop only (mobile: hide) */}
        {desc ? (
          <div className="mt-2 text-white/60 max-w-[420px] hidden md:block">
            {desc}
          </div>
        ) : null}
      </div>

      {/* Desktop art (mobile uses banner) */}
      <div className="absolute right-4 bottom-2 w-[160px] h-[160px] opacity-90 group-hover:opacity-100 transition hidden md:block">
        <Image src={art} alt={title} fill className="object-contain" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-white/5" />
    </Link>
  );
}

export function PromoTiles() {
  return (
    <section
      className={
        "flex gap-4 lg:gap-5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory " +
        "md:grid md:grid-cols-2 lg:grid-cols-2"
      }
    >
      <Tile
        title="Казино"
        desc=""
        href="/casino"
        // Use the branded tile artwork on desktop too (mobile already uses it as a background)
        art="/images/tiles/casino-tile-mobile.png"
        mobileBg="/images/tiles/casino-tile-mobile.png"
      />
      <Tile
        title="Arena"
        desc=""
        href="/arena"
        art="/images/tiles/arena-tile-mobile.png"
        mobileBg="/images/tiles/arena-tile-mobile.png"
      />
      <Tile
        title="Спорт"
        desc=""
        href="/sport"
        art="/images/tiles/sport-tile-mobile.png"
        mobileBg="/images/tiles/sport-tile-mobile.png"
      />
    </section>
  );
}
