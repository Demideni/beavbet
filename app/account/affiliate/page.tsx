"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AffMe = { code: string; revshareBps: number };
type AffStats = {
  code: string;
  revshareBps: number;
  clicks: number;
  signups: number;
  earningsCents: number;
  lockedCents: number;
  availableCents: number;
};

function fmtUsd(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AffiliatePage() {
  const [me, setMe] = useState<AffMe | null>(null);
  const [stats, setStats] = useState<AffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refLink = useMemo(() => {
    if (!me?.code) return "";
    if (typeof window === "undefined") return `/?ref=${me.code}`;
    return `${window.location.origin}/?ref=${me.code}`;
  }, [me?.code]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const meRes = await fetch("/api/aff/me", { cache: "no-store" });
      const meJson = await meRes.json().catch(() => null);

      if (!meRes.ok || !meJson?.ok) {
        setMe(null);
        setStats(null);
        return;
      }

      const aff = meJson.data?.affiliate;
      if (!aff) {
        setMe(null);
        setStats(null);
        return;
      }

      setMe({ code: aff.code, revshareBps: aff.revshareBps });

      const stRes = await fetch("/api/aff/stats", { cache: "no-store" });
      const stJson = await stRes.json().catch(() => null);
      if (stRes.ok && stJson?.ok) setStats(stJson.data);
      else setStats(null);
    } finally {
      setLoading(false);
    }
  }

  async function createAffiliate() {
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/aff/me", { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setMsg(j?.error?.message || "Не удалось создать аффилейт");
        return;
      }
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(refLink);
      setMsg("Ссылка скопирована ✅");
      setTimeout(() => setMsg(null), 1500);
    } catch {
      setMsg("Не смог скопировать. Выдели и скопируй вручную.");
    }
  }

  async function requestPayout() {
    setMsg(null);
    const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);

    if (!dest.trim() || dest.trim().length < 6) {
      setMsg("Укажи адрес/кошелёк (минимум 6 символов).");
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setMsg("Укажи сумму (например 25.50).");
      return;
    }

    setPayoutBusy(true);
    try {
      const res = await fetch("/api/aff/payout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, destination: dest.trim() }),
      });
      const j = await res.json().catch(() => null);

      if (!res.ok || !j?.ok) {
        const m = j?.error?.message || "Ошибка вывода";
        const avail = j?.error?.details?.availableCents ?? j?.error?.details?.available;
        if (m === "INSUFFICIENT_AVAILABLE") {
          setMsg(`Недостаточно доступно. Доступно: ${fmtUsd(Number(avail || 0))}`);
        } else {
          setMsg(m);
        }
        return;
      }

      setMsg("Заявка на вывод создана ✅");
      setAmount("");
      setDest("");
      await load();
    } finally {
      setPayoutBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-4xl p-4 md:p-8">
        <div className="mb-4">
          <Link href="/account" className="text-sm text-slate-400 hover:text-slate-200">
            ← Назад в аккаунт
          </Link>
        </div>

        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Affiliate</h1>
            <div className="text-xs text-slate-500">
              Pulz • RevShare • вывод по заявке
            </div>
          </div>

          {msg && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
              {msg}
            </div>
          )}
        </div>

        {loading && <div className="text-sm text-slate-500">Загрузка…</div>}

        {!loading && !me && (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6">
            <p className="mb-4 text-sm text-slate-300">
              Создай аффилейт-аккаунт и получай процент с депозитов привлечённых игроков.
            </p>
            <button
              onClick={createAffiliate}
              disabled={creating}
              className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-700 disabled:opacity-50"
            >
              {creating ? "Создание…" : "Создать аффилейт-аккаунт"}
            </button>
          </div>
        )}

        {!loading && me && (
          <>
            {/* Referral link */}
            <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-100">Твоя реферальная ссылка</div>
                <button
                  onClick={copyLink}
                  className="rounded-lg border border-slate-800 bg-black px-3 py-1 text-xs font-semibold text-slate-200 hover:border-slate-700"
                >
                  Copy
                </button>
              </div>

              <div className="break-all rounded-xl border border-slate-800 bg-black/60 px-3 py-2 text-sm text-slate-200">
                {refLink}
              </div>

              <div className="mt-2 text-[11px] text-slate-500">
                RevShare: {(me.revshareBps / 100).toFixed(2)}%
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="text-[11px] text-slate-500">Клики</div>
                <div className="text-xl font-semibold text-slate-100">{stats?.clicks ?? 0}</div>
              </div>

              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="text-[11px] text-slate-500">Регистрации</div>
                <div className="text-xl font-semibold text-slate-100">{stats?.signups ?? 0}</div>
              </div>

              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="text-[11px] text-slate-500">Заработок</div>
                <div className="text-xl font-semibold text-slate-100">
                  {fmtUsd(stats?.earningsCents ?? 0)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Доступно: {fmtUsd(stats?.availableCents ?? 0)} • В обработке: {fmtUsd(stats?.lockedCents ?? 0)}
                </div>
              </div>
            </div>

            {/* Payout */}
            <div className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <div className="mb-2 text-sm font-medium text-slate-100">Вывести деньги</div>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Сумма, например 50.00"
                  className="rounded-xl border border-slate-800 bg-black/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
                <input
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  placeholder="Адрес / кошелёк / реквизиты"
                  className="md:col-span-2 rounded-xl border border-slate-800 bg-black/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-slate-600"
                />
              </div>

              <button
                onClick={requestPayout}
                disabled={payoutBusy}
                className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-700 disabled:opacity-50"
              >
                {payoutBusy ? "Отправка…" : "Запросить вывод"}
              </button>

              <div className="mt-2 text-[11px] text-slate-500">
                MVP: заявка создаётся со статусом PENDING. Дальше админ подтверждает и отмечает PAID.
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
