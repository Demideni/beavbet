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
  const [tab, setTab] = useState<"sport" | "esports" | "racing">("sport");
  const [viewTab, setViewTab] = useState<ViewTab>("line");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab]);

  // read ?tab= and ?league= from shortcuts
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const t = url.searchParams.get("tab");
      if (t === "esports" || t === "racing" || t === "sport") setTab(t);
      const league = url.searchParams.get("league") || url.searchParams.get("sport");
      if (league) setSportKey(league);
    } catch {
      // ignore
    }
  }, []);

  // Подтянуть список спортов (лиг)
  useEffect(() => {
    let alive = true;
    fetch("/api/odds/sports", { credentials: "include" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load sports");
        return j.data as SportItem[];
      })
      .then((d) => {
        if (!alive) return;
        setSports(d);
        // если ключа нет в списке — выберем первый активный
        const active = d.filter((x) => x.active);
        if (active.length && !active.find((x) => x.key === sportKey)) {
          setSportKey(active[0].key);
        }
      })
      .catch(() => {
        // не блокируем UI — просто не показываем dropdown списка
        if (alive) setSports([]);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leagueOptions = useMemo(() => {
    const base = (sports || []);
    // чуть приятнее: сначала soccer/basketball/americanfootball
    const priority = ["soccer", "basketball", "americanfootball"];
    return base.sort((a, b) => {
      const pa = priority.findIndex((p) => a.key.startsWith(p));
      const pb = priority.findIndex((p) => b.key.startsWith(p));
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });
  }, [sports]);

  const sportsForTab = useMemo(() => {
    return leagueOptions.filter((s) => tabOfSport(s) === tab);
  }, [leagueOptions, tab]);

  const groupsForTab = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sportsForTab) {
      const g = s.group || "Другое";
      map.set(g, (map.get(g) || 0) + 1);
    }
    return [...map.entries()]
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));
  }, [sportsForTab]);

  const leaguesForSelectedGroup = useMemo(() => {
    const list = sportsForTab.filter((s) => (selectedGroup ? (s.group || "Другое") === selectedGroup : true));
    // внутри группы сортируем по title
    return list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, [sportsForTab, selectedGroup]);

  const currentLeague = useMemo(() => {
    return (sports ?? []).find((s) => s.key === sportKey) || null;
  }, [sports, sportKey]);

  // синхронизируем group/tab из выбранной лиги
  useEffect(() => {
    if (!sports.length) return;
    const current = sports.find((s) => s.key === sportKey);
    if (!current) return;
    const desiredTab = tabOfSport(current);
    if (desiredTab !== tab) setTab(desiredTab);
    const g = current.group || "Другое";
    if (g !== selectedGroup) setSelectedGroup(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sports, sportKey]);

  // если сменили tab — выбираем первую доступную группу/лигу
  useEffect(() => {
    if (!sportsForTab.length) return;

    // если текущая группа не существует в новом табе — сбрасываем на первую
    const firstGroup = sportsForTab[0].group || "Другое";
    const hasGroup = selectedGroup && sportsForTab.some((s) => (s.group || "Другое") === selectedGroup);
    if (!selectedGroup || !hasGroup) setSelectedGroup(firstGroup);

    const current = sportsForTab.find((s) => s.key === sportKey);
    if (!current || tabOfSport(current) !== tab) {
      // выбираем первую лигу в табе
      setSportKey(sportsForTab[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sportsForTab.length]);

  // если поменяли группу — выбираем первую лигу в этой группе
  useEffect(() => {
    if (!leaguesForSelectedGroup.length) return;
    const exists = leaguesForSelectedGroup.some((s) => s.key === sportKey);
    if (!exists) setSportKey(leaguesForSelectedGroup[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, leaguesForSelectedGroup.length]);

  async function loadOdds() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/odds/odds", window.location.origin);
      url.searchParams.set("sport", sportKey);
      url.searchParams.set("regions", regions);
      url.searchParams.set("markets", market);
      url.searchParams.set("oddsFormat", "decimal");

      const r = await fetch(url.toString(), { credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to load odds");

      setEvents(Array.isArray(j.data) ? j.data : []);
    } catch (e: any) {
      setEvents([]);
      setErr(e?.message || "Failed to load odds");
    } finally {
      setLoading(false);
    }
  }

  // Подгружать при изменениях
  useEffect(() => {
    loadOdds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportKey, regions, market]);

  function openSlip(args: {
    ev: EventOdds;
    pick: SlipPick;
    odds: number;
    bookTitle?: string;
  }) {
    const { ev, pick, odds, bookTitle } = args;
    const outcomeName = pick === "home" ? ev.home_team : pick === "away" ? ev.away_team : "Draw";
    setSlip({
      sportKey,
      leagueTitle: currentLeague?.title || sportKey,
      eventId: ev.id,
      commenceTime: ev.commence_time,
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      marketKey: "h2h",
      pick,
      outcomeName,
      odds,
      bookTitle,
      currency: "USD",
    });
    setPlaceErr(null);
    setPlaceMsg(null);
  }

  async function placeBet() {
    if (!slip) return;
    if (!Number.isFinite(stake) || stake <= 0) {
      setPlaceErr("Укажи сумму ставки");
      return;
    }
    setPlacing(true);
    setPlaceErr(null);
    setPlaceMsg(null);
    try {
      const r = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: "USD",
          stake,
          selection: {
            sportKey: slip.sportKey,
            leagueTitle: slip.leagueTitle,
            eventId: slip.eventId,
            commenceTime: slip.commenceTime,
            homeTeam: slip.homeTeam,
            awayTeam: slip.awayTeam,
            marketKey: slip.marketKey,
            outcomeName: slip.outcomeName,
            odds: slip.odds,
      book: slip.bookTitle,
          },
        }),
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Не удалось принять ставку");
      setPlaceMsg("Ставка принята");
      // refresh wallet in header + reload odds
      window.dispatchEvent(new Event("wallet:refresh"));
      window.dispatchEvent(new Event("bets:refresh"));
    } catch (e: any) {
      setPlaceErr(e?.message || "Не удалось принять ставку");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      {/* Tabs: Спорт / Киберспорт / Гонки (как в референсе) */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {(
          [
            { key: "sport", label: "Спорт" },
            { key: "esports", label: "Киберспорт" },
            { key: "racing", label: "Гонки" },
          ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setViewTab("line");
              }}
              className={
                "h-10 rounded-2xl px-4 text-sm font-semibold transition " +
                (tab === t.key
                  ? "bg-white/10 text-white"
                  : "bg-black/20 text-white/60 hover:bg-white/5")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {viewTab === "line" ? (
        <>
          {/* Популярные категории (горизонтальный скролл на мобиле) */}
          {groupsForTab.length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {groupsForTab.slice(0, 16).map((g) => (
                <button
                  key={g.group}
                  type="button"
                  onClick={() => setSelectedGroup(g.group)}
                  className={
                    "shrink-0 rounded-2xl border px-3 py-2 text-sm transition " +
                    (selectedGroup === g.group
                      ? "border-white/20 bg-[#ff2d55]/15 text-white"
                      : "border-white/10 bg-black/20 text-white/70 hover:bg-white/5")
                  }
                >
                  <span className="mr-2">{g.group}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">{g.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-lg font-bold text-white">Линия</div>
              <div className="text-sm text-white/60">Выбери лигу и рынок, затем ставь.</div>
            </div>

            <div className="flex flex-wrap gap-2">
          {/* Категория */}
          <div className="flex flex-col gap-1">
            <div className="text-[11px] text-white/50">Категория</div>
            <select
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
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
          </div>

          {/* Лига */}
          <div className="flex flex-col gap-1">
            <div className="text-[11px] text-white/50">Лига</div>
            <select
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
              value={sportKey}
              onChange={(e) => setSportKey(e.target.value)}
            >
              {leaguesForSelectedGroup.length ? (
                leaguesForSelectedGroup.slice(0, 120).map((s) => (
                  <option key={s.key} value={s.key} disabled={!s.active}>
                    {s.title}
                  </option>
                ))
              ) : (
                <option value="" disabled>— Нет лиг для выбранного раздела —</option>
              )}
            </select>
          </div>

          {/* Рынок */}
          <div className="flex flex-col gap-1">
            <div className="text-[11px] text-white/50">Рынок</div>
            <select
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            >
              <option value="h2h">1X2 (h2h)</option>
              <option value="spreads">Spreads</option>
              <option value="totals">Totals</option>
            </select>
          </div>

          {/* Регион */}
          <div className="flex flex-col gap-1">
            <div className="text-[11px] text-white/50">Регион</div>
            <select
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
              value={regions}
              onChange={(e) => setRegions(e.target.value)}
            >
              <option value="us">US</option>
              <option value="eu">EU</option>
              <option value="uk">UK</option>
              <option value="au">AU</option>
            </select>
          </div>

          <button
            onClick={loadOdds}
            className="h-10 rounded-xl bg-[#ff2d55] px-4 text-sm font-semibold text-white hover:opacity-90"
            disabled={loading}
          >
            {loading ? "Обновляю…" : "Обновить"}
          </button>
            </div>
          </div>

          {err && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {err}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {events === null ? (
              <div className="text-sm text-white/60">Загрузка…</div>
            ) : events.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                Нет событий для этой лиги/рынка. Попробуй другую лигу или регион.
              </div>
            ) : (
              events.map((ev) => {
                const h2h = pickH2H(ev);
                return (
                  <div
                    key={ev.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs text-white/50">{fmtTime(ev.commence_time)}</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {ev.home_team} <span className="text-white/40">vs</span> {ev.away_team}
                    </div>
                    {h2h.bookmaker && (
                      <div className="mt-1 text-[11px] text-white/40">Book: {h2h.bookmaker}</div>
                    )}
                  </div>

                  {/* Для spreads/totals пока просто показываем, что рынок другой */}
                  {market !== "h2h" ? (
                    <div className="text-sm text-white/60">
                      Сейчас выбран рынок <b className="text-white/80">{market}</b>.  
                      В следующем шаге отрисую коэффициенты именно для него.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 md:w-[320px]">
                      <button
                        type="button"
                        disabled={!h2h.home}
                        onClick={() =>
                          h2h.home &&
                          openSlip({ ev, pick: "home", odds: h2h.home, bookTitle: h2h.bookmaker })
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                      >
                        <div className="text-[11px] text-white/60">1</div>
                        <div className="font-bold">{h2h.home ?? "—"}</div>
                      </button>
                      <button
                        type="button"
                        disabled={!h2h.draw}
                        onClick={() =>
                          h2h.draw &&
                          openSlip({ ev, pick: "draw", odds: h2h.draw, bookTitle: h2h.bookmaker })
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                      >
                        <div className="text-[11px] text-white/60">X</div>
                        <div className="font-bold">{h2h.draw ?? "—"}</div>
                      </button>
                      <button
                        type="button"
                        disabled={!h2h.away}
                        onClick={() =>
                          h2h.away &&
                          openSlip({ ev, pick: "away", odds: h2h.away, bookTitle: h2h.bookmaker })
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
                      >
                        <div className="text-[11px] text-white/60">2</div>
                        <div className="font-bold">{h2h.away ?? "—"}</div>
                      </button>
                    </div>
                  )}
                </div>
                  </div>
                );
              })
            )}
          </div>
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
