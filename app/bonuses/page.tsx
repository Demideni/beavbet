import PulzShell from "@/components/PulzShell";

export default function BonusesPage() {
  return (
    <PulzShell
      title="Бонусы и промо Pulz"
      subtitle="Демо‑экран бонусной системы: welcome‑пак, кэшбэк, турниры. Логика бонусов будет жить на бэкенде."
    >
      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="space-y-2 rounded-2xl border border-pulzBlue/60 bg-gradient-to-b from-pulzBlue/25 to-black/90 p-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-200">
            Welcome‑пак
          </p>
          <p className="text-lg font-semibold text-white">
            До 400% + 250 фриспинов
          </p>
          <p className="text-[11px] text-slate-200">
            Макеты условий: вейджер, макс. ставка, сроки. Всё демонстрационно,
            без реальной активации.
          </p>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/15 bg-black/80 p-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-200">
            Кэшбэк
          </p>
          <p className="text-lg font-semibold text-white">
            До 20% каждую неделю
          </p>
          <p className="text-[11px] text-slate-200">
            Демо‑отображение расчёта кэшбэка. Можно связать с реальной
            транзакционной историей позже.
          </p>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/15 bg-black/80 p-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-200">
            Турниры
          </p>
          <p className="text-lg font-semibold text-white">
            Лидерборды по слотам
          </p>
          <p className="text-[11px] text-slate-200">
            Место для интеграции турнирных таблиц от провайдера или нашего
            собственного движка.
          </p>
        </div>
      </div>
    </PulzShell>
  );
}
