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

  const leader = standings[0];
  const totalPicks = pool.numberOfTeams * pool.picksPerTeam;
  const draftComplete = picks.length >= totalPicks;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/football/wins/pool?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-center font-black text-emerald-300"
            >
              Pool Lobby
            </Link>
            <Link
              href={`/football/wins/draft?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-center font-black text-emerald-300"
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

        <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
                Current Leader
              </p>
              <h2 className="mt-2 text-4xl font-black">{leader?.manager ?? "No picks yet"}</h2>
              <p className="mt-2 text-slate-400">
                {leader
                  ? `${leader.wins} current wins across ${leader.teams.length} drafted teams`
                  : "Start the draft to populate the standings."}
              </p>
            </div>
            {leader && (
              <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
                <StatCard label="Current Wins" value={leader.wins.toString()} />
                <StatCard label="Win Total" value={formatWinTotal(leader.projectedWins)} />
              </div>
            )}
          </div>
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
                    <p className="text-xs font-bold text-slate-500">
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                      Rank {index + 1}
                    </p>
                    <h2 className="mt-1 text-3xl font-black">{standing.manager}</h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-4xl font-black text-emerald-300">
                      {standing.wins}
                    </p>
                    <p className="text-sm font-bold text-slate-500">Current Wins</p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700/70">
                  <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr] bg-[#1F2937] px-3 py-3 text-xs font-black uppercase tracking-widest text-slate-400">
                    <span>Team</span>
                    <span>Record</span>
                    <span>Win Total</span>
                    <span>Remaining</span>
                  </div>
                  {standing.teams.map((team) => (
                    <div
                      key={team.id}
                      className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr] items-center border-t border-white/5 px-3 py-3 text-sm font-bold text-slate-300"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-white">{team.name}</p>
                        <p className="text-xs text-slate-500">{team.conference}</p>
                      </div>
                      <span>{team.wins}-{team.losses}</span>
                      <span>{formatWinTotal(team.winTotal)}</span>
                      <span>{team.schedule.filter((game) => !game.result).length}</span>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1F2937] p-4">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}
