"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Wallet = { currency: string; balance: number };
type Tx = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
};

function fmtMoney(amount: number) {
  // Keep BTC/crypto precision reasonable
  const abs = Math.abs(amount);
  if (abs > 0 && abs < 1) return amount.toFixed(6);
  if (abs >= 1000) return amount.toFixed(2);
  return amount.toFixed(2);
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [tx, setTx] = useState<Tx[]>([]);

  const [amount, setAmount] = useState("50");
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const r = await fetch("/api/account/wallet", { cache: "no-store", credentials: "include" });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      setError("Нужно войти, чтобы открыть кассу.");
      setLoading(false);
      return;
    }
    setWallets(j.wallets || []);
    setDefaultCurrency(j.defaultCurrency || "USD");
    setCurrency(j.defaultCurrency || "USD");
    setTx(j.transactions || []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const main = useMemo(() => {
    return wallets.find((w) => w.currency === currency) || null;
  }, [wallets, currency]);

    async function act(kind: "deposit" | "withdraw") {
    setMsg(null);
    setBusy(true);
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setMsg("Введите корректную сумму");
      setBusy(false);
      return;
    }

    if (kind === "deposit") {
      const r = await fetch(`/api/payments/passimpay/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: num, currency }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.url) {
        setMsg("Ошибка пополнения");
        setBusy(false);
        return;
      }
      // Redirect user to Passimpay payment page
      window.location.href = j.url;
      return;
    }

    const r = await fetch(`/api/account/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount: num, currency }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j?.error === "INSUFFICIENT" ? "Недостаточно средств" : "Ошибка операции");
      setBusy(false);
      return;
    }
    setMsg("Вывод выполнен ✅");
    await refresh();
    setBusy(false);
  }


  if (loading) {
    return (
      <div className="max-w-[980px] mx-auto card-glass rounded-3xl p-6 text-white/70">Загрузка…</div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[980px] mx-auto">
        <div className="rounded-3xl card-glass p-6">
          <div className="text-white text-xl font-semibold">Касса</div>
          <div className="mt-2 text-white/60">{error}</div>
          <div className="mt-4 flex gap-2">
            <Link href="/auth?tab=login" className="px-5 py-3 rounded-2xl btn-accent font-semibold">
              Войти
            </Link>
            <Link href="/" className="px-5 py-3 rounded-2xl bg-white/8 border border-white/10">
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-extrabold tracking-tight">Касса</div>
          <div className="mt-1 text-white/60 text-sm">Пополнение, вывод и история операций</div>
        </div>
        <Link href="/account" className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 text-sm hover:bg-white/10">
          ← Кабинет
        </Link>
      </div>

      {msg ? (
        <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 text-white/75 text-sm">{msg}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-3xl card-glass p-5">
          <div className="text-white font-semibold text-lg">Баланс</div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-white/55 text-xs">Выбранная валюта</div>
              <div className="mt-1 text-white text-3xl font-extrabold">{fmtMoney(main?.balance || 0)} {currency}</div>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
            >
              {wallets.map((w) => (
                <option key={w.currency} value={w.currency} className="bg-bg">
                  {w.currency}
                </option>
              ))}
              {["USD", "EUR", "USDT", "BTC"].filter((c) => !wallets.some((w) => w.currency === c)).map((c) => (
                <option key={c} value={c} className="bg-bg">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <div className="text-white/55 text-xs mb-1">Сумма</div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
                placeholder="50"
              />
            </label>
            <button
              disabled={busy}
              className="px-6 py-3 rounded-2xl btn-accent font-semibold disabled:opacity-50"
              onClick={() => act("deposit")}
            >
              Пополнить
            </button>
            <button
              disabled={busy}
              className="px-6 py-3 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 font-semibold disabled:opacity-50"
              onClick={() => act("withdraw")}
            >
              Вывести
            </button>

            <div className="col-span-2 mt-2 text-white/50 text-xs">
               <span className="text-white/70"></span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl card-glass p-5">
          <div className="text-white font-semibold text-lg">История операций</div>
          <div className="mt-4 space-y-2 max-h-[420px] overflow-auto pr-1">
            {tx.length === 0 ? (
              <div className="text-white/60 text-sm">Пока нет операций</div>
            ) : (
              tx.map((t) => (
                <div key={t.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-white/85 font-semibold">
                      {t.type === "deposit" ? "Пополнение" : t.type === "withdraw" ? "Вывод" : t.type}
                    </div>
                    <div className={`text-sm ${t.type === "withdraw" ? "text-white/80" : "text-white"}`}>
                      {t.type === "withdraw" ? "-" : "+"}{fmtMoney(t.amount)} {t.currency}
                    </div>
                  </div>
                  <div className="mt-1 text-white/50 text-xs">
                    {new Date(t.createdAt).toLocaleString()} • {t.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
