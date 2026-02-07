import PulzShell from "@/components/PulzShell";

export default function StatusPage() {
  return (
    <PulzShell
      title="Статус интеграции Pulz"
      subtitle="Страница для команды и инвесторов: что уже готово на фронте и что нужно подключить по бэкенду."
    >
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-200">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white">Фронтенд</h2>
          <ul className="space-y-1 text-[11px]">
            <li>• Готов лендинг в фирменном стиле WynixBet / Pulz.</li>
            <li>• Есть каталог игр с фильтрами и демо‑страницами.</li>
            <li>• Макеты кассы, бонусов и статусов собраны.</li>
            <li>• Tailwind + Next 14 (app‑router), адаптив под desktop.</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white">Что подключать</h2>
          <ul className="space-y-1 text-[11px]">
            <li>• Бэкенд‑ядро WynixBet (аккаунт, баланс, беты).</li>
            <li>• Провайдеры игр (SlotMatrix / др.) через iframe‑API.</li>
            <li>• KYC / AML (Sumsub, Veriff и т.п.).</li>
            <li>• Платёжные провайдеры (Stripe, крипто‑шлюз).</li>
          </ul>
        </div>
      </div>
    </PulzShell>
  );
}
