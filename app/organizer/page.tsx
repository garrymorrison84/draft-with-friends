"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import BrandMark from "../components/BrandMark";
import { getCurrentOrganizerUser } from "../lib/poolApi";
import { clearPool as clearLocalGolfPool } from "../lib/poolStorage";
import { supabase } from "../lib/supabase";
import { clearFootballHistory } from "../football/lib/storage";

type AccountPool = {
  id: string;
  name: string;
  sport: "football" | "golf";
  event: string;
  role: "organizer" | "member";
  teamName: string;
  completed: boolean;
  createdAt: string | null;
  status: string;
  details: string;
  lobbyHref: string;
  leaderboardHref: string;
  manageHref: string | null;
};

function createdDateLabel(createdAt: string | null) {
  if (!createdAt) return "Creation date unavailable";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Creation date unavailable";
  return `Created ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)}`;
}

function PoolCard({
  pool,
  isDeleting,
  onDelete,
}: {
  pool: AccountPool;
  isDeleting: boolean;
  onDelete: (pool: AccountPool) => void;
}) {
  return (
    <article className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-300">{pool.event}</p>
          <h3 className="mt-2 break-words text-2xl font-black">{pool.name}</h3>
          <p className="mt-2 text-sm text-slate-400">{pool.details}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {createdDateLabel(pool.createdAt)}
          </p>
          {pool.teamName && <p className="mt-2 text-sm font-bold text-white">Your team: {pool.teamName}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black capitalize text-emerald-300">
            {pool.role}
          </span>
          <span className="rounded-full bg-slate-400/10 px-3 py-1 text-xs font-black text-slate-300">
            {pool.status}
          </span>
          <button
            type="button"
            onClick={() => onDelete(pool)}
            disabled={isDeleting}
            aria-label={`Delete ${pool.name} from My Pools`}
            className="rounded-lg border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-black text-red-300 transition hover:border-red-300 hover:bg-red-400/20 hover:text-red-200 disabled:cursor-wait disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={pool.lobbyHref} className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40">
          Lobby
        </Link>
        <Link href={pool.leaderboardHref} className="rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-center text-sm font-black text-white transition hover:border-emerald-400/40">
          Leaderboard
        </Link>
        {pool.manageHref && (
          <Link href={pool.manageHref} className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-emerald-300">
            Manage
          </Link>
        )}
      </div>
    </article>
  );
}

function PoolSection({
  title,
  emptyMessage,
  pools,
  deletingPoolKey,
  onDelete,
}: {
  title: string;
  emptyMessage: string;
  pools: AccountPool[];
  deletingPoolKey: string;
  onDelete: (pool: AccountPool) => void;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-black md:text-3xl">{title}</h2>
        <span className="text-sm font-black text-slate-500">{pools.length}</span>
      </div>
      {pools.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
          <p className="text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {pools.map((pool) => {
            const poolKey = `${pool.sport}-${pool.id}`;
            return (
              <PoolCard
                key={poolKey}
                pool={pool}
                isDeleting={deletingPoolKey === poolKey}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function AccountPoolsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pools, setPools] = useState<AccountPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingPoolKey, setDeletingPoolKey] = useState("");

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

  const activePools = useMemo(() => pools.filter((pool) => !pool.completed), [pools]);
  const completedPools = useMemo(() => pools.filter((pool) => pool.completed), [pools]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function deleteFromHistory(pool: AccountPool) {
    const deletesForEveryone = pool.role === "organizer";
    const confirmed = window.confirm(
      deletesForEveryone
        ? `Permanently delete “${pool.name}” for everyone? The pool, draft, and leaderboard will be removed for every participant. This cannot be undone.`
        : `Delete “${pool.name}” from My Pools? This only removes it from your account history and will not delete the shared pool for other participants.`
    );
    if (!confirmed) return;

    const poolKey = `${pool.sport}-${pool.id}`;
    setDeletingPoolKey(poolKey);
    setDeleteError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sign in again to update your pool history.");
      const response = await fetch("/api/account/pools", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sport: pool.sport, poolId: pool.id }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          result?.error ||
            (deletesForEveryone
              ? "Could not delete this pool for everyone."
              : "Could not delete this pool from your history.")
        );
      }
      if (result?.deletedForEveryone) {
        if (pool.sport === "football") clearFootballHistory(pool.id);
        else clearLocalGolfPool(pool.id);
      }
      setPools((current) => current.filter((item) => `${item.sport}-${item.id}` !== poolKey));
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : deletesForEveryone
            ? "Could not delete this pool for everyone."
            : "Could not delete this pool from your history."
      );
    } finally {
      setDeletingPoolKey("");
    }
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

        {isLoading ? (
          <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <p className="text-slate-400">Loading your pools...</p>
          </section>
        ) : errorMessage ? (
          <section className="mt-10 rounded-3xl border border-red-400/25 bg-red-400/10 p-8 text-red-200">
            <p className="font-bold">{errorMessage}</p>
          </section>
        ) : (
          <>
            {deleteError && (
              <div className="mt-8 rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-200">
                {deleteError}
              </div>
            )}
            <PoolSection
              title="Active Pools"
              emptyMessage="Create a pool or use an invite link to join one. It will appear here automatically."
              pools={activePools}
              deletingPoolKey={deletingPoolKey}
              onDelete={deleteFromHistory}
            />
            <PoolSection
              title="Completed Pools"
              emptyMessage="Pools move here automatically when their contest is complete."
              pools={completedPools}
              deletingPoolKey={deletingPoolKey}
              onDelete={deleteFromHistory}
            />
          </>
        )}
      </div>
    </main>
  );
}
