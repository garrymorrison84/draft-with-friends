"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import BrandMark from "../components/BrandMark";
import { getCurrentOrganizerUser, getOrganizerPools } from "../lib/poolApi";
import { supabase } from "../lib/supabase";

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
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [pools, setPools] = useState<OrganizerPool[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizerPools() {
      const user = await getCurrentOrganizerUser();

      if (!user) {
        window.location.href = "/organizer/sign-in?redirect=/organizer";
        return;
      }

      setOrganizer(user);

      const savedPools = await getOrganizerPools(user.id);
      setPools(savedPools as OrganizerPool[]);
      setIsLoading(false);
    }

    loadOrganizerPools();
  }, []);

  const activePools = useMemo(
    () => pools.filter((pool) => !pool.archived),
    [pools]
  );
  const archivedPools = useMemo(
    () => pools.filter((pool) => pool.archived),
    [pools]
  );
  const visiblePools = view === "active" ? activePools : archivedPools;

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            {organizer && (
              <span className="text-sm text-slate-400">{organizer.email}</span>
            )}
            <Link
              href="/create-pool"
              className="text-sm font-medium text-emerald-300"
            >
              + Create Pool
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="text-sm font-medium text-slate-400 transition hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-sm font-extrabold uppercase text-emerald-400">
            Organizer
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
            Pool Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">
            Manage every pool tied to your organizer account, including active
            drafts and archived pools you may need to revisit later.
          </p>
        </div>

        <div className="mt-8 inline-grid grid-cols-2 rounded-2xl border border-white/5 bg-[#111827] p-1 shadow-xl shadow-black/40">
          <button
            type="button"
            onClick={() => setView("active")}
            className={`rounded-xl px-5 py-3 text-sm font-black transition ${
              view === "active"
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Active ({activePools.length})
          </button>
          <button
            type="button"
            onClick={() => setView("archived")}
            className={`rounded-xl px-5 py-3 text-sm font-black transition ${
              view === "archived"
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Archived ({archivedPools.length})
          </button>
        </div>

        {isLoading ? (
          <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <p className="text-slate-400">Loading organizer pools...</p>
          </section>
        ) : visiblePools.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <h2 className="text-2xl font-black">
              No {view === "active" ? "active" : "archived"} pools
            </h2>
            <p className="mt-3 text-slate-400">
              {view === "active"
                ? "Create a pool while signed in and it will appear here."
                : "Archived pools will stay available here when you need them."}
            </p>
            {view === "active" && (
              <Link
                href="/create-pool"
                className="mt-6 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Create Pool
              </Link>
            )}
          </section>
        ) : (
          <section className="mt-10 grid gap-5 lg:grid-cols-2">
            {visiblePools.map((pool) => (
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
                      {pool.number_of_teams} teams • {pool.golfers_per_team}{" "}
                      golfers per team • Best {pool.scores_to_count} count
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      pool.archived
                        ? "bg-slate-400/10 text-slate-300"
                        : pool.draft_locked
                        ? "bg-red-400/10 text-red-200"
                        : "bg-emerald-400/10 text-emerald-300"
                    }`}
                  >
                    {pool.archived
                      ? "Archived"
                      : pool.draft_locked
                      ? "Draft Locked"
                      : "Draft Open"}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Link
                    href={`/pool?id=${pool.id}&view=lobby`}
                    className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40"
                  >
                    Lobby
                  </Link>
                  <Link
                    href={`/leaderboard?id=${pool.id}`}
                    className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40"
                  >
                    Leaderboard
                  </Link>
                  <Link
                    href={`/organizer/manage?id=${pool.id}`}
                    className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-emerald-300"
                  >
                    Manage
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
