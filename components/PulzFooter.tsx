export default function PulzFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/80 text-[11px] text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>
            © {new Date().getFullYear()} Pulz. Демонстрационный прототип. Все
            игры работают в демо‑режиме, ставки не принимаются.
          </p>
          <p className="text-[10px]">
            Бренд‑стиль WynixBet: дерзкий, динамичный, премиальный
            красно‑чёрный дизайн.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full bg-white/5 px-3 py-1">
            Поддержка 24/7: support@pulz.casino
          </span>
        </div>
      </div>
    </footer>
  );
}
