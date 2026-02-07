"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { americanToDecimal, formatMoney } from "./utils";

type Outcome = { name: string; price: number; point?: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { key: string; title: string; markets: Market[] };
type EventOdds = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

type Leg = {
  eventId: string;
  sportKey: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  marketKey: string;
  selection: string;
  oddsAmerican: number;
  line?: number;
};

function pickMarket(bookmakers: Bookmaker[], key: string): Market | null {
  for (const bm of bookmakers || []) {
    const m = (bm.markets || []).find((x) => x.key === key);
    if (m && m.outcomes?.length) return m;
  }
  return null;
}

export default function SportOddsPage({ sportKey }: { sportKey: string }) {
  const [events, setEvents] = useState<EventOdds[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [stake, setStake] = useState("10");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isParlay = legs.length >= 2;

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/sb/odds/${encodeURIComponent(sportKey)}?markets=h2h,totals`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load odds");
        if (live) {
          setEvents((j?.data || []) as EventOdds[]);
          setErr(null);
        }
      } catch (e: any) {
        if (live) setErr(e?.message || "Error");
      } finally {
        if (live) setLoading(false);
      }
    })();
    const t = setInterval(() => {
      // auto-refresh for live odds
      fetch(`/api/sb/odds/${encodeURIComponent(sportKey)}?markets=h2h,totals`, {
        cache: "no-store",
      })
        .then((r) => r.json().then((j) => ({ r, j })))
        .then(({ r, j }) => {
          if (!r.ok) return;
          setEvents((j?.data || []) as EventOdds[]);
        })
        .catch(() => {});
    }, 30_000);

    return () => {
      live = false;
      clearInterval(t);
    };
  }, [sportKey]);

  const combinedDecimal = useMemo(() => {
    return legs.reduce((acc, l) => acc * americanToDecimal(l.oddsAmerican), 1);
  }, [legs]);

  const potentialPayoutCents = useMemo(() => {
    const v = Number(stake.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return 0;
    const cents = Math.floor(v * 100);
    return Math.max(cents, Math.floor(cents * combinedDecimal));
  }, [stake, combinedDecimal]);

  function toggleLeg(next: Leg) {
    setMsg(null);
    setLegs((prev) => {
      const key = `${next.eventId}:${next.marketKey}`;
      const exists = prev.find((l) => `${l.eventId}:${l.marketKey}` === key);
      if (exists) return prev.filter((l) => `${l.eventId}:${l.marketKey}` !== key);
      // prevent two picks on same event/market (e.g., over and under)
      const withoutSame = prev.filter((l) => `${l.eventId}:${l.marketKey}` !== key);
      return [...withoutSame, next];
    });
  }

  async function place() {
    setMsg(null);
    const v = Number(stake.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      setMsg("Введите сумму ставки");
      return;
    }
    const stakeCents = Math.floor(v * 100);
    if (legs.length === 0) {
      setMsg("Выбери хотя бы один исход");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/sb/place", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: legs.length >= 2 ? "PARLAY" : "SINGLE",
          stakeCents,
          currency: "USDT",
          isLive: legs.some((l) => new Date(l.commenceTime).getTime() <= Date.now()),
          legs,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Не удалось сделать ставку");
      setLegs([]);
      setMsg("Ставка принята ✅");
    } catch (e: any) {
      setMsg(e?.message || "Ошибка");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-32 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/sports" className="text-xs text-slate-400 hover:text-slate-200">
            ← Назад
          </Link>
          <h1 className="mt-2 text-lg font-semibold text-slate-100">{sportKey}</h1>
        </div>
        <Link
          href="/account"
          className="rounded-xl border border-slate-700/70 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/5"
        >
          Баланс
        </Link>
      </div>

      {loading && <div className="text-sm text-slate-300">Загрузка коэффициентов...</div>}
      {err && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>
      )}

      <div className="space-y-3">
        {events.map((ev) => {
          const h2h = pickMarket(ev.bookmakers, "h2h");
          const totals = pickMarket(ev.bookmakers, "totals");
          const time = new Date(ev.commence_time);
          const isLive = time.getTime() <= Date.now();

          const h2hHome = h2h?.outcomes?.find((o) => o.name === ev.home_team);
          const h2hAway = h2h?.outcomes?.find((o) => o.name === ev.away_team);

          // totals share same point
          const over = totals?.outcomes?.find((o) => o.name.toLowerCase().includes("over"));
          const under = totals?.outcomes?.find((o) => o.name.toLowerCase().includes("under"));

          return (
            <div key={ev.id} className="rounded-2xl border border-slate-700/70 bg-[#0b0f1a] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {ev.home_team} vs {ev.away_team}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {isLive ? "LIVE" : time.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <OddsButton
                  label={ev.home_team}
                  odds={h2hHome?.price}
                  active={legs.some((l) => l.eventId === ev.id && l.marketKey === "h2h" && l.selection === ev.home_team)}
                  onClick={() =>
                    h2hHome &&
                    toggleLeg({
                      eventId: ev.id,
                      sportKey: ev.sport_key,
                      commenceTime: ev.commence_time,
                      homeTeam: ev.home_team,
                      awayTeam: ev.away_team,
                      marketKey: "h2h",
                      selection: ev.home_team,
                      oddsAmerican: h2hHome.price,
                    })
                  }
                />
                <OddsButton
                  label={ev.away_team}
                  odds={h2hAway?.price}
                  active={legs.some((l) => l.eventId === ev.id && l.marketKey === "h2h" && l.selection === ev.away_team)}
                  onClick={() =>
                    h2hAway &&
                    toggleLeg({
                      eventId: ev.id,
                      sportKey: ev.sport_key,
                      commenceTime: ev.commence_time,
                      homeTeam: ev.home_team,
                      awayTeam: ev.away_team,
                      marketKey: "h2h",
                      selection: ev.away_team,
                      oddsAmerican: h2hAway.price,
                    })
                  }
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <OddsButton
                  label={`Over ${over?.point ?? ""}`}
                  odds={over?.price}
                  active={legs.some((l) => l.eventId === ev.id && l.marketKey === "totals" && l.selection === "over")}
                  onClick={() =>
                    over &&
                    toggleLeg({
                      eventId: ev.id,
                      sportKey: ev.sport_key,
                      commenceTime: ev.commence_time,
                      homeTeam: ev.home_team,
                      awayTeam: ev.away_team,
                      marketKey: "totals",
                      selection: "over",
                      oddsAmerican: over.price,
                      line: over.point,
                    })
                  }
                />
                <OddsButton
                  label={`Under ${under?.point ?? ""}`}
                  odds={under?.price}
                  active={legs.some((l) => l.eventId === ev.id && l.marketKey === "totals" && l.selection === "under")}
                  onClick={() =>
                    under &&
                    toggleLeg({
                      eventId: ev.id,
                      sportKey: ev.sport_key,
                      commenceTime: ev.commence_time,
                      homeTeam: ev.home_team,
                      awayTeam: ev.away_team,
                      marketKey: "totals",
                      selection: "under",
                      oddsAmerican: under.price,
                      line: under.point,
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* bet slip */}
      <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-3">
        <div className="w-full max-w-xl rounded-2xl border border-slate-700/70 bg-[#0b0f1a]/95 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-100">
              {isParlay ? `Экспресс (${legs.length})` : legs.length === 1 ? "Одиночная" : "Купон"}
            </div>
            <Link href="/account" className="text-xs text-slate-400 hover:text-slate-200">
              Мои ставки
            </Link>
          </div>

          <div className="mt-2 max-h-32 overflow-y-auto">
            {legs.map((l) => (
              <div key={`${l.eventId}:${l.marketKey}:${l.selection}`} className="flex items-center justify-between py-1 text-xs">
                <div className="text-slate-300">
                  <span className="font-semibold text-slate-100">{l.selection}</span>
                  <span className="text-slate-400"> · {l.marketKey}{l.marketKey === "totals" && l.line !== undefined ? ` ${l.line}` : ""}</span>
                </div>
                <button
                  onClick={() => toggleLeg(l)}
                  className="rounded-lg border border-slate-700/70 px-2 py-1 text-slate-200 hover:bg-white/5"
                >
                  ×
                </button>
              </div>
            ))}
            {legs.length === 0 && <div className="text-xs text-slate-500">Выбери исходы выше</div>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-700/70 bg-[#11141f] p-3">
              <div className="text-[10px] text-slate-400">Ставка (USDT)</div>
              <input
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
              />
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-[#11141f] p-3">
              <div className="text-[10px] text-slate-400">Потенц. выплата</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {potentialPayoutCents ? `${formatMoney(potentialPayoutCents)} USDT` : "—"}
              </div>
            </div>
          </div>

          {msg && <div className="mt-2 text-xs text-slate-200">{msg}</div>}

          <button
            disabled={placing}
            onClick={place}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {placing ? "Ставка..." : "Поставить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OddsButton({
  label,
  odds,
  active,
  onClick,
}: {
  label: string;
  odds?: number;
  active: boolean;
  onClick: () => void;
}) {
  const disabled = odds === undefined || odds === null;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={
        "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs " +
        (active
          ? "border-blue-400 bg-blue-500/10 text-slate-100"
          : "border-slate-700/70 bg-[#11141f] text-slate-200 hover:bg-white/5") +
        (disabled ? " opacity-50" : "")
      }
    >
      <span className="truncate pr-2">{label}</span>
      <span className="font-semibold">{odds ?? "—"}</span>
    </button>
  );
}
