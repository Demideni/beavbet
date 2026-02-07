"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const METHODS = [
  { id: "usdt", name: "USDT", code: "USDT", network: "TRC20 / ERC20", icon: "/crypto/usdt.png", tag: "Рекомендуем" },
  { id: "btc", name: "Bitcoin", code: "BTC", network: "Bitcoin", icon: "/crypto/btc.png" },
  { id: "eth", name: "Ethereum", code: "ETH", network: "ERC20", icon: "/crypto/eth.png" },
];

type Invoice = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  checkoutUrl?: string | null;
  createdAt?: string;
};

type Toast = null | { type: "success" | "error"; text: string };

export default function CashierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paid = searchParams.get("paid") === "1";
  const fail = searchParams.get("fail") === "1";

  const [amount, setAmount] = useState("50");
  const [currency, setCurrency] = useState("USDT");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  // paid/fail UX
  useEffect(() => {
    let t: any;

    const run = async () => {
      if (paid) {
        setToast({ type: "success", text: "Баланс пополнен ✅ Сейчас перекину в Робинзона…" });

        // дернём /api/me чтобы подтянуть новый баланс (если у тебя шапка/лейаут это использует)
        try {
          await fetch("/api/me", { credentials: "include" });
        } catch {}

        t = setTimeout(() => router.push("/games/robinson"), 2000);
      } else if (fail) {
        setToast({ type: "error", text: "Платёж отменён или не прошёл ❌ Попробуй ещё раз." });
      } else {
        setToast(null);
      }
    };

    run();
    return () => clearTimeout(t);
  }, [paid, fail, router]);

  async function createInvoice() {
    setError(null);
    setInvoice(null);
    setLoading(true);

    try {
      const r = await fetch("/api/payments/deposit/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountUsd: Number(amount), currency }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setError(j?.error?.message || "Не удалось создать инвойс");
        return;
      }

      const inv: Invoice | null = j?.data?.invoice ?? j?.invoice ?? null;
      if (!inv?.id) {
        setError("Инвойс создан, но ответ сервера некорректный");
        return;
      }

      setInvoice(inv);

      // If PassimPay returned hosted checkout URL — redirect user immediately.
      if (inv.checkoutUrl) {
        window.location.href = inv.checkoutUrl;
        return;
      }

      setError("Инвойс создан, но checkoutUrl не пришёл (проверь PassimPay ключ/PlatformId и логи сервера).");
    } catch {
      setError("Сеть/сервер недоступны");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-8 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Cashier</h1>
          <p className="mt-1 text-xs text-slate-400">Депозит криптой через PassimPay</p>
        </div>
        <Link href="/account" className="flex items-center gap-2">
          <Image src="/pulz-logo-dark.png" alt="Pulz" width={44} height={44} />
        </Link>
      </header>

      <main className="mx-auto max-w-md space-y-3">
        {toast && (
          <div
            className={
              "rounded-xl border px-3 py-2 text-[12px] " +
              (toast.type === "success"
                ? "border-emerald-400/30 bg-emerald-950/40 text-emerald-100"
                : "border-red-500/30 bg-red-950/40 text-red-200")
            }
          >
            {toast.text}
            {toast.type === "success" && (
              <button onClick={() => router.push("/games/robinson")} className="ml-2 underline underline-offset-2">
                Играть сейчас
              </button>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
          <div className="mb-2 text-sm font-medium text-slate-100">Сумма депозита (USD)</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/60"
            placeholder="50"
          />

          <div className="mt-3 text-[11px] text-slate-400">Валюта</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setCurrency(m.code)}
                className={
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left " +
                  (currency === m.code
                    ? "border-blue-500/60 bg-blue-600/15"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700")
                }
              >
                <Image src={m.icon} alt={m.code} width={22} height={22} />
                <div>
                  <div className="text-[12px] text-slate-100">{m.code}</div>
                  <div className="text-[10px] text-slate-500">{m.network}</div>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-[12px] text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={createInvoice}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-blue-600/90 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Создаём…" : "Создать инвойс"}
          </button>
        </div>

        {invoice && (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="text-sm font-medium text-slate-100">Инвойс создан</div>
            <div className="mt-2 text-[12px] text-slate-300">
              ID: <span className="text-slate-100">{invoice.id}</span>
            </div>
            <div className="mt-1 text-[12px] text-slate-300">
              Amount: <span className="text-slate-100">${(invoice.amountCents / 100).toFixed(2)}</span>
            </div>
            <div className="mt-1 text-[12px] text-slate-300">
              Currency: <span className="text-slate-100">{invoice.currency}</span>
            </div>
            {invoice.checkoutUrl && (
              <a
                href={invoice.checkoutUrl}
                className="mt-3 inline-block rounded-xl bg-blue-600/20 px-3 py-2 text-[12px] font-semibold text-blue-200"
              >
                Открыть оплату
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
