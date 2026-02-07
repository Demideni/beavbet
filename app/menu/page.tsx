// app/menu/page.tsx
export const metadata = {
  title: "Меню — Pulz Casino",
};

export default function MenuPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-blue-400">
          Pulz menu
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-50">
          Меню
        </h1>
        <p className="text-sm text-slate-400">
          Этот раздел мы переделаем под PC (добавим нужные пункты и быстрые действия).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-black/60 p-4">
        <div className="text-sm font-semibold text-slate-100">Coming soon</div>
        <div className="mt-2 text-sm text-slate-400">
          Скоро тут будет новое меню для десктопа.
        </div>
      </div>
    </div>
  );
}
