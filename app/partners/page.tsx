// app/partners/page.tsx
export default function PartnersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-50">
        Партнёрам Pulz
      </h1>
      <p className="max-w-2xl text-sm text-slate-300">
        Pulz — премиум онлайн-казино в стиле WynixBet. Мы открыты для
        аффилейт-партнёров, стримеров и медиабаинговых команд.
      </p>

      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-xs text-blue-300">RevShare</div>
          <div className="mt-1 text-sm font-semibold text-slate-50">
            До 50% пожизненно
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Гибкие условия для сильных аффилейт-команд.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-xs text-blue-300">CPA / гибрид</div>
          <div className="mt-1 text-sm font-semibold text-slate-50">
            Индивидуальные офферы
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Настраиваем выплаты под гео и качество трафика.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-xs text-blue-300">Поддержка</div>
          <div className="mt-1 text-sm font-semibold text-slate-50">
            Личный менеджер
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Быстрая связь через Telegram, помощь с креативами.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-900/60 bg-black/60 p-4 text-sm text-slate-200">
        Пишите в Telegram:{" "}
        <a
          href="https://t.me/wynixhr"
          target="_blank"
          className="font-semibold text-blue-400 hover:text-blue-300"
        >
          @wynixhr
        </a>{" "}
        или оставьте заявку через контакт-форму (скоро будет).
      </div>
    </div>
  );
}
