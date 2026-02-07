import { HeroCarousel } from "@/app/components/HeroCarousel";
import { PromoTiles } from "@/app/components/PromoTiles";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <HeroCarousel />
      <PromoTiles />
    </div>
  );
}
