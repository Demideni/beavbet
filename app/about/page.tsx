export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-50">
        О казино Pulz
      </h1>
      <p className="max-w-2xl text-sm text-slate-300">
        Pulz — онлайн-казино в дерзком, динамичном и премиальном стиле
        бренда WynixBet. Наша философия:{" "}
        <span className="font-semibold text-blue-300">
          «Играй с огнём. Побеждай с умом».
        </span>
      </p>

      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-xs text-blue-300">Честная игра</div>
          <p className="mt-2 text-xs text-slate-400">
            Провайдеры с лицензией, прозрачные RTP и понятные условия.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-xs text-blue-300">Ответственная игра</div>
          <p className="mt-2 text-xs text-slate-400">
            Лимиты и инструменты контроля.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="text-xs text-blue-300">Скорость</div>
          <p className="mt-2 text-xs text-slate-400">
            Быстрые депозиты и выводы.
          </p>
        </div>
      </div>
    </div>
  );
}
