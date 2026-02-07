import BannerCarousel from "@/components/BannerCarousel";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="space-y-5">
      <div className="px-0 lg:px-0">
        <BannerCarousel />
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/casino" className="card-glass rounded-3xl overflow-hidden group">
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-extrabold">Казино</div>
              <div className="mt-1 text-white/55">
                Наслаждайтесь оригинальными играми и играми от топ провайдеров.
              </div>
            </div>
            <div className="relative size-24">
              <Image src="/ui/dice.png" alt="Casino" fill className="object-contain group-hover:scale-105 transition" />
            </div>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-[rgb(var(--accent))]/70 to-transparent" />
        </Link>

        <Link href="/sports" className="card-glass rounded-3xl overflow-hidden group">
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-extrabold">Спорт</div>
              <div className="mt-1 text-white/55">
                Делайте ставки на популярные события с высокими коэффициентами.
              </div>
            </div>
            <div className="relative size-24">
              <Image src="/ui/ball.png" alt="Sport" fill className="object-contain group-hover:scale-105 transition" />
            </div>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-sky-400/70 to-transparent" />
        </Link>
      </section>
    </div>
  );
}
