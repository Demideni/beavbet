"use client";

import { useEffect, useMemo, useState } from "react";

type SportItem = {
  key: string;
  group: string;
  title: string;
  description?: string;
  active: boolean;
};

type Outcome = { name: string; price: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { title: string; markets: Market[] };

type EventOdds = {
  id: string;
  sport_key: string;
  sport_title?: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

type SlipPick = "home" | "draw" | "away";
type SlipState = {
  sportKey: string;
  leagueTitle: string;
  eventId: string;
  commenceTime?: string;
  homeTeam: string;
  awayTeam: string;
  marketKey: "h2h";
  pick: SlipPick;
  outcomeName: string;
  odds: number;
  bookTitle?: string;
  currency?: string;
};

type Tab = "sport" | "esports" | "racing";
type ViewTab = "line" | "history";

function tabOfSport(s: SportItem): Tab {
  const k = (s.key || "").toLowerCase();
  // Key prefixes are the most reliable signal.
  if (k.startsWith("esports_")) return "esports";
  if (k.startsWith("motorsport_") || k.startsWith("racing_")) return "racing";

  const norm = (v: string) => (v || "").toLowerCase().replace(/[^a-z]/g, "");
  const g = norm(s.group);
  const t = norm(s.title);
  const blob = `${g}${t}`;

  if (blob.includes("esports") || blob.includes("esport")) return "esports";
  if (blob.includes("motorsport") || blob.includes("racing") || blob.includes("nascar") || blob.includes("formula")) return "racing";
  return "sport";
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function pickH2H(ev: EventOdds) {
  // Берём первого букмекера, у кого есть h2h
  for (const bm of ev.bookmakers || []) {
    const m = (bm.markets || []).find((x) => x.key === "h2h");
    if (!m) continue;

    let home: number | undefined;
    let away: number | undefined;
    let draw: number | undefined;

    for (const o of m.outcomes || []) {
      if (o.name === ev.home_team) home = o.price;
      else if (o.name === ev.away_team) away = o.price;
      else draw = o.price; // ничья (3-way)
    }

    return { bookmaker: bm.title, home, draw, away };
  }
  return { bookmaker: undefined as any, home: undefined, draw: undefined, away: undefined };
}

export default function SportOddsClient() {
  // Всегда держим массив (даже пока грузим), чтобы избежать runtime ошибок вида `null is not an object (sports.find)`
  const [sports, setSports] = useState<SportItem[]>([]);
  const [sportKey, setSportKey] = useState<string>("soccer_epl");

  const [viewTab, setViewTab] = useState<ViewTab>("line");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [regions, setRegions] = useState<string>("us");
  const [market, setMarket] = useState<string>("h2h");
  const [events, setEvents] = useState<EventOdds[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Bet slip
  const [slip, setSlip] = useState<SlipState | null>(null);
  const [stake, setStake] = useState<number>(10);
  const [placing, setPlacing] = useState(false);
  const [placeMsg, setPlaceMsg] = useState<string | null>(null);
  const [placeErr, setPlaceErr] = useState<string | null>(null);

  // Bets history
  const [bets, setBets] = useState<any[]>([]);
  const [betsLoading, setBetsLoading] = useState(false);
  const [betsErr, setBetsErr] = useState<string | null>(null);

  async function loadBets() {
    setBetsLoading(true);
    setBetsErr(null);
    try {
      const r = await fetch("/api/account/bets?limit=20", { credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Не удалось загрузить ставки");
      setBets(Array.isArray(j.data) ? j.data : []);
    } catch (e: any) {
      setBets([]);
      setBetsErr(e?.message || "Не удалось загрузить ставки");
    } finally {
      setBetsLoading(false);
    }
  }

  // load bets when open history + refresh on event
  useEffect(() => {
    if (viewTab !== "history") return;
    loadBets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab]);

  useEffect(() => {
    const onRefresh = () => {
      if (viewTab === "history") loadBets();
    };
    window.addEventListener("bets:refresh", onRefresh);
    return () => window.removeEventListener("bets:refresh", onRefresh);
  }, [viewTab]);

  return (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-lg font-bold text-white">Спорт</div>
        <div className="text-sm text-white/60">Линия и ставки</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "line", label: "Линия" },
            { key: "history", label: "История ставок" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setViewTab(t.key)}
            className={
              "h-10 rounded-2xl px-4 text-sm font-semibold transition " +
              (viewTab === t.key
                ? "bg-[#ff2d55]/15 border border-[#ff2d55]/25 text-white"
                : "bg-black/20 text-white/60 hover:bg-white/5 border border-transparent")
            }
          >
            {t.label}
          </button>
        ))}

        {viewTab === "line" && (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="h-10 rounded-2xl px-4 text-sm font-semibold bg-white/10 text-white hover:bg-white/15 border border-white/15"
          >
            Фильтр
          </button>
        )}
      </div>
    </div>

      {viewTab === "line" ? (
        <>
          {/* Популярное: основные виды спорта */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { label: "Хоккей", keys: ["hockey", "ice hockey", "icehockey"] },
              { label: "Баскетбол", keys: ["basketball"] },
              { label: "Футбол", keys: ["soccer", "football"] },
            ].map((t) => {
              const current = (selectedGroup || "").toLowerCase();
              const isActive = t.keys.some((k) => current.includes(k));
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    const g = groupsForTab.find((x) => t.keys.some((k) => (x.group || "").toLowerCase().includes(k)));
                    if (g) setSelectedGroup(g.group);
                  }}
                  className={
                    "shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition " +
                    (isActive
                      ? "border-white/20 bg-[#ff2d55]/15 text-white"
                      : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5")
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Интересные матчи (карусель) */}
          <div className="mb-5">
            <div className="mb-3 flex items-baseline gap-3">
              <div className="text-lg font-bold text-white">Интересные матчи</div>
              <div className="text-sm text-white/40">по выбранной лиге</div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(events || []).slice(0, 8).map((ev) => {
                const h2h = pickH2H(ev);
                return (
                  <div key={ev.id} className="min-w-[280px] snap-start rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/50">{currentLeague?.title || sportKey}</div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-white/10 border border-white/15 grid place-items-center text-white/80 text-sm font-bold">
                          {(ev.home_team?.[0] || "H").toUpperCase()}
                        </div>
                        <div className="max-w-[90px] truncate text-white font-semibold">{ev.home_team}</div>
                      </div>

                      <div className="text-white/40 text-sm">vs</div>

                      <div className="flex items-center gap-2">
                        <div className="max-w-[90px] truncate text-white font-semibold text-right">{ev.away_team}</div>
                        <div className="h-9 w-9 rounded-full bg-white/10 border border-white/15 grid place-items-center text-white/80 text-sm font-bold">
                          {(ev.away_team?.[0] || "A").toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={!h2h.home}
                        onClick={() => h2h.home && openSlip({ ev, pick: "home", odds: h2h.home, bookTitle: h2h.bookmaker })}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                      >
                        <div className="text-[11px] text-white/50">1</div>
                        <div className="font-semibold">{h2h.home?.toFixed(2) ?? "-"}</div>
                      </button>
                      <button
                        type="button"
                        disabled={!h2h.draw}
                        onClick={() => h2h.draw && openSlip({ ev, pick: "draw", odds: h2h.draw, bookTitle: h2h.bookmaker })}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                      >
                        <div className="text-[11px] text-white/50">X</div>
                        <div className="font-semibold">{h2h.draw?.toFixed(2) ?? "-"}</div>
                      </button>
                      <button
                        type="button"
                        disabled={!h2h.away}
                        onClick={() => h2h.away && openSlip({ ev, pick: "away", odds: h2h.away, bookTitle: h2h.bookmaker })}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                      >
                        <div className="text-[11px] text-white/50">2</div>
                        <div className="font-semibold">{h2h.away?.toFixed(2) ?? "-"}</div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Строка выбранных фильтров + обновить */}
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-white/70">
              <span className="font-semibold text-white">{currentLeague?.title || sportKey}</span>
              <span className="text-white/40"> • </span>
              <span>{market === "h2h" ? "1X2" : market}</span>
              <span className="text-white/40"> • </span>
              <span className="uppercase">{regions}</span>
            </div>

            <button
              type="button"
              onClick={() => loadOdds()}
              className="h-10 rounded-2xl px-4 text-sm font-semibold bg-[#ff2d55] text-white shadow hover:opacity-95"
            >
              Обновить
            </button>
          </div>

          {err && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {err}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              Загрузка…
            </div>
          ) : (events || []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              Нет событий для этой лиги/рынка. Попробуй другую лигу или регион.
            </div>
          ) : (
            <div className="space-y-3">
              {(events || []).map((ev) => {
                const h2h = pickH2H(ev);
                return (
                  <div key={ev.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/50">{currentLeague?.title || sportKey}</div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-white/10 border border-white/15 grid place-items-center text-white/80 text-sm font-bold">
                          {(ev.home_team?.[0] || "H").toUpperCase()}
                        </div>
                        <div className="text-white font-semibold">{ev.home_team}</div>
                      </div>

                      <div className="text-white/40 text-sm">vs</div>

                      <div className="flex items-center gap-2">
                        <div className="text-white font-semibold text-right">{ev.away_team}</div>
                        <div className="h-10 w-10 rounded-full bg-white/10 border border-white/15 grid place-items-center text-white/80 text-sm font-bold">
                          {(ev.away_team?.[0] || "A").toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {market !== "h2h" ? (
                      <div className="mt-3 text-sm text-white/60">
                        Сейчас выбран рынок <b className="text-white/80">{market}</b>. В следующем шаге добавим отображение коэффициентов для него.
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          disabled={!h2h.home}
                          onClick={() => h2h.home && openSlip({ ev, pick: "home", odds: h2h.home, bookTitle: h2h.bookmaker })}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                        >
                          <div className="text-[11px] text-white/50">1</div>
                          <div className="text-base font-bold">{h2h.home?.toFixed(2) ?? "-"}</div>
                        </button>
                        <button
                          type="button"
                          disabled={!h2h.draw}
                          onClick={() => h2h.draw && openSlip({ ev, pick: "draw", odds: h2h.draw, bookTitle: h2h.bookmaker })}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                        >
                          <div className="text-[11px] text-white/50">X</div>
                          <div className="text-base font-bold">{h2h.draw?.toFixed(2) ?? "-"}</div>
                        </button>
                        <button
                          type="button"
                          disabled={!h2h.away}
                          onClick={() => h2h.away && openSlip({ ev, pick: "away", odds: h2h.away, bookTitle: h2h.bookmaker })}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                        >
                          <div className="text-[11px] text-white/50">2</div>
                          <div className="text-base font-bold">{h2h.away?.toFixed(2) ?? "-"}</div>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom-sheet фильтры */}
          {filtersOpen && (
            <div className="fixed inset-0 z-[80]">
              <button
                type="button"
                aria-label="close"
                onClick={() => setFiltersOpen(false)}
                className="absolute inset-0 bg-black/60"
              />
              <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-white/10 bg-[#0b1220]/95 backdrop-blur p-5">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-white">Фильтры</div>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="h-9 w-9 rounded-xl bg-white/10 text-white/80 hover:bg-white/15"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-white/50">Категория</span>
                    <select
                      className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                    >
                      {groupsForTab.length ? (
                        groupsForTab.map((g) => (
                          <option key={g.group} value={g.group}>
                            {g.group} ({g.count})
                          </option>
                        ))
                      ) : (
                        <option value="">—</option>
                      )}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-white/50">Лига</span>
                    <select
                      className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                      value={sportKey}
                      onChange={(e) => setSportKey(e.target.value)}
                    >
                      {leaguesForSelectedGroup.length ? (
                        leaguesForSelectedGroup.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.title || s.key}
                          </option>
                        ))
                      ) : (
                        <option value="">— Нет лиг —</option>
                      )}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/50">Рынок</span>
                      <select
                        className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                        value={market}
                        onChange={(e) => setMarket(e.target.value)}
                      >
                        <option value="h2h">1X2 (h2h)</option>
                        <option value="spreads">Фора (spreads)</option>
                        <option value="totals">Тотал (totals)</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-white/50">Регион</span>
                      <select
                        className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                        value={regions}
                        onChange={(e) => setRegions(e.target.value)}
                      >
                        <option value="us">US</option>
                        <option value="eu">EU</option>
                        <option value="uk">UK</option>
                        <option value="au">AU</option>
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen(false);
                      loadOdds();
                    }}
                    className="mt-2 h-12 rounded-2xl bg-[#ff2d55] text-base font-bold text-white shadow"
                  >
                    Применить
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-white">История ставок</div>
            <button
              type="button"
              onClick={() => loadBets()}
              className="h-10 rounded-2xl bg-white/8 border border-white/10 px-4 text-sm text-white/80 hover:bg-white/10"
            >
              Обновить
            </button>
          </div>

          {betsErr ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {betsErr}
            </div>
          ) : null}

          {betsLoading ? (
            <div className="mt-4 text-sm text-white/60">Загрузка…</div>
          ) : bets.length === 0 ? (
            <div className="mt-4 text-sm text-white/60">
              Пока ставок нет. Сделай ставку в разделе “Линия”.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {bets.map((b) => (
                <div key={b.id} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white/85 font-semibold">
                      {b.home_team} <span className="text-white/35">vs</span> {b.away_team}
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-white/8 border border-white/10 text-white/70">
                      {b.status}
                    </div>
                  </div>
                  <div className="text-sm text-white/60">
                    {String(b.market_key || "").toUpperCase()} • {b.outcome_name} • odds {Number(b.odds).toFixed(2)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-white/70">
                      Ставка: <span className="text-white/90 font-semibold">{Number(b.stake).toFixed(2)} {b.currency}</span>
                    </div>
                    <div className="text-white/70">
                      Выплата: <span className="text-white/90 font-semibold">{Number(b.potential_payout).toFixed(2)} {b.currency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bet slip (bottom sheet on mobile, side card on desktop) */}
      {slip && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[1100px] px-3 pb-3 md:inset-auto md:right-6 md:bottom-6 md:w-[360px] md:p-0">
          <div className="rounded-2xl border border-white/10 bg-[#0b1220]/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-white/50">Купон</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {slip.homeTeam} <span className="text-white/40">vs</span> {slip.awayTeam}
                </div>
                <div className="mt-1 text-[12px] text-white/70">
                  {slip.outcomeName} · <b className="text-white">{slip.odds}</b>
                  {slip.bookTitle ? (
                    <span className="text-white/40"> · {slip.bookTitle}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSlip(null);
                  setPlaceErr(null);
                  setPlaceMsg(null);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="col-span-1">
                <div className="text-xs text-white/50">Ставка</div>
                <input
                  inputMode="decimal"
                  value={String(stake)}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/,/g, "."));
                    if (Number.isFinite(v)) setStake(v);
                    else if (e.target.value === "") setStake(0);
                  }}
                  className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-white outline-none focus:border-white/20"
                />
              </label>
              <div className="col-span-1">
                <div className="text-xs text-white/50">Возможный выигрыш</div>
                <div className="mt-1 flex h-11 items-center rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white">
                  {(Math.max(0, stake) * slip.odds).toFixed(2)} {slip.currency}
                </div>
              </div>
            </div>

            {placeErr && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {placeErr}
              </div>
            )}
            {placeMsg && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {placeMsg}
              </div>
            )}

            <button
              type="button"
              disabled={placing || !stake || stake <= 0}
              onClick={() => placeBet()}
              className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-sm font-semibold text-white shadow disabled:opacity-50"
            >
              {placing ? "Ставим…" : "Поставить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
