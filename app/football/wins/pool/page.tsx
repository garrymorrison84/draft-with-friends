"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "../../../components/BrandMark";
import {
  formatDraftStart,
  formatPickClock,
  getDraftStartsIn,
  isDraftOpen,
} from "../../../lib/draftTiming";
import {
  eligibleWinsTeams,
  loadWinsDraftPicks,
  loadWinsPool,
  type WinsDraftPick,
  type WinsPool,
} from "../lib/storage";

export default function WinsPoolLobbyPage() {
  const [pool, setPool] = useState<WinsPool | null>(null);
  const [picks, setPicks] = useState<WinsDraftPick[]>([]);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadWinsPool(id);
    if (!savedPool) return;

    setPool(savedPool);
    setPicks(loadWinsDraftPicks(savedPool.id));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] px-5 py-8 text-white">
        <BrandMark size="md" />
        <h1 className="mt-8 text-4xl font-black">Pool not found</h1>
        <Link
          href="/football/wins/create"
          className="mt-6 inline-flex rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 font-black text-emerald-300"
        >
          Create Wins Pool
        </Link>
      </main>
    );
  }

  const totalPicks = pool.numberOfTeams * pool.picksPerTeam;
  const progress = totalPicks > 0 ? Math.round((picks.length / totalPicks) * 100) : 0;
  const teams = eligibleWinsTeams(pool);
  const draftOpen = isDraftOpen(pool, now);
  const draftStartsIn = getDraftStartsIn(pool, now);
  const conferenceCounts = pool.conferences.map((conference) => ({
    conference,
    count: teams.filter((team) => team.conference === conference).length,
  }));
  const inviteLink =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/football/wins/pool?id=${pool.id}`;

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-black text-emerald-300">
              College Football Wins Pool
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight sm:text-6xl">
              {pool.poolName}
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/football/wins/draft?id=${pool.id}`}
              className="rounded-2xl bg-emerald-400 px-7 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300"
            >
              {picks.length >= totalPicks
                ? "View Draft"
                : draftOpen
                  ? "Start Draft"
                  : "View Draft Room"}
            </Link>
            {picks.length > 0 && (
              <Link
                href={`/football/wins/leaderboard?id=${pool.id}`}
                className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-7 py-4 text-center text-lg font-black text-emerald-300 hover:bg-emerald-400/15"
              >
                View Leaderboard
              </Link>
            )}
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr_1.1fr_2fr]">
            <StatCard label="Participants" value={pool.numberOfTeams.toString()} />
            <StatCard label="Picks Each" value={pool.picksPerTeam.toString()} />
            <StatCard label="Eligible Teams" value={teams.length.toString()} />
            <StatCard
              label="Draft Time"
              value={pool.draftType === "scheduled" ? formatDraftStart(pool) : "Anytime"}
              compact
            />
            <StatCard label="Pick Clock" value={formatPickClock(pool.pickClockSeconds)} compact />
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-sm font-black text-emerald-300">Invite Link</p>
              <p className="mt-2 truncate text-sm font-bold text-slate-300">{inviteLink}</p>
              <button
                type="button"
                onClick={copyInviteLink}
                className="mt-4 rounded-xl bg-white px-5 py-3 font-black text-slate-950"
              >
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black">Draft Progress</h2>
              <p className="mt-2 text-slate-400">
                {picks.length} / {totalPicks} picks complete
              </p>
            </div>
            <p className="text-4xl font-black text-emerald-300">{progress}%</p>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-[#1F2937]">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </div>

          {!draftOpen && (
            <div className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
              <p className="font-black text-emerald-300">
                Draft opens {formatDraftStart(pool)}
              </p>
              {draftStartsIn && (
                <p className="mt-1 text-sm font-bold text-slate-300">
                  Starts in {draftStartsIn}.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-white/5 bg-[#1F2937] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xl font-black">Eligible Conferences</h3>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  These conferences feed the draft board.
                </p>
              </div>
              <p className="text-sm font-black text-emerald-300">
                {teams.length} total teams
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {conferenceCounts.map(({ conference, count }) => (
                <span
                  key={conference}
                  className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200"
                >
                  {conference} - {count}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1F2937] p-4">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className={`mt-3 font-black ${compact ? "text-2xl" : "text-5xl"}`}>
        {value}
      </p>
    </div>
  );
}
