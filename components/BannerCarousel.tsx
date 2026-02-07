"use client";

import Image from "next/image";
import Link from "next/link";

export default function BannerCarousel() {
  return (
    <section className="w-full overflow-hidden rounded-3xl card-glass gradient-hero">
      <div className="relative min-h-[520px] md:min-h-[360px] lg:min-h-[420px]">
        {/* progress bar (mobile) */}
        <div className="absolute top-0 left-0 right-0 z-20 md:hidden px-5 pt-3">
          <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-[28%] bg-white/70 rounded-full" />
          </div>
        </div>

        {/* content */}
        <div className="relative z-10 p-5 md:p-6 lg:p-10 flex flex-col gap-6 lg:gap-8 min-h-[520px] md:min-h-[360px] lg:min-h-[420px]">
          <div className="max-w-[520px] md:text-left text-center mt-8 md:mt-0">
            <div className="text-accent font-extrabold tracking-tight text-4xl md:text-5xl">
              ВЕЛКАМ БОНУС
            </div>
            <div className="mt-2 text-white font-extrabold tracking-tight text-5xl md:text-6xl">
              ДО 590%
            </div>
            <div className="mt-2 text-white/70 text-lg md:text-xl">+225 Фриспинов</div>

            <div className="mt-6">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl btn-accent font-semibold w-full sm:w-auto"
              >
                Зарегистрируйся и играй
              </Link>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 sm:mt-0">
              {["G","🐺","✈️","💎","🛡️"].map((x, i) => (
                <div key={i} className="size-11 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center text-white/80">
                  {x}
                </div>
              ))}
            </div>
          </div>

          {/* image on right */}
          <div className="absolute right-0 bottom-0 top-0 w-[55%] hidden md:block">
            <Image
              src="/banners/hero_robinson.png"
              alt="Hero"
              fill
              className="object-cover object-right"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-bg" />
          </div>

          {/* mobile image */}
          <div className="absolute left-0 right-0 top-0 h-[58%] md:hidden">
            <Image
              src="/banners/hero_robinson.png"
              alt="Hero"
              fill
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
          </div>
        </div>
      </div>
    </section>
  );
}
