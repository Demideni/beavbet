"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setError(j?.error?.message || "Не удалось зарегистрироваться");
        setLoading(false);
        return;
      }
      router.replace(next);
    } catch {
      setError("Сеть/сервер недоступны");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Регистрация</h1>
          <p className="mt-1 text-xs text-slate-400">
            Создай аккаунт и пополняй баланс криптой.
          </p>
        </div>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/pulz-logo-dark.png" alt="Pulz" width={44} height={44} />
        </Link>
      </header>

      <main className="mx-auto max-w-md rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-[0_0_40px_rgba(59,130,246,0.12)] backdrop-blur">
        <div className="mb-4">
          <div className="text-sm font-medium text-slate-100">Новый игрок</div>
          <div className="text-[11px] text-slate-400">
            Минимум данных — максимум скорости.
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-[12px] text-red-200">
            {error}
          </div>
        )}

        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/60"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">Пароль</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/60"
              placeholder="минимум 6 символов"
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">Повтори пароль</span>
            <input
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/60"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600/90 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Создаём…" : "Создать аккаунт"}
          </button>
        </form>

        <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-blue-300 hover:text-blue-200">
            Войти
          </Link>
        </div>
      </main>
    </div>
  );
}
