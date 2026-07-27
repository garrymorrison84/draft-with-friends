"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../../components/BrandMark";
import {
  eligibleWinsTeams,
  formatWinTotal,
  loadWinsDraftPicks,
  loadWinsPool,
  type WinsDraftPick,
  type WinsPool,
  type WinsTeam,
} from "../lib/storage";

type ManagerStanding = {
  manager: string;
  wins: number;
  projectedWins: number;
  teams: WinsTeam[];
};

const conferenceStyles: Record<string, string> = {
  ACC: "border-white/80 bg-white/15 text-white shadow-white/10",
  "Big Ten": "border-cyan-200 bg-cyan-500/45 text-cyan-50 shadow-cyan-500/20",
  "Big 12": "border-violet-200 bg-violet-500/45 text-violet-50 shadow-violet-500/20",
  "Pac-12": "border-amber-200 bg-amber-500/45 text-amber-50 shadow-amber-500/20",
  SEC: "border-rose-200 bg-rose-500/45 text-rose-50 shadow-rose-500/20",
  Independents: "border-emerald-200 bg-emerald-500/45 text-emerald-50 shadow-emerald-500/20",
};

const defaultConferenceStyle =
  "border-slate-100 bg-slate-400/45 text-white shadow-slate-400/20";

function getConferenceStyle(conference: string) {
  return conferenceStyles[conference] ?? defaultConferenceStyle;
}

function formatConferenceLabel(conference: string) {
  if (conference === "Independents") return "Ind";
  if (conference === "Big Ten") return "Big 10";
  if (conference === "Pac-12") return "Pac 12";
  return conference;
}

export default function WinsLeaderboardPage() {
  const [pool, setPool] = useState<WinsPool | null>(null);
  const [picks, setPicks] = useState<WinsDraftPick[]>([]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadWinsPool(id);
    if (!savedPool) return;

    setPool(savedPool);
    setPicks(loadWinsDraftPicks(savedPool.id));
  }, []);

  const standings = useMemo<ManagerStanding[]>(() => {
    if (!pool) return [];

    const teams = eligibleWinsTeams(pool);

    return pool.teamNames
      .map((manager) => {
        const draftedTeams = picks
          .filter((pick) => pick.manager === manager)
          .map((pick) => teams.find((team) => team.id === pick.teamId))
          .filter((team): team is WinsTeam => Boolean(team));

        return {
          manager,
          teams: draftedTeams,
          wins: draftedTeams.reduce((sum, team) => sum + team.wins, 0),
          projectedWins: draftedTeams.reduce((sum, team) => sum + team.winTotal, 0),
        };
      })
      .sort((a, b) => b.wins - a.wins || b.projectedWins - a.projectedWins);
  }, [picks, pool]);

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] px-5 py-8 text-white">
        <BrandMark size="md" />
        <h1 className="mt-8 text-4xl font-black">Pool not found</h1>
      </main>
    );
  }

  const totalPicks = pool.numberOfTeams * pool.picksPerTeam;
  const draftComplete = picks.length >= totalPicks;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/football/wins/pool?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-center font-black text-emerald-300 transition hover:bg-emerald-400/15"
            >
              Pool Lobby
            </Link>
            <Link
              href={`/football/wins/draft?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-center font-black text-emerald-300 transition hover:bg-emerald-400/15"
            >
              Draft Board
            </Link>
          </div>
        </div>

        <section className="mt-8">
          <p className="text-lg font-black text-emerald-300">
            College Football Wins Pool
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight sm:text-6xl">
            {pool.poolName}
          </h1>
          <p className="mt-3 text-lg font-bold text-slate-400">
            {draftComplete
              ? "Season-long wins tracking board"
              : `${picks.length} / ${totalPicks} picks complete`}
          </p>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-5 lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-2xl font-black">Standings</h2>
            <div className="mt-4 space-y-2">
              {standings.map((standing, index) => (
                <div
                  key={standing.manager}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                    index === 0
                      ? "border-emerald-400/35 bg-emerald-400/10"
                      : "border-white/5 bg-[#1F2937]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">
                      {index + 1}. {standing.manager}
                    </p>
                    <p className="text-xs font-bold text-slate-500 sm:text-sm">
                      {formatWinTotal(standing.projectedWins)} preseason win total
                    </p>
                  </div>
                  <span className="text-2xl font-black text-emerald-300">
                    {standing.wins}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <section className="grid gap-5">
            {standings.map((standing, index) => (
              <div
                key={standing.manager}
                className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                      Rank {index + 1}
                    </p>
                    <h2 className="mt-1 text-3xl font-black sm:text-4xl">
                      {standing.manager}
                    </h2>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-4xl font-black leading-none text-emerald-300 sm:text-5xl">
                      {standing.wins}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500 sm:text-sm">
                      Current Wins
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700/70">
                  <div className="grid grid-cols-[minmax(0,1fr)_3.3rem_4.25rem_3.8rem] items-center gap-2 bg-[#1F2937] px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:grid-cols-[minmax(0,1.5fr)_0.65fr_0.75fr_0.75fr] sm:text-xs">
                    <span>Team</span>
                    <span className="text-center">
                      <span className="sm:hidden">Rec</span>
                      <span className="hidden sm:inline">Record</span>
                    </span>
                    <span className="text-center leading-tight">
                      <span className="sm:hidden">Total</span>
                      <span className="hidden sm:inline">Win Total</span>
                    </span>
                    <span className="text-center">
                      <span className="sm:hidden">Left</span>
                      <span className="hidden sm:inline">Remaining</span>
                    </span>
                  </div>
                  {standing.teams.map((team) => (
                    <div
                      key={team.id}
                      className="grid grid-cols-[minmax(0,1fr)_3.3rem_4.25rem_3.8rem] items-center gap-2 border-t border-white/5 px-3 py-3 text-sm font-bold text-slate-300 sm:grid-cols-[minmax(0,1.5fr)_0.65fr_0.75fr_0.75fr]"
                    >
                      <div className="grid min-w-0 grid-cols-[3.2rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[4.75rem_minmax(0,1fr)]">
                        <span
                          className={`inline-flex h-8 items-center justify-center rounded-full border px-2 text-[10px] font-black shadow-lg sm:text-xs ${getConferenceStyle(
                            team.conference
                          )}`}
                        >
                          {formatConferenceLabel(team.conference)}
                        </span>
                        <p className="min-w-0 truncate text-base font-black text-white">
                          {team.name}
                        </p>
                      </div>
                      <span className="text-center">{team.wins}-{team.losses}</span>
                      <span className="text-center">{formatWinTotal(team.winTotal)}</span>
                      <span className="text-center">
                        {team.schedule.filter((game) => !game.result).length}
                      </span>
                    </div>
                  ))}
                  {standing.teams.length === 0 && (
                    <div className="border-t border-white/5 px-3 py-6 text-sm font-bold text-slate-500">
                      No teams drafted yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
