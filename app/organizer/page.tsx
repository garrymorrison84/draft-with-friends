"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import BrandMark from "../components/BrandMark";
import { getCurrentOrganizerUser } from "../lib/poolApi";
import { supabase } from "../lib/supabase";

type AccountPool = {
  id: string;
  name: string;
  sport: "football" | "golf";
  event: string;
  role: "organizer" | "member";
  teamName: string;
  archived: boolean;
  status: string;
  details: string;
  lobbyHref: string;
  leaderboardHref: string;
  manageHref: string | null;
};

export default function AccountPoolsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pools, setPools] = useState<AccountPool[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPools() {
      const currentUser = await getCurrentOrganizerUser();
      if (!currentUser) {
        window.location.href = "/organizer/sign-in?redirect=/organizer";
        return;
      }
      setUser(currentUser);
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        window.location.href = "/organizer/sign-in?redirect=/organizer";
        return;
      }
      try {
        const response = await fetch("/api/account/pools", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error || "Could not load your pools.");
        setPools((result?.pools || []) as AccountPool[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not load your pools.");
      } finally {
        setIsLoading(false);
      }
    }
    loadPools();
  }, []);

  const activePools = useMemo(() => pools.filter((pool) => !pool.archived), [pools]);
  const archivedPools = useMemo(() => pools.filter((pool) => pool.archived), [pools]);
  const visiblePools = view === "active" ? activePools : archivedPools;

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-5 pr-0 sm:flex-row sm:items-center sm:justify-between sm:pr-64">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            {user?.email && <span className="text-sm text-slate-400">{user.email}</span>}
            <button type="button" onClick={signOut} className="text-sm font-medium text-slate-400 transition hover:text-white">
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-sm font-extrabold uppercase text-emerald-400">Your Account</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">My Pools</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">
            Every pool you organize or join stays connected to your account, so you can return from any device.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/football/create" className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300">
              Create College Football Pool
            </Link>
            <Link href="/create-pool" className="rounded-xl border border-emerald-300/35 bg-[#111827] px-5 py-3 text-sm font-black text-emerald-300 transition hover:border-emerald-300">
              Create PGA Event Pool
            </Link>
          </div>
        </div>

        <div className="mt-8 inline-grid grid-cols-2 rounded-2xl border border-white/5 bg-[#111827] p-1 shadow-xl shadow-black/40">
          <button type="button" onClick={() => setView("active")} className={`rounded-xl px-5 py-3 text-sm font-black transition ${view === "active" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:text-white"}`}>
            Active ({activePools.length})
          </button>
          <button type="button" onClick={() => setView("archived")} className={`rounded-xl px-5 py-3 text-sm font-black transition ${view === "archived" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:text-white"}`}>
            Archived ({archivedPools.length})
          </button>
        </div>

        {isLoading ? (
          <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <p className="text-slate-400">Loading your pools...</p>
          </section>
        ) : errorMessage ? (
          <section className="mt-10 rounded-3xl border border-red-400/25 bg-red-400/10 p-8 text-red-200">
            <p className="font-bold">{errorMessage}</p>
          </section>
        ) : visiblePools.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <h2 className="text-2xl font-black">No {view} pools</h2>
            <p className="mt-3 text-slate-400">
              {view === "active" ? "Create a pool or use an invite link to join one. It will appear here automatically." : "Archived pools will stay available here."}
            </p>
          </section>
        ) : (
          <section className="mt-10 grid gap-5 lg:grid-cols-2">
            {visiblePools.map((pool) => (
              <article key={`${pool.sport}-${pool.id}`} className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-emerald-300">{pool.event}</p>
                    <h2 className="mt-2 break-words text-2xl font-black">{pool.name}</h2>
                    <p className="mt-2 text-sm text-slate-400">{pool.details}</p>
                    {pool.teamName && <p className="mt-2 text-sm font-bold text-white">Your team: {pool.teamName}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black capitalize text-emerald-300">{pool.role}</span>
                    <span className="rounded-full bg-slate-400/10 px-3 py-1 text-xs font-black text-slate-300">{pool.status}</span>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Link href={pool.lobbyHref} className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40">Lobby</Link>
                  <Link href={pool.leaderboardHref} className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40">Leaderboard</Link>
                  {pool.manageHref && <Link href={pool.manageHref} className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-emerald-300">Manage</Link>}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
