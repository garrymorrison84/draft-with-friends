"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPool, getDraftPicks } from "../lib/poolApi";
import BrandMark from "../components/BrandMark";

type Pool = {
  id: string;
  poolName: string;
  golfEvent: string;
  numberOfTeams: number;
  golfersPerTeam: number;
  scoresToCount: number;
  teamNames: string[];
  draftOrder: string[];
};

export default function PoolPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [pickCount, setPickCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPoolPage() {
      const params = new URLSearchParams(window.location.search);
      const poolId = params.get("id");

      if (!poolId) {
        setIsLoading(false);
        return;
      }

      const savedPool = await getPool(poolId);

      if (!savedPool) {
        setIsLoading(false);
        return;
      }

      const formattedPool: Pool = {
        id: savedPool.id,
        poolName: savedPool.pool_name,
        golfEvent: savedPool.golf_event,
        numberOfTeams: savedPool.number_of_teams,
        golfersPerTeam: savedPool.golfers_per_team,
        scoresToCount: savedPool.scores_to_count,
        teamNames: savedPool.team_names,
        draftOrder: savedPool.draft_order,
      };

      setPool(formattedPool);

      const picks = await getDraftPicks(formattedPool.id);
      setPickCount(picks.length);

      setIsLoading(false);
    }

    loadPoolPage();

const interval = setInterval(() => {
  loadPoolPage();
}, 3000);

return () => clearInterval(interval);
}, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <BrandMark size="md" />
          <h1 className="text-4xl font-black">Loading pool...</h1>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <BrandMark size="md" />
          <h1 className="text-4xl font-black">No pool found</h1>
          <a href="/create-pool" className="mt-6 inline-block text-emerald-300">
            Create a pool →
          </a>
        </div>
      </main>
    );
  }

  const totalPicks = pool.numberOfTeams * pool.golfersPerTeam;
const draftPercent = Math.round((pickCount / totalPicks) * 100);
const draftComplete = pickCount === totalPicks;

const currentPickIndex = pickCount;
const currentRound = Math.floor(currentPickIndex / pool.numberOfTeams) + 1;
const pickInRound = (currentPickIndex % pool.numberOfTeams) + 1;
const isSnakeRound = (currentRound - 1) % 2 === 1;

const currentTeamIndex = isSnakeRound
  ? pool.draftOrder.length - pickInRound
  : pickInRound - 1;

const currentTeam = draftComplete
  ? "Draft Complete"
  : pool.draftOrder[currentTeamIndex];

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="md" />
          </Link>

          <a href="/create-pool" className="text-sm font-medium text-emerald-300">
            ← Create Another Pool
          </a>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              {pool.golfEvent}
            </p>

            <h1 className="mt-2 text-5xl font-black">{pool.poolName}</h1>

            <p className="mt-4 text-slate-400">
              Snake draft • {pool.numberOfTeams} teams • {pool.golfersPerTeam} golfers per team • Best {pool.scoresToCount} scores count
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {!draftComplete && (
              <a
                href={`/draft?id=${pool.id}`}
                className="rounded-2xl bg-emerald-400 px-8 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:scale-105 hover:bg-emerald-300"
              >
                {pickCount > 0 ? "Continue Draft →" : "Start Draft →"}
              </a>
            )}

            {pickCount > 0 && (
              <a
                href={`/leaderboard?id=${pool.id}`}
                className="rounded-2xl border border-white/15 px-8 py-4 text-center text-lg font-black text-white transition hover:bg-[#111827]"
              >
                View Leaderboard
              </a>
            )}

            <a
              href={`/organizer/manage?id=${pool.id}`}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-8 py-4 text-center text-lg font-black text-emerald-300 transition hover:bg-emerald-400/20"
            >
              Manage Pool
            </a>
          </div>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <StatCard label="Teams" value={String(pool.numberOfTeams)} />
          <StatCard label="Golfers Per Team" value={String(pool.golfersPerTeam)} />
          <StatCard label="Scores Count" value={String(pool.scoresToCount)} />
        </section>

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Draft Progress</h2>
              <p className="mt-2 text-sm text-slate-400">
                {pickCount} / {totalPicks} picks complete
              </p>
            </div>

            <div className="text-4xl font-black text-emerald-300">
              {draftPercent}%
            </div>
          </div>

          <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#1F2937]">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${draftPercent}%` }}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="font-bold text-emerald-300">
  {draftComplete
    ? "Draft Complete"
    : `${currentTeam} is on the clock`}
</p>

<p className="mt-2 text-sm leading-6 text-slate-300">
  {draftComplete
    ? "Teams are locked. View the leaderboard to track standings."
    : `Round ${currentRound} • Pick ${pickInRound} of ${pool.numberOfTeams} this round • Overall pick ${currentPickIndex + 1} of ${totalPicks}`}
</p>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40 lg:col-span-2">
            <h2 className="text-2xl font-bold">Draft Order</h2>
            <p className="mt-2 text-sm text-slate-400">
              Teams draft in this order. The order reverses each round.
            </p>

            <div className="mt-6 space-y-3">
              {pool.draftOrder.map((team, index) => (
                <div
                  key={`${team}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#1F2937] p-4"
                >
                  <p className="font-bold">{team}</p>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-lg font-black text-slate-950">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <h2 className="text-2xl font-bold">Invite Friends</h2>

            <p className="mt-3 text-slate-400">
              Share this link so everyone can follow the pool.
            </p>

            <div className="mt-6 rounded-xl border border-white/5 bg-[#1F2937] p-4 text-sm text-slate-300">
              {`draftwithfriends.com/pool?id=${pool.id}`}
            </div>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/pool?id=${pool.id}`
                )
              }
              className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-bold text-slate-950"
            >
              Copy Invite Link
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}
