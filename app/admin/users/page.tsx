"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type U = { id: string; email: string; balanceCents: number; createdAt: string };

function fmtUsd(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<U[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) {
      setMsg(j?.error?.message || "Нет доступа");
      setRows([]);
      return;
    }
    setRows((j.data.users || []) as U[]);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => (r.email || "").toLowerCase().includes(s) || (r.id || "").toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Admin</div>
            <h1 className="text-2xl font-semibold text-slate-100">Users</h1>
          </div>
          {msg && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
              {msg}
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email or id…"
            className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
          />
          <button
            onClick={load}
            className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-700"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-800/70 bg-black/30 px-4 py-3 text-xs font-semibold text-slate-300">
            <div className="col-span-6">Email</div>
            <div className="col-span-3">Balance</div>
            <div className="col-span-3">Created</div>
          </div>

          {filtered.map((u) => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="grid grid-cols-12 gap-2 border-b border-slate-800/50 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
            >
              <div className="col-span-6 truncate font-mono">{u.email}</div>
              <div className="col-span-3">{fmtUsd(u.balanceCents)}</div>
              <div className="col-span-3 text-xs text-slate-400">{new Date(u.createdAt).toLocaleString()}</div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500">No users.</div>
          )}
        </div>

        <div className="mt-3 text-xs text-slate-500">Showing up to 300 latest users.</div>
      </main>
    </div>
  );
}
