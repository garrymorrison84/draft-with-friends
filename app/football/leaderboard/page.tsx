"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballDraftPick,
  FootballPlayer,
  FootballPool,
  footballPlayers,
  loadFootballDraftPicks,
  loadFootballPool,
} from "../lib/storage";
import {
  getLiveScore,
  getProjectedScore,
  getProjectionSummary,
} from "../lib/scoringEngine";

export default function FootballLeaderboardPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [players, setPlayers] = useState<FootballPlayer[]>(footballPlayers);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadFootballPool(id);
    if (savedPool) {
      setPool(savedPool);
      setPicks(loadFootballDraftPicks(savedPool.id));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReplayPlayers() {
      try {
        const response = await fetch("/api/football/replay", { cache: "no-store" });
        if (!response.ok) throw new Error("Replay player pool failed");
        const data = await response.json();
        const replayPlayers = data?.playerPool?.players;

        if (!cancelled && Array.isArray(replayPlayers) && replayPlayers.length > 0) {
          setPlayers(replayPlayers);
        }
      } catch {
        if (!cancelled) {
          setPlayers(footballPlayers);
        }
      }
    }

    loadReplayPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  const standings = useMemo(() => {
    if (!pool) return [];

    return pool.teamNames
      .map((team) => {
        const draftedPlayers = picks
          .filter((pick) => pick.team === team)
          .map((pick) => players.find((player) => player.id === pick.playerId))
          .filter(Boolean) as FootballPlayer[];

        const projected = draftedPlayers.reduce(
          (sum, player) => sum + getProjectedScore(player, pool.scoring).total,
          0
        );
        const live = draftedPlayers.reduce(
          (sum, player) => sum + getLiveScore(player, pool.scoring).total,
          0
        );

        return {
          team,
          players: draftedPlayers,
          projected,
          live,
        };
      })
      .sort((a, b) => b.live - a.live);
  }, [picks, players, pool]);

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <BrandMark size="md" />
          <h1 className="mt-8 text-4xl font-black">No football pool found</h1>
          <Link href="/football/create" className="mt-6 inline-block text-emerald-300">
            Create a football pool
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-black sm:text-5xl md:text-7xl">Leaderboard</h1>
            <p className="mt-4 break-words text-base font-bold text-slate-400 sm:text-xl">
              {pool.poolName} • {pool.season} • Replay live scoring
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/football/draft?id=${pool.id}`}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-6 py-4 text-center text-base font-black text-emerald-300 hover:bg-emerald-400/15 sm:px-8 sm:text-lg"
            >
              Draft Room
            </Link>
            <Link
              href="/football"
              className="rounded-2xl bg-emerald-400 px-6 py-4 text-center text-base font-black text-slate-950 hover:bg-emerald-300 sm:px-8 sm:text-lg"
            >
              Football Home
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-8">
            <h2 className="text-2xl font-black uppercase tracking-wide text-slate-300">
              Standings
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Totals use this pool&apos;s scoring settings against replay stat
              lines.
            </p>
            <div className="mt-6 space-y-3">
              {standings.map((team, index) => (
                <div
                  key={team.team}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#1F2937] p-4 sm:p-5"
                >
                  <div className="min-w-0 flex items-center gap-3 sm:gap-4">
                    <span className="shrink-0 text-xl font-black text-slate-400 sm:text-2xl">
                      {index + 1}
                    </span>
                    <span className="truncate text-xl font-black sm:text-2xl">{team.team}</span>
                  </div>
                  <span className="shrink-0 text-2xl font-black text-emerald-300 sm:text-3xl">
                    {team.live.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-8">
            <h2 className="text-2xl font-black">Team Player Scoring</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {standings.map((team) => (
                <div key={team.team} className="min-w-0 rounded-2xl border border-slate-700/60 bg-[#1F2937] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-black">{team.team}</h3>
                    <span className="text-2xl font-black text-emerald-300">
                      {team.live.toFixed(1)}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {team.players.length === 0 ? (
                      <p className="text-slate-500">No players drafted yet.</p>
                    ) : (
                      team.players.map((player) => {
                        const liveScore = getLiveScore(player, pool.scoring);
                        const projectedScore = getProjectedScore(player, pool.scoring);
                        const summary = getProjectionSummary(player, pool.scoring);

                        return (
                          <div
                            key={player.id}
                            className="border-t border-white/5 pt-4"
                          >
                            <div className="grid grid-cols-[54px_1fr_70px] items-start gap-3">
                              <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-center text-sm font-black text-emerald-300">
                                {player.position}
                              </span>
                              <div className="min-w-0">
                                <p className="break-words font-black">{player.name}</p>
                                <p className="break-words text-sm font-bold text-slate-500">
                                  {player.school} • {player.opponent}
                                </p>
                              </div>
                              <span className="text-right text-lg font-black text-emerald-300">
                                {liveScore.total.toFixed(1)}
                              </span>
                            </div>

                            <div className="mt-3 rounded-xl bg-[#030712] p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-slate-400">
                                  Projected
                                </span>
                                <span className="font-black text-slate-200">
                                  {projectedScore.total.toFixed(1)}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 text-xs font-semibold text-slate-500">
                                {summary.map((line) => (
                                  <p key={line}>{line}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
