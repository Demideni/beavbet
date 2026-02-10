"use client";

import { useEffect, useMemo, useState } from "react";

type Player = {
  id: string;
  email: string;
  created_at: number;
  total_balance: number;
  deposits_sum: number;
  last_bet_at: number | null;
};

type Withdrawal = {
  id: string;
  userId: string;
  email: string;
  amount: number;
  currency: string;
  method: string;
  details: string | null;
  status: string;
  adminNote: string | null;
  txid: string | null;
  createdAt: number;
  updatedAt: number;
};

type Affiliate = {
  userId: string;
  code: string;
  status: string;
  createdAt: number;
  email: string;
  clicks: number;
  players: number;
  earned: number;
  available: number;
};

const tabs = [
  { id: "players", label: "Игроки" },
  { id: "withdrawals", label: "Выводы" },
  { id: "affiliates", label: "Афилка" },
] as const;

export default function AdminPanel() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("players");

  return (
    <div className="rounded-3xl card-glass p-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-2xl border text-sm font-semibold transition ${
              tab === t.id
                ? "btn-accent"
                : "bg-white/8 border-white/10 hover:bg-white/10 text-white/85"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "players" ? <PlayersTab /> : null}
        {tab === "withdrawals" ? <WithdrawalsTab /> : null}
        {tab === "affiliates" ? <AffiliatesTab /> : null}
      </div>
    </div>
  );
}

function PlayersTab() {
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [currency, setCurrency] = useState<"USD" | "EUR" | "USDT" | "BTC">("EUR");
  const [amount, setAmount] = useState("100");
  const [reason, setReason] = useState("Manual adjust");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/admin/players?limit=50&q=${encodeURIComponent(q)}`, { cache: "no-store", credentials: "include" });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) {
      setError("Не удалось загрузить игроков");
      setLoading(false);
      return;
    }
    setPlayers(j.players || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adjust() {
    setMsg(null);
    setBusy(true);
    const num = Number(amount);
    if (!Number.isFinite(num) || num === 0) {
      setMsg("Сумма должна быть числом (не 0)");
      setBusy(false);
      return;
    }
    const r = await fetch("/api/admin/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, currency, amount: num, reason }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      setMsg("Ошибка начисления");
      setBusy(false);
      return;
    }
    setMsg("Готово ✅");
    setAmount("100");
    await load();
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по email"
            className="w-full md:w-[320px] px-4 py-2 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
          />
          <button onClick={load} className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 text-sm font-semibold">
            Найти
          </button>
        </div>
        <div className="text-white/55 text-sm">Всего в списке: {players.length}</div>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-white/55">
              <th className="text-left font-semibold py-2 pr-4">Email</th>
              <th className="text-left font-semibold py-2 pr-4">Баланс (сумма)</th>
              <th className="text-left font-semibold py-2 pr-4">Депозиты</th>
              <th className="text-left font-semibold py-2 pr-4">Last bet</th>
              <th className="text-left font-semibold py-2 pr-4">ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-4 text-white/60" colSpan={5}>Загрузка…</td></tr>
            ) : error ? (
              <tr><td className="py-4 text-white/60" colSpan={5}>{error}</td></tr>
            ) : players.map((p) => (
              <tr key={p.id} className="border-t border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setUserId(p.id)}>
                <td className="py-3 pr-4 text-white/85">{p.email}</td>
                <td className="py-3 pr-4 text-white/70">{Number(p.total_balance || 0).toFixed(2)}</td>
                <td className="py-3 pr-4 text-white/70">{Number(p.deposits_sum || 0).toFixed(2)}</td>
                <td className="py-3 pr-4 text-white/60">{p.last_bet_at ? new Date(p.last_bet_at).toLocaleString() : "—"}</td>
                <td className="py-3 pr-4 text-white/45 text-xs">{p.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-3xl bg-white/5 border border-white/10 p-5">
        <div className="text-white font-semibold">Начислить/списать баланс</div>
        <div className="mt-1 text-white/55 text-sm">Кликни игрока в таблице, чтобы подставить ID.</div>

        {msg ? <div className="mt-3 text-white/70 text-sm">{msg}</div> : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="md:col-span-2">
            <div className="text-white/55 text-xs mb-1">User ID</div>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
              placeholder="uuid"
            />
          </label>
          <label>
            <div className="text-white/55 text-xs mb-1">Валюта</div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
            >
              {(["USD", "EUR", "USDT", "BTC"] as const).map((c) => (
                <option key={c} value={c} className="bg-bg">{c}</option>
              ))}
            </select>
          </label>
          <label>
            <div className="text-white/55 text-xs mb-1">Сумма (+/-)</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
            />
          </label>
          <label className="md:col-span-3">
            <div className="text-white/55 text-xs mb-1">Причина</div>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
            />
          </label>
          <div className="flex items-end">
            <button
              disabled={busy}
              onClick={adjust}
              className="w-full px-6 py-3 rounded-2xl btn-accent font-semibold disabled:opacity-50"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawalsTab() {
  const [status, setStatus] = useState<"pending" | "approved" | "paid" | "rejected">("pending");
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [edit, setEdit] = useState<Withdrawal | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [txid, setTxid] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/admin/withdrawals?status=${status}&limit=80`, { cache: "no-store", credentials: "include" });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) {
      setError("Не удалось загрузить выводы");
      setLoading(false);
      return;
    }
    setItems(j.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function updateStatus(next: Withdrawal["status"]) {
    if (!edit) return;
    setBusy(true);
    const r = await fetch("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: edit.id, status: next, adminNote, txid }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      setBusy(false);
      return;
    }
    setEdit(null);
    await load();
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {(["pending", "approved", "paid", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-2xl border text-sm font-semibold ${
                status === s
                  ? "btn-accent"
                  : "bg-white/8 border-white/10 hover:bg-white/10 text-white/85"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button onClick={load} className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 text-sm font-semibold">
          Обновить
        </button>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-white/55">
              <th className="text-left font-semibold py-2 pr-4">Игрок</th>
              <th className="text-left font-semibold py-2 pr-4">Сумма</th>
              <th className="text-left font-semibold py-2 pr-4">Метод</th>
              <th className="text-left font-semibold py-2 pr-4">Реквизиты</th>
              <th className="text-left font-semibold py-2 pr-4">Создано</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-4 text-white/60" colSpan={5}>Загрузка…</td></tr>
            ) : error ? (
              <tr><td className="py-4 text-white/60" colSpan={5}>{error}</td></tr>
            ) : items.map((w) => (
              <tr key={w.id} className="border-t border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => { setEdit(w); setAdminNote(w.adminNote || ""); setTxid(w.txid || ""); }}>
                <td className="py-3 pr-4 text-white/85">{w.email}</td>
                <td className="py-3 pr-4 text-white/70">{Number(w.amount).toFixed(2)} {w.currency}</td>
                <td className="py-3 pr-4 text-white/70">{w.method}</td>
                <td className="py-3 pr-4 text-white/60">{w.details || "—"}</td>
                <td className="py-3 pr-4 text-white/60">{new Date(w.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[660px] rounded-3xl card-glass p-6">
            <div className="text-white text-lg font-semibold">Заявка на вывод</div>
            <div className="mt-1 text-white/60 text-sm">{edit.email} • {Number(edit.amount).toFixed(2)} {edit.currency}</div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label>
                <div className="text-white/55 text-xs mb-1">Admin note</div>
                <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85" />
              </label>
              <label>
                <div className="text-white/55 text-xs mb-1">TXID (если paid)</div>
                <input value={txid} onChange={(e) => setTxid(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
              <button onClick={() => setEdit(null)} className="px-5 py-3 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 font-semibold">
                Закрыть
              </button>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => updateStatus("approved")} className="px-5 py-3 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 font-semibold disabled:opacity-50">
                  Approve
                </button>
                <button disabled={busy} onClick={() => updateStatus("rejected")} className="px-5 py-3 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 font-semibold disabled:opacity-50">
                  Reject
                </button>
                <button disabled={busy} onClick={() => updateStatus("paid")} className="px-5 py-3 rounded-2xl btn-accent font-semibold disabled:opacity-50">
                  Mark Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AffiliatesTab() {
  const [items, setItems] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const r = await fetch(`/api/admin/affiliates?limit=120`, { cache: "no-store", credentials: "include" });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) {
      setError("Не удалось загрузить афилку");
      setLoading(false);
      return;
    }
    setItems(j.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-white/55 text-sm">Аффилейтов: {items.length}</div>
        <button onClick={load} className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 text-sm font-semibold">
          Обновить
        </button>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-white/55">
              <th className="text-left font-semibold py-2 pr-4">Email</th>
              <th className="text-left font-semibold py-2 pr-4">Code</th>
              <th className="text-left font-semibold py-2 pr-4">Clicks</th>
              <th className="text-left font-semibold py-2 pr-4">Players</th>
              <th className="text-left font-semibold py-2 pr-4">Earned</th>
              <th className="text-left font-semibold py-2 pr-4">Available</th>
              <th className="text-left font-semibold py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-4 text-white/60" colSpan={7}>Загрузка…</td></tr>
            ) : error ? (
              <tr><td className="py-4 text-white/60" colSpan={7}>{error}</td></tr>
            ) : items.map((a) => (
              <tr key={a.userId} className="border-t border-white/10">
                <td className="py-3 pr-4 text-white/85">{a.email}</td>
                <td className="py-3 pr-4 text-white/70 font-mono">{a.code}</td>
                <td className="py-3 pr-4 text-white/70">{a.clicks}</td>
                <td className="py-3 pr-4 text-white/70">{a.players}</td>
                <td className="py-3 pr-4 text-white/70">{Number(a.earned).toFixed(2)}</td>
                <td className="py-3 pr-4 text-[#1EF48E] font-extrabold">{Number(a.available).toFixed(2)}</td>
                <td className="py-3 pr-4 text-white/60">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
