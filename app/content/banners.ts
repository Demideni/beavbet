export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  note?: string;
  cta: string;
  href: string;
  art: string; // image path
};

export const banners: Banner[] = [
  {
    id: "welcome",
    title: "ВЕЛКАМ БОНУС",
    subtitle: "ДО 590%",
    note: "+225 Фриспинов",
    cta: "Зарегистрируйся",
    href: "/bonuses",
    art: "/banners/hero-1.webp",
  },
  {
    id: "tournament",
    title: "🚀 24H TOURNAMENT RACE",
    subtitle: "Ежедневные призы до $5000",
    note: "Только сегодня",
    cta: "ENTER",
    href: "/tournaments",
    art: "/banners/hero-2.webp",
  },
  {
    id: "crypto",
    title: "CRYPTO DEPOSITS",
    subtitle: "BTC • ETH • USDT",
    note: "Пополнение за минуту",
    cta: "Пополнить",
    href: "/payments",
    art: "/banners/hero-3.webp",
  },
];
