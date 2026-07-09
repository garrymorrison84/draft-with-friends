"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  type FootballDraftPick,
  type FootballPool,
  defaultScoring,
  getTotalRosterSlots,
  loadFootballDraftPicks,
  loadFootballPool,
} from "../lib/storage";

function getCurrentTeam(pool: FootballPool, pickCount: number, draftComplete: boolean) {
  if (draftComplete) return "Draft Complete";

  const currentRound = Math.floor(pickCount / pool.numberOfTeams) + 1;
  const pickInRound = (pickCount % pool.numberOfTeams) + 1;
  const isSnakeRound = (currentRound - 1) % 2 === 1;
  const currentTeamIndex = isSnakeRound
    ? pool.draftOrder.length - pickInRound
    : pickInRound - 1;

  return pool.draftOrder[currentTeamIndex] || pool.draftOrder[0] || "Team 1";
}

export default function FootballPoolPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  useEffect(() => {
    function loadLobby() {
      const params = new URLSearchParams(window.location.search);
      const poolId = params.get("id");

      if (!poolId) {
        setIsLoading(false);
        return;
      }

      const savedPool = loadFootballPool(poolId);
      if (!savedPool) {
        setIsLoading(false);
        return;
      }

      setPool(savedPool);
      setPicks(loadFootballDraftPicks(savedPool.id));
      setIsLoading(false);
    }

    loadLobby();
    const interval = window.setInterval(loadLobby, 3000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (copyStatus === "idle") return;

    const timeout = window.setTimeout(() => setCopyStatus("idle"), 1800);

    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const lobbyStats = useMemo(() => {
    if (!pool) {
      return {
        totalPicks: 0,
        draftPercent: 0,
        rosterSlots: 0,
        draftComplete: false,
        currentTeam: "Team 1",
      };
    }

    const rosterSlots = getTotalRosterSlots(pool.scoring ?? defaultScoring);
    const totalPicks = pool.numberOfTeams * rosterSlots;
    const pickCount = picks.length;
    const draftComplete = totalPicks > 0 && pickCount >= totalPicks;
    const draftPercent = totalPicks > 0 ? Math.round((pickCount / totalPicks) * 100) : 0;
    const currentTeam = getCurrentTeam(pool, pickCount, draftComplete);

    return {
      totalPicks,
      draftPercent,
      rosterSlots,
      draftComplete,
      currentTeam,
    };
  }, [picks.length, pool]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <BrandMark size="md" />
          <h1 className="mt-8 text-4xl font-black">Loading football pool...</h1>
        </div>
      </main>
    );
  }

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

  const inviteLink =
    typeof window === "undefined"
      ? `https://draftwithfriends.com/football/pool?id=${pool.id}`
      : `${window.location.origin}/football/pool?id=${pool.id}`;

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="text-sm font-black text-emerald-300">
              College Football Snake Draft
            </p>
            <h1 className="mt-2 break-words text-4xl font-black md:text-5xl">
              {pool.poolName}
            </h1>
            <p className="mt-3 text-base font-bold text-slate-400">
              {pool.season} • {pool.playerPool?.conferences.join(", ") || "Power 5 + Independents"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {!lobbyStats.draftComplete && (
              <Link
                href={`/football/draft?id=${pool.id}`}
                className="rounded-2xl bg-emerald-400 px-8 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:scale-105 hover:bg-emerald-300"
              >
                {picks.length > 0 ? "Continue Draft" : "Enter Draft"}
              </Link>
            )}
            <Link
              href={`/football/leaderboard?id=${pool.id}`}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-8 py-4 text-center text-lg font-black text-emerald-300 transition hover:bg-emerald-400/15"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-5 shadow-xl shadow-black/40 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatBlock label="Teams" value={String(pool.numberOfTeams)} />
              <StatBlock label="Week" value={pool.season.replace("College Football ", "")} />
              <StatBlock label="Roster Spots" value={String(lobbyStats.rosterSlots)} />
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-300">Invite Link</p>
                  <p className="mt-1 truncate text-sm text-slate-200">
                    {`draftwithfriends.com/football/pool?id=${pool.id}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteLink);
                      setCopyStatus("copied");
                    } catch {
                      setCopyStatus("failed");
                    }
                  }}
                  className={`min-w-[112px] rounded-xl px-5 py-3 text-sm font-black transition ${
                    copyStatus === "copied"
                      ? "bg-emerald-300 text-slate-950"
                      : copyStatus === "failed"
                        ? "bg-red-300 text-slate-950"
                        : "bg-white text-slate-950 hover:bg-slate-200"
                  }`}
                >
                  {copyStatus === "copied"
                    ? "Copied"
                    : copyStatus === "failed"
                      ? "Try Again"
                      : "Copy & Share Link"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Draft Progress</h2>
              <p className="mt-2 text-sm font-bold text-slate-400">
                {picks.length} / {lobbyStats.totalPicks} picks complete
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-300">
                Current: {lobbyStats.currentTeam}
              </p>
            </div>
            <div className="text-4xl font-black text-emerald-300">
              {lobbyStats.draftPercent}%
            </div>
          </div>

          <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#1F2937]">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${Math.min(100, lobbyStats.draftPercent)}%` }}
            />
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
            <h2 className="text-2xl font-black">Commissioner Tools</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Manage the pool after launch without changing the golf experience.
            </p>
            <div className="mt-6 grid gap-3">
              <ToolLink href={`/football/scoring?id=${pool.id}`} label="Edit Roster + Scoring" />
              <ToolLink href={`/football/draft?id=${pool.id}`} label="Adjust Draft Board" />
              <ToolLink href={`/football/leaderboard?id=${pool.id}`} label="Live Tracking Leaderboard" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
            <h2 className="text-2xl font-black">Draft Order</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {pool.draftOrder.map((team, index) => (
                <div
                  key={`${team}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#1F2937] p-4"
                >
                  <span className="min-w-0 truncate text-lg font-black">{team}</span>
                  <span className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-black text-slate-950">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1F2937] p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-4 text-4xl font-black">{value}</p>
    </div>
  );
}

function ToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-center font-black text-emerald-300 transition hover:bg-emerald-400/15"
    >
      {label}
    </Link>
  );
}
