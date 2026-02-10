import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";

export default async function AccountPage() {
  const session = await getSessionUser();
  // middleware already protects, but keep a safe fallback
  if (!session) {
    return (
      <div className="max-w-[720px] mx-auto card-glass rounded-3xl p-6">
        <div className="text-white text-lg font-semibold">Нужно войти</div>
        <Link className="mt-3 inline-flex px-4 py-2 rounded-2xl btn-accent" href="/auth?tab=login">
          Войти
        </Link>
      </div>
    );
  }

  const db = getDb();
  const profile = db
    .prepare("SELECT nickname, currency FROM profiles WHERE user_id = ?")
    .get(session.id) as { nickname?: string; currency?: string } | undefined;

  const nickname = profile?.nickname || session.email.split("@")[0];
  const currency = profile?.currency || "EUR";

  const wallet = db
    .prepare("SELECT balance FROM wallets WHERE user_id = ? AND currency = ?")
    .get(session.id, currency) as { balance: number } | undefined;
  const balance = wallet?.balance || 0;

  const bets = db
    .prepare(
      `SELECT id, created_at, status, stake, odds, potential_payout, home_team, away_team, market_key, outcome_name
       FROM bets
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .all(session.id) as Array<{
      id: string;
      created_at: number;
      status: string;
      stake: number;
      odds: number;
      potential_payout: number;
      home_team: string;
      away_team: string;
      market_key: string;
      outcome_name: string;
    }>;

  return (
    <div className="max-w-[980px] mx-auto">
      <div className="rounded-3xl card-glass p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-white text-2xl font-extrabold tracking-tight">Личный кабинет</div>
          <div className="mt-2 text-white/70">
            <span className="text-white/85 font-semibold">{nickname}</span>
            <span className="mx-2 text-white/25">•</span>
            {session.email}
            <span className="mx-2 text-white/25">•</span>
            Валюта: <span className="text-white/85">{currency}</span>
            <span className="mx-2 text-white/25">•</span>
            Баланс: <span className="text-white/85">{balance.toFixed(2)} {currency}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/account/settings" className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 text-sm hover:bg-white/10">
            Настройки
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/payments" className="rounded-3xl card-glass p-5 hover:bg-white/6 transition">
          <div className="text-white font-semibold text-lg">Касса</div>
          <div className="mt-1 text-white/55 text-sm">Пополнение, вывод, история</div>
        </Link>
        <Link href="/security" className="rounded-3xl card-glass p-5 hover:bg-white/6 transition">
          <div className="text-white font-semibold text-lg">Безопасность</div>
          <div className="mt-1 text-white/55 text-sm">2FA, пароль, сессии</div>
        </Link>
        <Link href="/vip" className="rounded-3xl card-glass p-5 hover:bg-white/6 transition">
          <div className="text-white font-semibold text-lg">VIP</div>
          <div className="mt-1 text-white/55 text-sm">Уровни, бонусы, кэшбэк</div>
        </Link>
        <Link href="/stats" className="rounded-3xl card-glass p-5 hover:bg-white/6 transition">
          <div className="text-white font-semibold text-lg">Статистика</div>
          <div className="mt-1 text-white/55 text-sm">Раунды, ставки, результаты</div>
        </Link>
        <Link href="/account/affiliate" className="rounded-3xl card-glass p-5 hover:bg-white/6 transition">
          <div className="text-white font-semibold text-lg">Афилка</div>
          <div className="mt-1 text-white/55 text-sm">Реф. ссылка, доход, вывод</div>
        </Link>
      </div>

      <div className="mt-6 rounded-3xl card-glass p-6">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold text-lg">История ставок</div>
          <Link href="/stats" className="text-sm text-white/60 hover:text-white/80">Все →</Link>
        </div>
        {bets.length === 0 ? (
          <div className="mt-3 text-white/55 text-sm">Пока ставок нет. Сделай ставку в разделе “Спорт”.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {bets.map((b) => (
              <div key={b.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white/85 font-semibold">
                    {b.home_team} <span className="text-white/35">vs</span> {b.away_team}
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-white/8 border border-white/10 text-white/70">
                    {b.status}
                  </div>
                </div>
                <div className="text-sm text-white/60">
                  {b.market_key.toUpperCase()} • {b.outcome_name} • odds {Number(b.odds).toFixed(2)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-white/70">Ставка: <span className="text-white/90 font-semibold">{Number(b.stake).toFixed(2)} {currency}</span></div>
                  <div className="text-white/70">Выплата: <span className="text-white/90 font-semibold">{Number(b.potential_payout).toFixed(2)} {currency}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
