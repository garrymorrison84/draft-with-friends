"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballDraftPick,
  FootballPool,
  footballPlayers,
  loadFootballDraftPicks,
  loadFootballPool,
} from "../lib/storage";

export default function FootballLeaderboardPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadFootballPool(id);
    if (savedPool) {
      setPool(savedPool);
      setPicks(loadFootballDraftPicks(savedPool.id));
    }
  }, []);

  const standings = useMemo(() => {
    if (!pool) return [];

    return pool.teamNames
      .map((team) => {
        const players = picks
          .filter((pick) => pick.team === team)
          .map((pick) => footballPlayers.find((player) => player.id === pick.playerId))
          .filter(Boolean) as typeof footballPlayers;

        const projected = players.reduce((sum, player) => sum + player.projected, 0);

        return {
          team,
          players,
          projected,
          live: projected - players.length * 1.3,
        };
      })
      .sort((a, b) => b.live - a.live);
  }, [picks, pool]);

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
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-5xl font-black md:text-7xl">Leaderboard</h1>
            <p className="mt-4 text-xl font-bold text-slate-400">
              {pool.poolName} • {pool.season} • Weekly scoring preview
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/football/draft?id=${pool.id}`}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-8 py-4 text-center text-lg font-black text-emerald-300 hover:bg-emerald-400/15"
            >
              Draft Room
            </Link>
            <Link
              href="/football"
              className="rounded-2xl bg-emerald-400 px-8 py-4 text-center text-lg font-black text-slate-950 hover:bg-emerald-300"
            >
              Football Home
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <h2 className="text-2xl font-black uppercase tracking-wide text-slate-300">
              Standings
            </h2>
            <div className="mt-6 space-y-3">
              {standings.map((team, index) => (
                <div
                  key={team.team}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#1F2937] p-5"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-slate-400">
                      {index + 1}
                    </span>
                    <span className="text-2xl font-black">{team.team}</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-300">
                    {team.live.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <h2 className="text-2xl font-black">Team Player Scoring</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {standings.map((team) => (
                <div key={team.team} className="rounded-2xl border border-slate-700/60 bg-[#1F2937] p-5">
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
                      team.players.map((player) => (
                        <div
                          key={player.id}
                          className="grid grid-cols-[54px_1fr_64px] items-center gap-3 border-t border-white/5 pt-3"
                        >
                          <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-center text-sm font-black text-emerald-300">
                            {player.position}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-black">{player.name}</p>
                            <p className="truncate text-sm font-bold text-slate-500">
                              {player.school}
                            </p>
                          </div>
                          <span className="text-right text-lg font-black">
                            {(player.projected - 1.3).toFixed(1)}
                          </span>
                        </div>
                      ))
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
