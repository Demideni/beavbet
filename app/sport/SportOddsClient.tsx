"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type ViewTab = "line" | "history";

function isExcludedSport(s: SportItem) {
  const k = (s.key || "").toLowerCase();
  if (k.startsWith("esports_") || k.startsWith("motorsport_") || k.startsWith("racing_")) return true;
  const blob = `${s.group} ${s.title}`.toLowerCase();
  if (blob.includes("esports") || blob.includes("esport")) return true;
  if (blob.includes("motorsport") || blob.includes("racing") || blob.includes("nascar") || blob.includes("formula")) return true;
  return false;
}

function pickH2H(ev: EventOdds) {
  for (const bm of ev.bookmakers || []) {
    const m = (bm.markets || []).find((x) => x.key === "h2h");
    if (!m) continue;

    let home: number | undefined;
    let away: number | undefined;
    let draw: number | undefined;

    for (const o of m.outcomes || []) {
      if (o.name === ev.home_team) home = o.price;
      else if (o.name === ev.away_team) away = o.price;
      else draw = o.price;
    }

    return { bookmaker: bm.title, home, draw, away };
  }
  return { bookmaker: undefined as any, home: undefined, draw: undefined, away: undefined };
}

function normalizeKey(v: string) {
  return (v || "").toLowerCase().replace(/[^a-z]/g, "");
}

function Logo({ name }: { name: string }) {
  const letter = (name?.[0] || "?").toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-white/10 border border-white/15 grid place-items-center text-white/80 text-sm font-bold">
      {letter}
    </div>
  );
}

function OddsButton({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value?: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
    >
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="font-semibold">{typeof value === "number" ? value.toFixed(2) : "-"}</div>
    </button>
  );
}

export default function SportOddsClient() {
  const [viewTab, setViewTab] = useState<ViewTab>("line");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [sports, setSports] = useState<SportItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [sportKey, setSportKey] = useState<string>("soccer_epl");
  const [regions, setRegions] = useState<string>("us");
  const [market, setMarket] = useState<string>("h2h");

  const [events, setEvents] = useState<EventOdds[]>([]);
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

  const didInitGroup = useRef(false);

  const sportsClean = useMemo(() => sports.filter((s) => !isExcludedSport(s)), [sports]);

  const groupsForTab = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sportsClean) {
      const g = s.group || "Other";
      map.set(g, (map.get(g) || 0) + 1);
    }
    const arr = Array.from(map.entries()).map(([group, count]) => ({ group, count }));
    arr.sort((a, b) => a.group.localeCompare(b.group));
    return arr;
  }, [sportsClean]);

  const leaguesForSelectedGroup = useMemo(() => {
    const g = selectedGroup || groupsForTab[0]?.group || "";
    return sportsClean
      .filter((s) => (s.group || "Other") === g)
      .sort((a, b) => (a.title || a.key).localeCompare(b.title || b.key));
  }, [sportsClean, selectedGroup, groupsForTab]);

  const currentLeague = useMemo(() => {
    return sportsClean.find((s) => s.key === sportKey);
  }, [sportsClean, sportKey]);

  // Init sports
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/odds/sports", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Не удалось загрузить список лиг");
        setSports(Array.isArray(j.data) ? j.data : []);
      } catch (e: any) {
        setSports([]);
        setErr(e?.message || "Не удалось загрузить список лиг");
      }
    })();
  }, []);

  // Default group selection once sports loaded
  useEffect(() => {
    if (didInitGroup.current) return;
    if (!groupsForTab.length) return;
    // Prefer soccer group if exists
    const preferred = groupsForTab.find((g) => normalizeKey(g.group).includes("soccer")) || groupsForTab[0];
    setSelectedGroup(preferred.group);
    didInitGroup.current = true;
  }, [groupsForTab]);

  // Ensure sportKey belongs to selectedGroup
  useEffect(() => {
    if (!leaguesForSelectedGroup.length) return;
    const exists = leaguesForSelectedGroup.some((s) => s.key === sportKey);
    if (!exists) {
      // Prefer EPL if exists
      const epl = leaguesForSelectedGroup.find((s) => s.key === "soccer_epl");
      setSportKey((epl || leaguesForSelectedGroup[0]).key);
    }
  }, [leaguesForSelectedGroup, sportKey]);

  async function loadOdds() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/odds/odds", window.location.origin);
      url.searchParams.set("sport", sportKey || "soccer_epl");
      url.searchParams.set("regions", regions || "us");
      url.searchParams.set("markets", market || "h2h");
      url.searchParams.set("oddsFormat", "decimal");
      url.searchParams.set("dateFormat", "iso");

      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Не удалось загрузить события");
      setEvents(Array.isArray(j.data) ? j.data : []);
    } catch (e: any) {
      setEvents([]);
      setErr(e?.message || "Не удалось загрузить события");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (viewTab !== "line") return;
    // only load when we have some sports
    if (!sportKey) return;
    loadOdds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, sportKey, regions, market]);

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

  function openSlip(opts: { ev: EventOdds; pick: SlipPick; odds: number; bookTitle?: string }) {
    const ev = opts.ev;
    const outcomeName =
      opts.pick === "home" ? ev.home_team : opts.pick === "away" ? ev.away_team : "Draw";

    setPlaceErr(null);
    setPlaceMsg(null);
    setSlip({
      sportKey: ev.sport_key,
      leagueTitle: currentLeague?.title || currentLeague?.group || ev.sport_title || ev.sport_key,
      eventId: ev.id,
      commenceTime: ev.commence_time,
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      marketKey: "h2h",
      pick: opts.pick,
      outcomeName,
      odds: opts.odds,
      bookTitle: opts.bookTitle,
      currency: "EUR",
    });
  }

  async function placeBet() {
    if (!slip) return;
    setPlacing(true);
    setPlaceErr(null);
    setPlaceMsg(null);
    try {
      const r = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currency: slip.currency || "EUR",
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
            bookTitle: slip.bookTitle,
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Не удалось поставить");
      setPlaceMsg("Ставка принята");
      setSlip(null);
      window.dispatchEvent(new Event("bets:refresh"));
    } catch (e: any) {
      setPlaceErr(e?.message || "Не удалось поставить");
    } finally {
      setPlacing(false);
    }
  }

  const featured = useMemo(() => {
    return (events || []).slice(0, 8);
  }, [events]);

  const popularTabs = useMemo(
    () => [
      { label: "Хоккей", keys: ["hockey", "icehockey", "ice hockey"] },
      { label: "Баскетбол", keys: ["basketball"] },
      { label: "Футбол", keys: ["soccer", "football"] },
    ],
    []
  );

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

      {viewTab === "history" ? (
        <div>
          {betsErr && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {betsErr}
            </div>
          )}
          {betsLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">Загрузка…</div>
          ) : bets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">Нет ставок</div>
          ) : (
            <div className="space-y-3">
              {bets.map((b: any) => (
                <div key={b.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">
                      {b.home_team} <span className="text-white/40">vs</span> {b.away_team}
                    </div>
                    <div className="text-xs text-white/50">{(b.status || "").toUpperCase()}</div>
                  </div>
                  <div className="mt-2 text-sm text-white/60">
                    {b.league_title || b.sport_key} • {b.market_key} • {b.outcome_name}
                  </div>
                  <div className="mt-2 text-sm text-white/80">
                    Stake: <b>{b.stake}</b> • Odds: <b>{b.odds}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Popular sport tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {popularTabs.map((t) => {
              const current = (selectedGroup || "").toLowerCase();
              const isActive = t.keys.some((k) => current.includes(k));
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    const g = groupsForTab.find((x) =>
                      t.keys.some((k) => (x.group || "").toLowerCase().includes(k))
                    );
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

          {/* Featured carousel */}
          <div className="mb-5">
            <div className="mb-3 flex items-baseline gap-3">
              <div className="text-lg font-bold text-white">Интересные матчи</div>
              <div className="text-sm text-white/40">по выбранной лиге</div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featured.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                  Нет событий
                </div>
              ) : (
                featured.map((ev) => {
                  const h2h = pickH2H(ev);
                  return (
                    <div key={ev.id} className="snap-start shrink-0 w-[320px] rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/50">{currentLeague?.title || sportKey}</div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Logo name={ev.home_team} />
                          <div className="max-w-[110px] truncate text-white font-semibold">{ev.home_team}</div>
                        </div>
                        <div className="text-white/40 text-sm">vs</div>
                        <div className="flex items-center gap-2">
                          <div className="max-w-[110px] truncate text-white font-semibold text-right">{ev.away_team}</div>
                          <Logo name={ev.away_team} />
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <OddsButton
                          label="1"
                          value={h2h.home}
                          disabled={!h2h.home}
                          onClick={() => h2h.home && openSlip({ ev, pick: "home", odds: h2h.home, bookTitle: h2h.bookmaker })}
                        />
                        <OddsButton
                          label="X"
                          value={h2h.draw}
                          disabled={!h2h.draw}
                          onClick={() => h2h.draw && openSlip({ ev, pick: "draw", odds: h2h.draw, bookTitle: h2h.bookmaker })}
                        />
                        <OddsButton
                          label="2"
                          value={h2h.away}
                          disabled={!h2h.away}
                          onClick={() => h2h.away && openSlip({ ev, pick: "away", odds: h2h.away, bookTitle: h2h.bookmaker })}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected filters row */}
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
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{err}</div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">Загрузка…</div>
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
                        <Logo name={ev.home_team} />
                        <div className="text-white font-semibold">{ev.home_team}</div>
                      </div>
                      <div className="text-white/40 text-sm">vs</div>
                      <div className="flex items-center gap-2">
                        <div className="text-white font-semibold text-right">{ev.away_team}</div>
                        <Logo name={ev.away_team} />
                      </div>
                    </div>

                    {market !== "h2h" ? (
                      <div className="mt-3 text-sm text-white/60">
                        Сейчас выбран рынок <b className="text-white/80">{market}</b>. В следующем шаге добавим отображение коэффициентов для него.
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <OddsButton
                          label="1"
                          value={h2h.home}
                          disabled={!h2h.home}
                          onClick={() => h2h.home && openSlip({ ev, pick: "home", odds: h2h.home, bookTitle: h2h.bookmaker })}
                        />
                        <OddsButton
                          label="X"
                          value={h2h.draw}
                          disabled={!h2h.draw}
                          onClick={() => h2h.draw && openSlip({ ev, pick: "draw", odds: h2h.draw, bookTitle: h2h.bookmaker })}
                        />
                        <OddsButton
                          label="2"
                          value={h2h.away}
                          disabled={!h2h.away}
                          onClick={() => h2h.away && openSlip({ ev, pick: "away", odds: h2h.away, bookTitle: h2h.bookmaker })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bet slip */}
          {slip && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between">
                <div className="text-white font-bold">Купон</div>
                <button
                  type="button"
                  onClick={() => setSlip(null)}
                  className="h-9 w-9 rounded-xl bg-white/10 text-white/80 hover:bg-white/15"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 text-sm text-white/80">
                <div className="font-semibold">
                  {slip.homeTeam} <span className="text-white/40">vs</span> {slip.awayTeam}
                </div>
                <div className="mt-1 text-white/50">{slip.leagueTitle}</div>
                <div className="mt-1 text-white/70">
                  {slip.outcomeName} • Odds <b className="text-white">{slip.odds.toFixed(2)}</b>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="text-sm text-white/60">Ставка</div>
                <input
                  value={stake}
                  onChange={(e) => setStake(Number(e.target.value) || 0)}
                  className="h-10 w-28 rounded-2xl border border-white/10 bg-black/40 px-3 text-white outline-none"
                  type="number"
                  min={1}
                  step={1}
                />
                <div className="ml-auto text-sm text-white/70">
                  Выплата: <b className="text-white">{Number((stake * slip.odds).toFixed(2))}</b>
                </div>
              </div>

              {placeErr && (
                <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{placeErr}</div>
              )}
              {placeMsg && (
                <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  {placeMsg}
                </div>
              )}

              <button
                type="button"
                disabled={placing || !Number.isFinite(stake) || stake <= 0}
                onClick={placeBet}
                className="mt-4 h-11 w-full rounded-2xl bg-[#ff2d55] text-white font-semibold shadow hover:opacity-95 disabled:opacity-60"
              >
                {placing ? "Ставим…" : "Поставить"}
              </button>
            </div>
          )}

          {/* Bottom sheet filters */}
          {filtersOpen && (
            <div className="fixed inset-0 z-[60]">
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
                        <option value="uk">UK</option>
                        <option value="au">AU</option>
                        <option value="eu">EU</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen(false);
                      loadOdds();
                    }}
                    className="h-11 flex-1 rounded-2xl bg-[#ff2d55] text-white font-semibold shadow hover:opacity-95"
                  >
                    Применить
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="h-11 flex-1 rounded-2xl border border-white/15 bg-white/10 text-white font-semibold hover:bg-white/15"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
