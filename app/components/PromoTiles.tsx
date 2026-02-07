import Image from "next/image";
import Link from "next/link";

function Tile({
  title,
  desc,
  href,
  art,
}: {
  title: string;
  desc: string;
  href: string;
  art: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl card-glass p-6 lg:p-7 min-h-[150px] hover:translate-y-[-1px] transition"
    >
      <div className="relative z-10">
        <div className="text-2xl font-extrabold">{title}</div>
        <div className="mt-2 text-white/60 max-w-[420px]">{desc}</div>
      </div>

      <div className="absolute right-4 bottom-2 w-[160px] h-[160px] opacity-90 group-hover:opacity-100 transition">
        <Image src={art} alt={title} fill className="object-contain" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-white/5" />
    </Link>
  );
}

export function PromoTiles() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Tile
        title="Казино"
        desc="Наслаждайтесь оригинальными играми от BeavBet и другими играми от топ провайдеров."
        href="/casino"
        art="/tiles/dice.webp"
      />
      <Tile
        title="Спорт"
        desc="Делайте ставки на популярные спортивные события с высокими коэффициентами и другими функциями."
        href="/sport"
        art="/tiles/ball.webp"
      />
    </section>
  );
}
