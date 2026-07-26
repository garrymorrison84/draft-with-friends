"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../../components/BrandMark";
import {
  eligibleWinsTeams,
  formatWinTotal,
  loadWinsDraftPicks,
  loadWinsPool,
  saveWinsDraftPicks,
  snakeManagerForPick,
  winsConferenceOptions,
  type WinsDraftPick,
  type WinsPool,
  type WinsTeam,
} from "../lib/storage";

const conferenceStyles: Record<
  string,
  { card: string; badge: string; board: string; text: string }
> = {
  SEC: {
    card: "border-rose-300/45 bg-rose-950/35 hover:border-rose-200/80",
    badge: "bg-rose-400 text-rose-950",
    board: "border-rose-300/35 bg-rose-950/35",
    text: "text-rose-200",
  },
  "Big Ten": {
    card: "border-sky-300/45 bg-sky-950/35 hover:border-sky-200/80",
    badge: "bg-sky-300 text-sky-950",
    board: "border-sky-300/35 bg-sky-950/35",
    text: "text-sky-200",
  },
  "Big 12": {
    card: "border-amber-300/45 bg-amber-950/30 hover:border-amber-200/80",
    badge: "bg-amber-300 text-amber-950",
    board: "border-amber-300/35 bg-amber-950/30",
    text: "text-amber-200",
  },
  ACC: {
    card: "border-violet-300/45 bg-violet-950/35 hover:border-violet-200/80",
    badge: "bg-violet-300 text-violet-950",
    board: "border-violet-300/35 bg-violet-950/35",
    text: "text-violet-200",
  },
  "Pac-12": {
    card: "border-orange-300/45 bg-orange-950/30 hover:border-orange-200/80",
    badge: "bg-orange-300 text-orange-950",
    board: "border-orange-300/35 bg-orange-950/30",
    text: "text-orange-200",
  },
  Independents: {
    card: "border-emerald-300/45 bg-emerald-950/30 hover:border-emerald-200/80",
    badge: "bg-emerald-300 text-emerald-950",
    board: "border-emerald-300/35 bg-emerald-950/30",
    text: "text-emerald-200",
  },
};

const fallbackConferenceStyle = {
  card: "border-white/5 bg-[#1F2937] hover:border-emerald-400/30",
  badge: "bg-emerald-400 text-slate-950",
  board: "border-slate-700/60 bg-[#030712]",
  text: "text-emerald-200",
};

function conferenceStyle(conference: string) {
  return conferenceStyles[conference] ?? fallbackConferenceStyle;
}

function pickLabel(pickIndex: number, teamCount: number) {
  const round = Math.floor(pickIndex / teamCount) + 1;
  const pickInRound = (pickIndex % teamCount) + 1;
  return `${round}.${pickInRound}`;
}

export default function WinsDraftPage() {
  const [pool, setPool] = useState<WinsPool | null>(null);
  const [picks, setPicks] = useState<WinsDraftPick[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<WinsTeam | null>(null);
  const [query, setQuery] = useState("");
  const [conferenceFilter, setConferenceFilter] = useState("ALL");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadWinsPool(id);
    if (!savedPool) return;

    const savedPicks = loadWinsDraftPicks(savedPool.id);
    setPool(savedPool);
    setPicks(savedPicks);
    setSelectedTeam(eligibleWinsTeams(savedPool).find((team) => !savedPicks.some((pick) => pick.teamId === team.id)) ?? null);
  }, []);

  const teams = useMemo(() => (pool ? eligibleWinsTeams(pool) : []), [pool]);

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] px-5 py-8 text-white">
        <BrandMark size="md" />
        <h1 className="mt-8 text-4xl font-black">Pool not found</h1>
      </main>
    );
  }

  const totalPicks = pool.numberOfTeams * pool.picksPerTeam;
  const draftedIds = new Set(picks.map((pick) => pick.teamId));
  const draftComplete = picks.length >= totalPicks;
  const currentManager = draftComplete
    ? null
    : snakeManagerForPick(pool, picks.length);
  const availableConferences = winsConferenceOptions.filter((conference) =>
    pool.conferences.includes(conference)
  );
  const filteredTeams = teams
    .filter((team) => !draftedIds.has(team.id))
    .filter(
      (team) =>
        conferenceFilter === "ALL" || team.conference === conferenceFilter
    )
    .filter((team) => {
      const text = `${team.name} ${team.conference}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });
  const boardSlots = Array.from({ length: totalPicks }).map((_, index) => {
    const pick = picks[index];
    const team = pick ? teams.find((item) => item.id === pick.teamId) : null;
    const manager = pick?.manager ?? snakeManagerForPick(pool, index);

    return { index, pick, team, manager };
  });

  function draftTeam(team: WinsTeam) {
    if (!pool) return;
    if (draftComplete || !currentManager) return;

    const nextPicks = [
      ...picks,
      {
        teamId: team.id,
        manager: currentManager,
        pickNumber: picks.length + 1,
      },
    ];

    setPicks(nextPicks);
    saveWinsDraftPicks(pool.id, nextPicks);

    const nextTeam = teams.find(
      (item) => item.id !== team.id && !nextPicks.some((pick) => pick.teamId === item.id)
    );
    setSelectedTeam(nextTeam ?? null);
  }

  function undoPick() {
    if (!pool) return;
    const nextPicks = picks.slice(0, -1);
    setPicks(nextPicks);
    saveWinsDraftPicks(pool.id, nextPicks);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <div className="flex gap-3">
            <Link
              href={`/football/wins/pool?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 font-black text-emerald-300"
            >
              Pool Lobby
            </Link>
            <Link
              href={`/football/wins/leaderboard?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 font-black text-emerald-300"
            >
              Leaderboard
            </Link>
          </div>
        </div>

        <section className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-black text-emerald-300">
              College Football Wins Draft
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight sm:text-6xl">
              {pool.poolName}
            </h1>
            <p className="mt-3 text-lg font-bold text-slate-400">
              {draftComplete
                ? "Draft complete"
                : `${currentManager} is on the clock`}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={undoPick}
              disabled={picks.length === 0}
              className="rounded-xl border border-white/10 px-5 py-3 font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo Pick
            </button>
            {draftComplete && (
              <Link
                href={`/football/wins/leaderboard?id=${pool.id}`}
                className="rounded-xl bg-emerald-400 px-5 py-3 text-center font-black text-slate-950"
              >
                View Season Board
              </Link>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_390px]">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black">Draft Board</h2>
                <p className="mt-2 text-sm font-bold text-slate-400">
                  Snake draft college teams. Highest combined season wins takes it.
                </p>
              </div>
              <p className="text-3xl font-black text-emerald-300">
                {picks.length}/{totalPicks}
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700/70">
              <div
                className="grid bg-emerald-700/80"
                style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(150px, 1fr))` }}
              >
                {pool.draftOrder.map((manager) => (
                  <div
                    key={manager}
                    className="border-r border-white/10 px-4 py-4 text-center last:border-r-0"
                  >
                    <p className="truncate text-sm font-black uppercase tracking-widest text-emerald-100">
                      {manager}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="grid bg-[#030712]"
                style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(150px, 1fr))` }}
              >
                {boardSlots.map(({ index, team }) => (
                  <div
                    key={index}
                    className={`relative min-h-36 border-b border-r p-4 last:border-r-0 ${
                      team ? conferenceStyle(team.conference).board : "border-slate-700/60 bg-[#030712]"
                    }`}
                  >
                    <span className="absolute right-3 top-3 rounded-full bg-blue-700 px-3 py-1 text-xs font-black">
                      {pickLabel(index, pool.numberOfTeams)}
                    </span>
                    {team ? (
                      <div className="pt-8">
                        <p className="text-xl font-black">{team.name}</p>
                        <p className={`mt-2 text-sm font-bold ${conferenceStyle(team.conference).text}`}>
                          {team.conference} | {team.wins}-{team.losses}
                        </p>
                      </div>
                    ) : (
                      <div className="pt-8 text-sm font-bold text-slate-600">
                        Awaiting selection
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-5">
              <h2 className="text-2xl font-black">Eligible Teams</h2>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search teams..."
                className="mt-4 w-full rounded-xl border border-white/5 bg-[#030712] px-4 py-3 font-bold text-white outline-none placeholder:text-slate-600"
              />

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {["ALL", ...availableConferences].map((conference) => {
                  const active = conferenceFilter === conference;

                  return (
                    <button
                      key={conference}
                      type="button"
                      onClick={() => setConferenceFilter(conference)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                        active
                          ? "border-emerald-300 bg-emerald-300 text-slate-950"
                          : "border-white/10 bg-[#030712] text-slate-300 hover:border-emerald-300/40"
                      }`}
                    >
                      {conference === "ALL" ? "All" : conference}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filteredTeams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedTeam?.id === team.id
                        ? "border-emerald-300 bg-emerald-300/10"
                        : conferenceStyle(team.conference).card
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black">{team.name}</p>
                        <p className="text-sm font-bold text-slate-500">
                          {team.conference} | {team.wins}-{team.losses}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${
                          conferenceStyle(team.conference).badge
                        }`}
                      >
                        {formatWinTotal(team.winTotal)}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredTeams.length === 0 && (
                  <div className="rounded-2xl border border-white/5 bg-[#1F2937] p-4 text-sm font-bold text-slate-500">
                    No available teams match that filter.
                  </div>
                )}
              </div>
            </section>

            {selectedTeam && (
              <section
                className={`rounded-3xl border p-4 shadow-xl shadow-black/40 sm:p-5 ${
                  conferenceStyle(selectedTeam.conference).board
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-sm font-black uppercase tracking-widest ${
                        conferenceStyle(selectedTeam.conference).text
                      }`}
                    >
                      Team Card
                    </p>
                    <h2 className="mt-2 text-3xl font-black">{selectedTeam.name}</h2>
                    <p className="mt-1 text-sm font-bold text-slate-400">
                      {selectedTeam.conference} | Win Total {formatWinTotal(selectedTeam.winTotal)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#030712] px-3 py-1 text-sm font-black text-slate-300">
                    {selectedTeam.wins}-{selectedTeam.losses}
                  </span>
                </div>

                <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {selectedTeam.schedule.map((game) => (
                    <div
                      key={`${game.week}-${game.opponent}`}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-[#030712] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-black">{game.week}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {game.location} vs {game.opponent}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-black ${
                          game.result === "W"
                            ? "text-emerald-300"
                            : game.result === "L"
                              ? "text-rose-300"
                              : "text-slate-500"
                        }`}
                      >
                        {game.result ?? "TBD"}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => draftTeam(selectedTeam)}
                  disabled={draftComplete || draftedIds.has(selectedTeam.id)}
                  className="mt-5 w-full rounded-xl bg-emerald-400 px-5 py-4 text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Draft {selectedTeam.name}
                </button>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
