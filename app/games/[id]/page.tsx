// app/games/[id]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  params: { id: string };
};

const ROBINZON_URL = "https://robinson-game-1.onrender.com";

const NAMES: Record<string, string> = {
  "robinzon-island": "RobinzON Island",
  robinson: "RobinzON Island",
  robinzON: "RobinzON Island",
};

const GAME_URLS: Record<string, string> = {
  "robinzon-island": ROBINZON_URL,
  robinson: ROBINZON_URL,
  robinzON: ROBINZON_URL,
};

export default function GameDetailsPage({ params }: Props) {
  const rawId = params.id;
  const id = rawId.toLowerCase();

  // RobinzON теперь живёт внутри казино: /games/robinson
  if (id === "robinzon-island" || id === "robinson" || id === "robinzon") {
    redirect("/games/robinson");
  }


  const name = NAMES[id] ?? "Игра Pulz";
  const gameUrl = GAME_URLS[id];

  // Если URL игры не задан — показываем заглушку
  if (!gameUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-50">{name}</h1>
            <p className="text-sm text-slate-400">
              Интеграция этой игры ещё в разработке. Сейчас доступна только
              демо-страница.
            </p>
          </div>
          <Link
            href="/games"
            className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1.5 text-xs text-slate-200 hover:border-blue-500 hover:text-white"
          >
            ← Назад к каталогу
          </Link>
        </div>

        <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-800 bg-black">
          <p className="max-w-xs text-center text-sm text-slate-400">
            Интеграция этой игры ещё не подключена. Скоро здесь будет
            полноценный запуск.
          </p>
        </div>
      </div>
    );
  }

  // FULLSCREEN-режим для игр
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Верхняя панель с кнопкой выхода */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black via-black/70 to-transparent">
        <Link
          href="/games"
          className="rounded-full border border-slate-700 bg-black/70 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-blue-500 hover:bg-black"
        >
          ← Выйти из игры
        </Link>
        <span className="text-xs text-slate-400">{name}</span>
      </div>

      {/* Игровое поле занимает всё оставшееся место */}
      <div className="relative z-0 flex-1">
        <iframe
          src={gameUrl}
          title={name}
          className="h-full w-full border-0"
          loading="lazy"
          allowFullScreen
        />
      </div>
    </div>
  );
}
