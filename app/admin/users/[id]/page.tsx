"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = { id: string; email: string; balanceCents: number; createdAt: string };
type Tx = { id: string; type: string; amountCents: number; createdAt: string; meta?: any };

function fmtUsd(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AdminUserDetail({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const [tx, setTx] = useState<Tx[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [amountUsd, setAmountUsd] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${params.id}`, { cache: "no-store" });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) {
      setMsg(j?.error?.message || "Нет доступа");
      setUser(null);
      setTx([]);
      return;
    }
    setUser(j.data.user);
    setTx(j.data.tx || []);
  }

  async function adjust() {
    setMsg(null);
    const v = Number(amountUsd);
    if (!Number.isFinite(v) || v === 0) {
      setMsg("Enter amount (USD), can be negative");
      return;
    }
    const res = await fetch(`/api/admin/users/${params.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsd: v, reason }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) {
      setMsg(j?.error?.message || "Adjust failed");
      return;
    }
    setAmountUsd("");
    setReason("");
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4">
          <Link href="/admin/users" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to users
          </Link>
        </div>

        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Admin</div>
            <h1 className="text-2xl font-semibold text-slate-100">User</h1>
          </div>
          {msg && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
              {msg}
            </div>
          )}
        </div>

        {user && (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            <div className="text-sm text-slate-200">
              <div><span className="text-slate-400">Email:</span> <span className="font-mono">{user.email}</span></div>
              <div className="mt-1"><span className="text-slate-400">Balance:</span> <span className="font-semibold">{fmtUsd(user.balanceCents)}</span></div>
              <div className="mt-1"><span className="text-slate-400">Created:</span> {new Date(user.createdAt).toLocaleString()}</div>
              <div className="mt-1"><span className="text-slate-400">ID:</span> <span className="font-mono text-xs">{user.id}</span></div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <input
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                placeholder="Amount USD (e.g. 50 or -25.5)"
                className="rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none"
              />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className="rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none md:col-span-2"
              />

              <button
                onClick={adjust}
                className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-100">Last transactions</h2>
          <div className="mt-3 space-y-2">
            {tx.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-200">{t.type}</div>
                  <div className="text-sm text-slate-100">{fmtUsd(t.amountCents)}</div>
                </div>
                <div className="mt-1 text-xs text-slate-500">{new Date(t.createdAt).toLocaleString()}</div>
                {t.meta ? (
                  <div className="mt-2 rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-xs text-slate-300">
                    {JSON.stringify(t.meta)}
                  </div>
                ) : null}
              </div>
            ))}
            {tx.length === 0 && <div className="text-sm text-slate-500">No transactions.</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
