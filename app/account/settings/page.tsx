"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Me = {
  id: string;
  email: string;
  nickname: string | null;
  currency: string;
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await r.json();
      setMe(j.user);
      setNickname(j.user?.nickname || "");
      setCurrency(j.user?.currency || "EUR");
      setLoading(false);
    })();
  }, []);

  const canSave = useMemo(() => nickname.trim().length >= 2, [nickname]);

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto card-glass rounded-3xl p-6 text-white/70">Загрузка…</div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-extrabold tracking-tight">Настройки</div>
          <div className="mt-1 text-white/60 text-sm">Управляй профилем и безопасностью</div>
        </div>
        <Link href="/account" className="px-4 py-2 rounded-2xl bg-white/8 border border-white/10 text-sm hover:bg-white/10">
          ← Назад
        </Link>
      </div>

      {msg ? (
        <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 text-white/75 text-sm">{msg}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-3xl card-glass p-5">
          <div className="text-white font-semibold text-lg">Профиль</div>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <div className="text-white/55 text-xs mb-1">Email</div>
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/85">
                {me?.email}
              </div>
            </div>

            <label>
              <div className="text-white/55 text-xs mb-1">Никнейм</div>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
                placeholder="Например: BeaverBoss"
              />
            </label>

            <label>
              <div className="text-white/55 text-xs mb-1">Валюта</div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
              >
                {["USD", "EUR", "USDT", "BTC"].map((c) => (
                  <option key={c} value={c} className="bg-bg">
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <button
              disabled={!canSave}
              className="mt-2 w-full px-6 py-3 rounded-2xl btn-accent font-semibold disabled:opacity-50"
              onClick={async () => {
                setMsg(null);
                const r = await fetch("/api/account/profile", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ nickname: nickname.trim(), currency }),
                });
                const j = await r.json();
                if (!r.ok) {
                  setMsg("Не удалось сохранить настройки.");
                  return;
                }
                setMsg("Сохранено ✅");
                router.refresh();
              }}
            >
              Сохранить
            </button>
          </div>
        </section>

        <section className="rounded-3xl card-glass p-5">
          <div className="text-white font-semibold text-lg">Безопасность</div>
          <div className="mt-4 flex flex-col gap-3">
            <label>
              <div className="text-white/55 text-xs mb-1">Текущий пароль</div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
              />
            </label>
            <label>
              <div className="text-white/55 text-xs mb-1">Новый пароль</div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-white/20 text-white/85"
              />
            </label>
            <button
              className="mt-2 w-full px-6 py-3 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/10 font-semibold"
              onClick={async () => {
                setMsg(null);
                const r = await fetch("/api/account/password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ currentPassword, newPassword }),
                });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) {
                  setMsg(j?.error === "WRONG_PASSWORD" ? "Неверный текущий пароль" : "Не удалось сменить пароль");
                  return;
                }
                setCurrentPassword("");
                setNewPassword("");
                setMsg("Пароль обновлён ✅");
              }}
            >
              Сменить пароль
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
