import type { ReactNode } from "react";

export default function PulzShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Премиум‑казино Pulz
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          {title.split("Pulz").map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>
                {part}
                <span className="text-pulzRed">Pulz</span>
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-sm text-slate-300">{subtitle}</p>
        )}
      </header>
      <div className="rounded-3xl border border-white/10 bg-black/60 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl p-4 sm:p-6">
        {children}
      </div>
    </section>
  );
}
