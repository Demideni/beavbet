"use client";

import Image from "next/image";
import Link from "next/link";
import { banners } from "@/app/content/banners";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/utils/cn";

export function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const total = banners.length;

  const safeIdx = useMemo(() => ((idx % total) + total) % total, [idx, total]);
  const b = banners[safeIdx];

  useEffect(() => {
    const t = setInterval(() => setIdx((v) => v + 1), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="w-full rounded-3xl overflow-hidden card-glass gradient-hero">
      <div className="relative min-h-[360px] lg:min-h-[420px]">
        {/* Background art */}
        <Image
          src={b.art}
          alt={b.title}
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/65 via-transparent to-transparent" />

        <div className="relative z-10 p-6 lg:p-10 flex flex-col gap-6 lg:gap-8 min-h-[360px] lg:min-h-[420px]">
          <div className="max-w-[520px]">
            <div className="text-accent font-extrabold tracking-tight text-4xl lg:text-5xl leading-none">
              {b.title}
            </div>
            <div className="mt-3 text-white font-extrabold tracking-tight text-4xl lg:text-6xl leading-none">
              {b.subtitle}
            </div>
            {b.note && (
              <div className="mt-2 text-white/65 text-lg">
                {b.note}
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <Link
                href={b.href}
                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl btn-accent font-semibold"
              >
                {b.cta}
              </Link>

              <div className="hidden sm:flex items-center gap-2">
                {["G", "🐾", "✈️", "🔷", "🛡️"].map((x, i) => (
                  <div
                    key={i}
                    className="w-11 h-10 rounded-2xl icon-pill flex items-center justify-center text-white/85"
                    title="icon"
                  >
                    {x}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              className="size-10 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/8 flex items-center justify-center"
              onClick={() => setIdx((v) => v - 1)}
              aria-label="Prev"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    i === safeIdx ? "w-10 bg-white/70" : "w-3 bg-white/25 hover:bg-white/40"
                  )}
                  onClick={() => setIdx(i)}
                  aria-label={`Go ${i + 1}`}
                />
              ))}
            </div>

            <button
              className="size-10 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/8 flex items-center justify-center"
              onClick={() => setIdx((v) => v + 1)}
              aria-label="Next"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
