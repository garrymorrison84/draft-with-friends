"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import { getCurrentOrganizerUser } from "../../lib/poolApi";
import { claimTeam, loadTeamClaims } from "../../lib/teamClaims";
import {
  formatPickClock,
  getDraftStartsIn,
  getScheduledDraftDate,
  normalizeDraftTiming,
} from "../../lib/draftTiming";
import {
  type FootballDraftPick,
  type FootballPool,
  defaultScoring,
  getTotalRosterSlots,
  saveFootballDraftPicks,
  saveFootballPool,
} from "../lib/storage";
import { loadPersistedFootballHistory } from "../lib/platformStorage";

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
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teamError, setTeamError] = useState("");
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [claims, setClaims] = useState<Record<string, string>>({});
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  useEffect(() => {
    async function loadLobby() {
      const params = new URLSearchParams(window.location.search);
      const poolId = params.get("id");

      if (!poolId) {
        setIsLoading(false);
        return;
      }

      const history = await loadPersistedFootballHistory(poolId);
      if (history) {
        saveFootballPool(history.pool);
        saveFootballDraftPicks(history.pool.id, history.picks);
        setPool(history.pool);
        const nextClaims = await loadTeamClaims(history.pool.id);
        const savedTeam = window.sessionStorage.getItem(`dwf-football-team-${history.pool.id}`) || "";
        if (history.pool.teamNames.includes(savedTeam) && nextClaims[savedTeam] === "mine") {
          setSelectedTeam(savedTeam);
        } else if (savedTeam) {
          window.sessionStorage.removeItem(`dwf-football-team-${history.pool.id}`);
          setSelectedTeam("");
        }
        setPicks(history.picks);
        setClaims(nextClaims);
      }
      setIsLoading(false);
    }

    loadLobby();
    const interval = window.setInterval(loadLobby, 3000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    getCurrentOrganizerUser().then((user) => {
      setOrganizerId(user?.id || null);
      setOrganizerEmail(user?.email || "");
    });
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
        draftTiming: normalizeDraftTiming(),
        draftStartsIn: null,
      };
    }

    const rosterSlots = getTotalRosterSlots(pool.scoring ?? defaultScoring);
    const totalPicks = pool.numberOfTeams * rosterSlots;
    const pickCount = picks.length;
    const draftComplete = totalPicks > 0 && pickCount >= totalPicks;
    const draftPercent = totalPicks > 0 ? Math.round((pickCount / totalPicks) * 100) : 0;
    const currentTeam = getCurrentTeam(pool, pickCount, draftComplete);
    const draftTiming = normalizeDraftTiming(pool);
    const draftStartsIn = getDraftStartsIn(pool);

    return {
      totalPicks,
      draftPercent,
      rosterSlots,
      draftComplete,
      currentTeam,
      draftTiming,
      draftStartsIn,
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

        {organizerId && organizerId === pool.ownerId && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-300">
              Commissioner signed in{organizerEmail ? ` · ${organizerEmail}` : ""}
            </span>
          </div>
        )}

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="text-sm font-black text-emerald-300">
              College Fantasy Football Snake Draft
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
                href={organizerId && selectedTeam ? `/football/draft?id=${pool.id}&team=${encodeURIComponent(selectedTeam)}` : "#choose-team"}
                aria-disabled={!organizerId || !selectedTeam}
                onClick={(event) => {
                  if (!organizerId || !selectedTeam) event.preventDefault();
                }}
                className={`rounded-2xl px-8 py-4 text-center text-lg font-black transition ${organizerId && selectedTeam ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/30 hover:scale-105 hover:bg-emerald-300" : "cursor-not-allowed bg-slate-700 text-slate-400"}`}
              >
                {!organizerId ? "Sign In to Join" : !selectedTeam ? "Choose Your Team" : picks.length > 0 ? "Continue Draft" : "Enter Draft"}
              </Link>
            )}
            {lobbyStats.draftComplete && (
              <Link
                href={`/football/leaderboard?id=${pool.id}`}
                className="rounded-2xl bg-emerald-400 px-8 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/30 transition hover:scale-105 hover:bg-emerald-300"
              >
                View Leaderboard
              </Link>
            )}
          </div>
        </div>

        {!lobbyStats.draftComplete && (
          <section id="choose-team" className="mt-8 rounded-3xl border border-emerald-400/20 bg-[#111827] p-5 sm:p-6">
            <h2 className="text-xl font-black">Choose your team</h2>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Sign in, then select the team you control before entering the draft.
            </p>
            {!organizerId && (
              <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                <p className="font-black text-white">Sign in to join this pool</p>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  Your account keeps this team connected to you on every device and adds the pool to your history.
                </p>
                <Link
                  href={`/organizer/sign-in?redirect=${encodeURIComponent(`/football/pool?id=${pool.id}`)}`}
                  className="mt-4 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300"
                >
                  Sign In or Create Account
                </Link>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pool.teamNames.map((team) => {
                const claimedByOther = claims[team] === "claimed";
                const unavailable = !organizerId || claimedByOther;
                return (
                <button
                  key={team}
                  type="button"
                  disabled={unavailable}
                  onClick={async () => {
                    try {
                      setClaims(await claimTeam(pool.id, team));
                      setSelectedTeam(team);
                      setTeamError("");
                      window.sessionStorage.setItem(`dwf-football-team-${pool.id}`, team);
                    } catch (error) {
                      setTeamError(error instanceof Error ? error.message : "Could not claim this team.");
                    }
                  }}
                  className={`rounded-xl border px-4 py-3 text-center font-black transition ${unavailable ? "cursor-not-allowed border-white/5 bg-slate-800/50 text-slate-600" : selectedTeam === team || claims[team] === "mine" ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-white/10 bg-[#1F2937] text-white hover:border-emerald-300/60"}`}
                >
                  {team}{claimedByOther ? " · Claimed" : ""}
                </button>
              )})}
            </div>
            {teamError && <p className="mt-3 text-sm font-bold text-red-300">{teamError}</p>}
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-emerald-300 sm:text-base">
                    Use this link to invite your friends to your pool!
                  </p>
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
          </section>
        )}

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-5 shadow-xl shadow-black/40 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(230px,1.45fr)_minmax(190px,1fr)]">
            <StatBlock label="Teams" value={String(pool.numberOfTeams)} />
            <StatBlock label="Week" value={pool.season.replace("College Football ", "")} />
            <StatBlock label="Roster Spots" value={String(lobbyStats.rosterSlots)} />
            <StatBlock
              label="Draft Time"
              value={
                lobbyStats.draftTiming.draftType === "scheduled"
                  ? formatLobbyDraftStart(pool)
                  : "Anytime"
              }
            />
            <StatBlock label="Pick Clock" value={formatPickClock(pool.pickClockSeconds)} />
          </div>

        </section>

        {organizerId && organizerId === pool.ownerId && !lobbyStats.draftComplete && (
          <section className="mt-10 rounded-3xl border border-emerald-400/20 bg-[#111827] p-6 shadow-xl shadow-black/40">
            <h2 className="text-2xl font-black">Commissioner Controls</h2>
            <p className="mt-2 text-sm font-semibold text-slate-400">Manage scoring, team names, and draft settings as the pool organizer.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href={`/football/scoring?id=${pool.id}`} className="rounded-xl bg-emerald-400 px-6 py-3 text-center font-black text-slate-950 hover:bg-emerald-300">Roster + Scoring</Link>
              <Link href={`/football/commissioner?id=${pool.id}`} className="rounded-xl border border-white/10 bg-[#1F2937] px-6 py-3 text-center font-black hover:border-emerald-300/60">Team Names + Draft Picks</Link>
            </div>
          </section>
        )}

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Draft Progress</h2>
              <p className="mt-2 text-sm font-bold text-slate-400">
                {picks.length} / {lobbyStats.totalPicks} picks complete
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

          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-emerald-300">
                  {lobbyStats.draftComplete
                    ? "Draft Complete"
                    : `${lobbyStats.currentTeam} is on the clock`}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  {lobbyStats.draftComplete
                    ? "Teams are locked. View the leaderboard to track standings."
                    : lobbyStats.draftStartsIn
                      ? `Draft room opens in ${lobbyStats.draftStartsIn}.`
                    : "Share the lobby link, finish the draft, and follow every score live."}
                </p>
              </div>

            </div>
          </div>
        </section>

        {lobbyStats.draftComplete && (
          <section id="commissioner-tools" className="mt-10">
            <div className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Commissioner Tools</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Manage the pool after launch without changing the draft experience.
                  </p>
                </div>
                <Link
                  href={`/football/leaderboard?id=${pool.id}`}
                  className="rounded-2xl bg-emerald-400 px-6 py-3 text-center text-base font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
                >
                  View Leaderboard
                </Link>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <ToolLink href={`/football/scoring?id=${pool.id}`} label="Edit Roster + Scoring" />
                <ToolLink href={`/football/commissioner?id=${pool.id}`} label="Team Names + Draft Picks" />
              </div>
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
            <h2 className="text-2xl font-black">Draft Order</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Teams draft in this order. The order reverses each round.
            </p>
            <div className="mt-6 space-y-3">
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
    <div className="flex min-h-[104px] min-w-0 flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#1F2937] p-4 text-center">
      <p className="text-base font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        title={value}
        className="mt-2 max-w-full whitespace-nowrap text-2xl font-black leading-tight text-white"
      >
        {value}
      </p>
    </div>
  );
}

function formatLobbyDraftStart(pool: FootballPool) {
  const scheduledDate = getScheduledDraftDate(pool);
  if (!scheduledDate) return "Anytime";

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: normalizeDraftTiming(pool).timeZone,
  }).format(scheduledDate);
}

function ToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-emerald-400 px-5 py-4 text-center font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
    >
      {label}
    </Link>
  );
}
