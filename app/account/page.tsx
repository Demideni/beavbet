"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Me = {
  id: string;
  email?: string | null;
  username?: string | null;
  balanceCents?: number;
};

type Tx = {
  id: string;
  type: string;
  amountCents: number;
  createdAt: string;
};

function fmtUsd(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AccountPage() {
  const [user, setUser] = useState<Me | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => {
    if (!user) return "Аккаунт";
    return user.username || user.email || "Аккаунт";
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      // 1) ME
      const meRes = await fetch("/api/me", { cache: "no-store" });
      if (meRes.ok) {
        const me = (await meRes.json()) as Me;
        setUser(me);
      } else {
        setUser(null);
      }

      // 2) Transactions
      const txRes = await fetch("/api/transactions", { cache: "no-store" });
      if (txRes.ok) {
        const data = await txRes.json();
        // поддержим оба формата: либо массив, либо { txs: [...] }
        const list: Tx[] = Array.isArray(data) ? data : data?.txs ?? [];
        setTxs(list);
      } else {
        setTxs([]);
      }
    } catch {
      setUser(null);
      setTxs([]);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    // если у тебя другой эндпоинт — поменяешь одну строку
    await fetch("/api/auth/logout", { method: "POST" });
    // обновим страницу/данные
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-slate-100">{title}</div>
            <div className="text-xs text-slate-500">
              {loading ? "Загрузка..." : user ? "Вы вошли" : "Вы не вошли"}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-500">Баланс</div>
            <div className="text-lg font-semibold text-slate-100">
              {fmtUsd(user?.balanceCents ?? 0)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="mb-2 text-sm font-medium text-slate-100">
              Управление
            </div>

            {user ? (
              <>
                <Link
                  href="/account/affiliate"
                  className="mt-3 block w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-center text-sm font-semibold text-slate-200 hover:border-slate-700"
                >
                  🤝 Affiliate
                </Link>

                <button
                  onClick={logout}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-700"
                >
                  Выйти
                </button>
              </>
            ) : (
              <div className="mt-2 text-[12px] text-slate-500">
                Войдите, чтобы увидеть кабинет.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="mb-2 text-sm font-medium text-slate-100">История</div>

            {txs.length === 0 ? (
              <div className="text-[12px] text-slate-500">Пока нет операций.</div>
            ) : (
              <div className="space-y-2">
                {txs.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2"
                  >
                    <div>
                      <div className="text-[12px] text-slate-200">{t.type}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold text-slate-100">
                      {t.type === "BET" ? "-" : "+"}
                      {fmtUsd(t.amountCents)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
