"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  amountCents: number;
  currency: string;
  destination: string;
  status: string;
  note?: string | null;
  createdAt: string;
  affiliate: { id: string; code: string; userId: string };
};

function fmtUsd(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AdminAffiliatePayoutsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const res = await fetch("/api/admin/aff-payouts", { cache: "no-store" });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) {
      setMsg(j?.error?.message || "Нет доступа");
      setRows([]);
      return;
    }
    setRows(j.data.rows || []);
  }

  async function setStatus(id: string, status: string) {
    setMsg(null);
    const res = await fetch("/api/admin/aff-payouts/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) {
      setMsg(j?.error?.message || "Ошибка обновления");
      return;
    }
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4">
          <Link href="/account" className="text-sm text-slate-400 hover:text-slate-200">
            ← Назад
          </Link>
        </div>

        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Affiliate Payouts</h1>
            <div className="text-xs text-slate-500">Админка заявок на вывод</div>
          </div>
          {msg && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
              {msg}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-200">
                  <span className="font-semibold">{fmtUsd(r.amountCents)}</span>{" "}
                  <span className="text-slate-500">•</span>{" "}
                  <span className="text-slate-400">aff:</span>{" "}
                  <span className="font-mono">{r.affiliate.code}</span>{" "}
                  <span className="text-slate-500">•</span>{" "}
                  <span className="text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                </div>

                <div className="text-xs font-semibold text-slate-100">
                  {r.status}
                </div>
              </div>

              <div className="mt-2 break-all rounded-xl border border-slate-800 bg-black/50 px-3 py-2 text-xs text-slate-300">
                {r.destination}
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <button
                  onClick={() => setStatus(r.id, "APPROVED")}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700"
                >
                  APPROVE
                </button>
                <button
                  onClick={() => setStatus(r.id, "PAID")}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700"
                >
                  MARK PAID
                </button>
                <button
                  onClick={() => setStatus(r.id, "REJECTED")}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700"
                >
                  REJECT
                </button>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="text-sm text-slate-500">Пока нет заявок.</div>
          )}
        </div>
      </main>
    </div>
  );
}
