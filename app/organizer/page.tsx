"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "../components/BrandMark";
import { getPoolsByIds } from "../lib/poolApi";
import {
  getOrganizerPoolIds,
  getOrganizerPoolMeta,
} from "../lib/organizerStorage";

type OrganizerPool = {
  id: string;
  pool_name: string;
  golf_event: string;
  number_of_teams: number;
  golfers_per_team: number;
  scores_to_count: number;
  team_names?: string[];
  draft_order?: string[];
  draft_locked?: boolean;
  archived?: boolean;
};

export default function OrganizerPage() {
  const [pools, setPools] = useState<OrganizerPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizerPools() {
      const poolIds = getOrganizerPoolIds();
      const savedPools = await getPoolsByIds(poolIds);

      const activePools = savedPools
        .map((pool: OrganizerPool) => {
          const meta = getOrganizerPoolMeta(pool.id);

          return {
            ...pool,
            archived: Boolean(pool.archived || meta.archived),
            draft_locked: Boolean(pool.draft_locked || meta.draftLocked),
          };
        })
        .filter((pool: OrganizerPool) => !pool.archived);

      setPools(activePools);
      setIsLoading(false);
    }

    loadOrganizerPools();
  }, []);

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="md" />
          </Link>

          <a href="/create-pool" className="text-sm font-medium text-emerald-300">
            + Create Pool
          </a>
        </div>

        <div className="mt-10">
          <p className="text-sm font-extrabold uppercase text-emerald-400">
            Organizer
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-none md:text-6xl">
            Pool Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">
            Manage pools created on this device. Update settings, jump into the
            draft, or share the lobby and leaderboard with your group.
          </p>
        </div>

        {isLoading ? (
          <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <p className="text-slate-400">Loading organizer pools...</p>
          </section>
        ) : pools.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <h2 className="text-2xl font-black">No organizer pools yet</h2>
            <p className="mt-3 text-slate-400">
              Create a pool from this browser and it will appear here.
            </p>
            <a
              href="/create-pool"
              className="mt-6 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300"
            >
              Create Pool
            </a>
          </section>
        ) : (
          <section className="mt-10 grid gap-5 lg:grid-cols-2">
            {pools.map((pool) => (
              <article
                key={pool.id}
                className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-emerald-300">
                      {pool.golf_event}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {pool.pool_name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {pool.number_of_teams} teams • {pool.golfers_per_team} golfers per team • Best {pool.scores_to_count} count
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      pool.draft_locked
                        ? "bg-red-400/10 text-red-200"
                        : "bg-emerald-400/10 text-emerald-300"
                    }`}
                  >
                    {pool.draft_locked ? "Draft Locked" : "Draft Open"}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <a
                    href={`/pool?id=${pool.id}`}
                    className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40"
                  >
                    Lobby
                  </a>
                  <a
                    href={`/draft?id=${pool.id}`}
                    className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40"
                  >
                    Draft Room
                  </a>
                  <a
                    href={`/leaderboard?id=${pool.id}`}
                    className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40"
                  >
                    Leaderboard
                  </a>
                  <a
                    href={`/organizer/manage?id=${pool.id}`}
                    className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-emerald-300"
                  >
                    Manage
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
