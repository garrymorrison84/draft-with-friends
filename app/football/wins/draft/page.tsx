"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "../../../components/BrandMark";
import {
  formatDraftStart,
  formatPickClock,
  getDraftOpeningBufferStartedAt,
  getDraftStartsIn,
  isDraftOpen,
  scheduledDraftOpeningBufferSeconds,
} from "../../../lib/draftTiming";
import {
  isDraftSoundEnabled,
  playCountdownTickSound,
  playDraftCompleteSound,
  playDraftStartSound,
  playPauseResumeWhistleSound,
  playPickMadeSound,
  preloadDraftSounds,
  setDraftSoundEnabled,
  stopCountdownTickSound,
} from "../../../lib/draftSounds";
import {
  eligibleWinsTeams,
  formatWinTotal,
  loadWinsDraftPicks,
  loadWinsPool,
  saveWinsDraftPicks,
  snakeManagerForPick,
  winsConferenceOptions,
  type WinsDraftPick,
  type WinsPool,
  type WinsTeam,
} from "../lib/storage";

function pickLabel(pickIndex: number, teamCount: number) {
  const round = Math.floor(pickIndex / teamCount) + 1;
  const pickInRound = (pickIndex % teamCount) + 1;
  return `${round}.${pickInRound}`;
}

function formatClockTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDraftOpeningMessage(secondsRemaining: number) {
  if (secondsRemaining >= 45 && secondsRemaining <= 75) {
    return "Draft opens in a minute";
  }

  return "Draft opens in a moment";
}

function scheduleOpponentLabel(game: WinsTeam["schedule"][number]) {
  if (game.location === "Away") return `@ ${game.opponent}`;
  return game.opponent;
}

const managerHeaderStyles = [
  "bg-[#123b3f]",
  "bg-[#103744]",
  "bg-[#123240]",
  "bg-[#0f3540]",
  "bg-[#123842]",
  "bg-[#10323a]",
];

const conferenceStyles: Record<
  string,
  { badge: string; board: string; card: string; name: string }
> = {
  ACC: {
    badge: "border-blue-200 bg-blue-600/50 text-blue-50 shadow-blue-500/20",
    board: "border-blue-500/35 bg-blue-700/24",
    card: "border-blue-300/45 bg-blue-600/12 hover:bg-blue-600/18",
    name: "hover:text-blue-200",
  },
  "Big Ten": {
    badge: "border-cyan-200 bg-cyan-500/45 text-cyan-50 shadow-cyan-500/20",
    board: "border-cyan-500/35 bg-cyan-500/20",
    card: "border-cyan-300/45 bg-cyan-500/12 hover:bg-cyan-500/18",
    name: "hover:text-cyan-200",
  },
  "Big 12": {
    badge: "border-violet-200 bg-violet-500/45 text-violet-50 shadow-violet-500/20",
    board: "border-violet-500/35 bg-violet-500/20",
    card: "border-violet-300/45 bg-violet-500/12 hover:bg-violet-500/18",
    name: "hover:text-violet-200",
  },
  "Pac-12": {
    badge: "border-amber-200 bg-amber-500/45 text-amber-50 shadow-amber-500/20",
    board: "border-amber-500/35 bg-amber-500/20",
    card: "border-amber-300/45 bg-amber-500/12 hover:bg-amber-500/18",
    name: "hover:text-amber-200",
  },
  SEC: {
    badge: "border-rose-200 bg-rose-500/45 text-rose-50 shadow-rose-500/20",
    board: "border-rose-500/35 bg-rose-500/20",
    card: "border-rose-300/45 bg-rose-500/12 hover:bg-rose-500/18",
    name: "hover:text-rose-200",
  },
  Independents: {
    badge: "border-emerald-200 bg-emerald-500/45 text-emerald-50 shadow-emerald-500/20",
    board: "border-emerald-500/35 bg-emerald-500/20",
    card: "border-emerald-300/45 bg-emerald-500/12 hover:bg-emerald-500/18",
    name: "hover:text-emerald-200",
  },
};

const defaultConferenceStyle = {
  badge: "border-slate-100 bg-slate-400/45 text-white shadow-slate-400/20",
  board: "border-slate-500/35 bg-slate-500/15",
  card: "border-slate-600/45 bg-[#050a13] hover:bg-slate-500/10",
  name: "hover:text-slate-200",
};

function getConferenceStyle(conference: string) {
  return conferenceStyles[conference] ?? defaultConferenceStyle;
}

function formatConferenceLabel(conference: string) {
  if (conference === "Independents") return "Ind";
  if (conference === "Big Ten") return "Big 10";
  if (conference === "Pac-12") return "Pac 12";
  return conference;
}

function TeamDetailsModal({
  team,
  onClose,
  onDraft,
  canDraft,
}: {
  team: WinsTeam;
  onClose: () => void;
  onDraft: () => void;
  canDraft: boolean;
}) {
  const styles = getConferenceStyle(team.conference);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#030712]/75 px-3 pb-4 backdrop-blur-sm md:items-center md:p-6">
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close team details"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#030712] text-xl font-black text-slate-300 transition hover:border-emerald-300/50 hover:text-white"
        >
          X
        </button>
        <div className="shrink-0 border-b border-white/10 bg-[#1F2937] p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
                Team Details
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}>
                  {formatConferenceLabel(team.conference)}
                </span>
                <span className="text-sm font-black uppercase tracking-widest text-slate-400">
                  {team.wins}-{team.losses}
                </span>
              </div>
              <h2 className="mt-3 break-words text-3xl font-black text-white sm:text-4xl">
                {team.name}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
              <div className="rounded-2xl bg-[#030712] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Projected Win Total
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-300">
                  {formatWinTotal(team.winTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={onDraft}
                disabled={!canDraft}
                className="rounded-2xl bg-emerald-400 p-4 text-lg font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {canDraft ? "Draft" : "Not Open"}
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <h3 className="text-xl font-black">Season Schedule</h3>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            Review the full schedule before making the pick.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
            {team.schedule.map((game) => (
              <div
                key={`${game.week}-${game.opponent}`}
                className="grid grid-cols-[90px_minmax(0,1fr)_64px] items-center gap-3 border-b border-slate-700/45 px-4 py-4 text-sm font-black last:border-b-0"
              >
                <div className="text-slate-500">{game.week}</div>
                <div className="min-w-0">
                  <p className="truncate text-white">
                    {scheduleOpponentLabel(game)}
                  </p>
                </div>
                <div
                  className={`text-right ${
                    game.result === "W"
                      ? "text-emerald-300"
                      : game.result === "L"
                        ? "text-rose-300"
                        : "text-slate-500"
                  }`}
                >
                  {game.result ?? "TBD"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 p-4 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-white/15 px-5 py-3 font-black text-slate-200 transition hover:bg-white/5 sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WinsDraftPage() {
  const [pool, setPool] = useState<WinsPool | null>(null);
  const [picks, setPicks] = useState<WinsDraftPick[]>([]);
  const [detailsTeam, setDetailsTeam] = useState<WinsTeam | null>(null);
  const [pendingTeam, setPendingTeam] = useState<WinsTeam | null>(null);
  const [query, setQuery] = useState("");
  const [conferenceFilter, setConferenceFilter] = useState("ALL");
  const [now, setNow] = useState(() => new Date());
  const [draftOpeningStartedAt, setDraftOpeningStartedAt] =
    useState<number | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(isDraftSoundEnabled);
  const [pickTimerStartedAt, setPickTimerStartedAt] = useState(Date.now);
  const [isPickClockPaused, setIsPickClockPaused] = useState(false);
  const [pausedPickClockRemaining, setPausedPickClockRemaining] =
    useState<number | null>(null);
  const wasDraftOpenRef = useRef(false);
  const wasDraftOpeningBufferActiveRef = useRef(false);
  const tickKeyRef = useRef("");
  const draftCompleteSoundPlayedRef = useRef(false);
  const autoDraftKeyRef = useRef("");

  useEffect(() => {
    preloadDraftSounds();
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadWinsPool(id);
    if (!savedPool) return;

    const savedPicks = loadWinsDraftPicks(savedPool.id);
    setPool(savedPool);
    setPicks(savedPicks);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setPickTimerStartedAt(Date.now());
    setIsPickClockPaused(false);
    setPausedPickClockRemaining(null);
    tickKeyRef.current = "";
    autoDraftKeyRef.current = "";
    stopCountdownTickSound();

    if (picks.length > 0) {
      setDraftOpeningStartedAt(null);
    }
  }, [picks.length]);

  useEffect(() => {
    if (!pool) return;

    const currentlyOpen = isDraftOpen(pool, now);
    if (currentlyOpen && !wasDraftOpenRef.current) {
      wasDraftOpenRef.current = true;
      if (pool.draftType === "scheduled" && picks.length === 0) {
        setDraftOpeningStartedAt(getDraftOpeningBufferStartedAt(pool.id));
      }
      setPickTimerStartedAt(Date.now());
      setIsPickClockPaused(false);
      setPausedPickClockRemaining(null);
      tickKeyRef.current = "";
      autoDraftKeyRef.current = "";
      playDraftStartSound();
    } else if (!currentlyOpen && wasDraftOpenRef.current) {
      wasDraftOpenRef.current = false;
      setDraftOpeningStartedAt(null);
    }
  }, [now, picks.length, pool]);

  const teams = useMemo(() => (pool ? eligibleWinsTeams(pool) : []), [pool]);
  const totalPicks = pool ? pool.numberOfTeams * pool.picksPerTeam : 0;
  const draftedIds = useMemo(
    () => new Set(picks.map((pick) => pick.teamId)),
    [picks]
  );
  const draftComplete = pool ? picks.length >= totalPicks : false;
  const draftOpen = pool ? isDraftOpen(pool, now) : false;
  const draftStartsIn = pool ? getDraftStartsIn(pool, now) : null;
  const currentManager = pool && !draftComplete
    ? snakeManagerForPick(pool, picks.length)
    : null;
  const activePickClockSeconds = pool
    ? Math.max(0, Number(pool.pickClockSeconds) || 0)
    : 0;
  const draftOpeningBufferRemaining =
    pool &&
    draftOpen &&
    !draftComplete &&
    picks.length === 0 &&
    draftOpeningStartedAt !== null
      ? Math.max(
          0,
          scheduledDraftOpeningBufferSeconds -
            Math.floor((now.getTime() - draftOpeningStartedAt) / 1000)
        )
      : 0;
  const draftOpeningBufferActive = draftOpeningBufferRemaining > 0;
  const pickClockRemaining =
    pool &&
    draftOpen &&
    !draftComplete &&
    !draftOpeningBufferActive &&
    activePickClockSeconds > 0
      ? isPickClockPaused && pausedPickClockRemaining !== null
        ? pausedPickClockRemaining
        : Math.max(
            0,
            activePickClockSeconds -
              Math.floor((Date.now() - pickTimerStartedAt) / 1000)
          )
      : null;
  const availableConferences = pool
    ? winsConferenceOptions.filter((conference) =>
        pool.conferences.includes(conference)
      )
    : [];
  const filteredTeams = pool
    ? teams
        .filter((team) => !draftedIds.has(team.id))
        .filter(
          (team) =>
            conferenceFilter === "ALL" || team.conference === conferenceFilter
        )
        .filter((team) => {
          const text = `${team.name} ${team.conference}`.toLowerCase();
          return text.includes(query.toLowerCase());
        })
    : [];
  const boardSlots = pool
    ? Array.from({ length: totalPicks }).map((_, index) => {
        const pick = picks[index];
        const team = pick ? teams.find((item) => item.id === pick.teamId) : null;
        const manager = pick?.manager ?? snakeManagerForPick(pool, index);

        return { index, pick, team, manager };
      })
    : [];

  useEffect(() => {
    if (draftOpeningBufferActive) {
      wasDraftOpeningBufferActiveRef.current = true;
      return;
    }

    if (wasDraftOpeningBufferActiveRef.current) {
      wasDraftOpeningBufferActiveRef.current = false;
      setPickTimerStartedAt(Date.now());
      setIsPickClockPaused(false);
      setPausedPickClockRemaining(null);
      tickKeyRef.current = "";
      autoDraftKeyRef.current = "";
      stopCountdownTickSound();
    }
  }, [draftOpeningBufferActive]);

  useEffect(() => {
    if (
      !pool ||
      isPickClockPaused ||
      draftOpeningBufferActive ||
      pickClockRemaining === null ||
      draftComplete ||
      !draftOpen
    ) {
      stopCountdownTickSound();
      return;
    }

    const pickKey = `${pool.id}-${picks.length}`;
    if (
      pickClockRemaining >= 1 &&
      pickClockRemaining <= 8 &&
      tickKeyRef.current !== pickKey
    ) {
      tickKeyRef.current = pickKey;
      playCountdownTickSound();
    } else if (pickClockRemaining > 8) {
      stopCountdownTickSound();
    }
  }, [
    draftComplete,
    draftOpen,
    draftOpeningBufferActive,
    isPickClockPaused,
    pickClockRemaining,
    picks.length,
    pool,
  ]);

  useEffect(() => {
    if (
      !pool ||
      !draftOpen ||
      draftComplete ||
      draftOpeningBufferActive ||
      isPickClockPaused ||
      activePickClockSeconds <= 0 ||
      pickClockRemaining !== 0
    ) {
      return;
    }

    const nextTeam = filteredTeams[0];
    if (!nextTeam) return;

    const autoDraftKey = `${pool.id}-${picks.length}`;
    if (autoDraftKeyRef.current === autoDraftKey) return;

    autoDraftKeyRef.current = autoDraftKey;
    draftTeam(nextTeam);
  }, [
    activePickClockSeconds,
    draftComplete,
    draftOpen,
    draftOpeningBufferActive,
    filteredTeams,
    isPickClockPaused,
    pickClockRemaining,
    picks.length,
    pool,
  ]);

  useEffect(() => {
    if (!draftComplete) {
      draftCompleteSoundPlayedRef.current = false;
      return;
    }

    stopCountdownTickSound();

    if (!draftCompleteSoundPlayedRef.current) {
      draftCompleteSoundPlayedRef.current = true;
      playDraftCompleteSound();
    }
  }, [draftComplete]);

  function draftTeam(team: WinsTeam) {
    if (!pool) return;
    if (!draftOpen || draftComplete || !currentManager) return;

    const nextPicks = [
      ...picks,
      {
        teamId: team.id,
        manager: currentManager,
        pickNumber: picks.length + 1,
      },
    ];

    setPicks(nextPicks);
    saveWinsDraftPicks(pool.id, nextPicks);
    setPickTimerStartedAt(Date.now());
    setIsPickClockPaused(false);
    setPausedPickClockRemaining(null);
    tickKeyRef.current = "";

    if (nextPicks.length >= totalPicks) {
      stopCountdownTickSound();
    } else {
      playPickMadeSound();
    }

    setDetailsTeam(null);
    setPendingTeam(null);
  }

  function undoPick() {
    if (!pool) return;
    const nextPicks = picks.slice(0, -1);
    setPicks(nextPicks);
    saveWinsDraftPicks(pool.id, nextPicks);
    setPendingTeam(null);
    setDetailsTeam(null);
    stopCountdownTickSound();
  }

  function togglePickClockPause() {
    if (pickClockRemaining === null || activePickClockSeconds <= 0) return;

    if (isPickClockPaused) {
      const remaining = pausedPickClockRemaining ?? pickClockRemaining;
      setPickTimerStartedAt(
        Date.now() - (activePickClockSeconds - remaining) * 1000
      );
      setPausedPickClockRemaining(null);
      setIsPickClockPaused(false);
      if (remaining <= 8) tickKeyRef.current = "";
      playPauseResumeWhistleSound();
      return;
    }

    setPausedPickClockRemaining(pickClockRemaining);
    setIsPickClockPaused(true);
    stopCountdownTickSound();
    playPauseResumeWhistleSound();
  }

  function toggleDraftSounds() {
    const nextSoundsEnabled = !soundsEnabled;
    setSoundsEnabled(nextSoundsEnabled);
    setDraftSoundEnabled(nextSoundsEnabled);
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] px-5 py-8 text-white">
        <BrandMark size="md" />
        <h1 className="mt-8 text-4xl font-black">Pool not found</h1>
      </main>
    );
  }

  function openConfirmPick(team: WinsTeam) {
    if (!draftOpen || draftComplete || draftedIds.has(team.id)) return;
    setPendingTeam(team);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <div className="flex gap-3">
            <Link
              href={`/football/wins/pool?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 font-black text-emerald-300"
            >
              Pool Lobby
            </Link>
            <Link
              href={`/football/wins/leaderboard?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 font-black text-emerald-300"
            >
              Leaderboard
            </Link>
          </div>
        </div>

        <section className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-black text-emerald-300">
              College Football Wins Draft
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight sm:text-6xl">
              {pool.poolName}
            </h1>
            <p className="mt-3 text-lg font-bold text-slate-400">
              {!draftOpen
                ? `Draft opens ${formatDraftStart(pool)}${draftStartsIn ? ` | ${draftStartsIn}` : ""}`
                : draftComplete
                  ? "Draft complete"
                  : `${currentManager} is on the clock`}
            </p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {pool.draftType === "scheduled"
                ? formatPickClock(pool.pickClockSeconds)
                : "Anytime draft"}
            </p>
          </div>
        </section>

        {!draftOpen && (
          <section className="mt-8 rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5 shadow-xl shadow-black/40 sm:p-6">
            <h2 className="text-2xl font-black text-emerald-300">Draft Scheduled</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-300 sm:text-base">
              This draft opens {formatDraftStart(pool)}
              {draftStartsIn ? `, in ${draftStartsIn}` : ""}. Participants can review the board now, but picks are locked until then.
            </p>
          </section>
        )}

        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-4 lg:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] xl:grid-cols-[minmax(380px,460px)_minmax(0,1fr)]">
          <section className="relative order-1 flex min-w-0 flex-col rounded-2xl border border-slate-600/35 bg-[#111827] p-2.5 shadow-xl shadow-black/40 sm:rounded-3xl sm:p-6 lg:sticky lg:top-6 lg:order-2 lg:h-[calc(100vh-48px)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">Draft Board</h2>
                <p className="mt-1 text-sm text-slate-400 sm:mt-2 sm:text-base">
                  Snake draft order reverses each round.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <p className="mr-1 flex min-h-10 items-center text-2xl font-black text-emerald-300 sm:text-3xl">
                  {picks.length}/{totalPicks}
                </p>
                  <button
                    type="button"
                    onClick={undoPick}
                    disabled={picks.length === 0}
                    className="min-h-10 flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm font-black text-slate-200 transition hover:border-emerald-400/40 hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-4 sm:py-3"
                  >
                    Undo Pick
                  </button>
                  {draftOpen &&
                    !draftOpeningBufferActive &&
                    !draftComplete &&
                    activePickClockSeconds > 0 && (
                      <button
                        type="button"
                        onClick={togglePickClockPause}
                        className="min-h-10 flex-1 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/15 sm:flex-none sm:px-4 sm:py-3"
                      >
                        {isPickClockPaused ? "Resume" : "Pause"}
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={toggleDraftSounds}
                    aria-label={soundsEnabled ? "Turn draft sounds off" : "Turn draft sounds on"}
                    title={soundsEnabled ? "Sound on" : "Sound off"}
                    className={`min-h-10 flex-1 rounded-xl border px-3 py-2 text-sm font-black transition sm:flex-none sm:px-4 sm:py-3 ${
                      soundsEnabled
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                        : "border-slate-700 text-slate-400 hover:border-emerald-400/40 hover:bg-[#0b1220]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.4"
                        viewBox="0 0 24 24"
                      >
                        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                        {soundsEnabled ? (
                          <>
                            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                          </>
                        ) : (
                          <>
                            <path d="m16 9 5 5" />
                            <path d="m21 9-5 5" />
                          </>
                        )}
                      </svg>
                      {soundsEnabled ? "On" : "Off"}
                    </span>
                  </button>
                  <span className="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-300 sm:flex-none sm:px-4 sm:py-3">
                    Snake Draft
                  </span>
                  {draftComplete && (
                    <Link
                      href={`/football/wins/leaderboard?id=${pool.id}`}
                      className="rounded-xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-slate-950"
                    >
                      View Season Board
                    </Link>
                  )}
              </div>
            </div>

            <div className="mt-4 min-h-[520px] flex-1 overflow-auto rounded-2xl border border-slate-500/35 bg-[#0B1220] shadow-inner shadow-black/30 sm:mt-8 sm:min-h-[620px] sm:rounded-3xl lg:min-h-0">
              <div style={{ minWidth: `${pool.numberOfTeams * 142}px` }}>
                <div
                  className="sticky top-0 z-20 grid bg-[#12313b] shadow-[0_18px_28px_rgba(0,0,0,0.35)]"
                  style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(142px, 1fr))` }}
                >
                  {pool.draftOrder.map((manager, index) => {
                    const isCurrentManager =
                      draftOpen &&
                      !draftComplete &&
                      currentManager === manager &&
                      picks.length % pool.numberOfTeams === index;

                    return (
                    <div
                      key={manager}
                      className={`min-w-0 border-r border-emerald-400/20 px-3 py-3 text-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)] last:border-r-0 sm:p-6 ${
                        managerHeaderStyles[index % managerHeaderStyles.length]
                      } ${
                        isCurrentManager
                          ? "ring-1 ring-inset ring-emerald-300/40"
                          : ""
                      }`}
                    >
	                      <p className="truncate text-sm font-black uppercase tracking-[0.14em] text-white sm:text-xl">
	                        {manager}
	                      </p>
                    </div>
                    );
                  })}
                </div>

                <div
                  className="grid bg-[#030712]"
                  style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(142px, 1fr))` }}
                >
                  {boardSlots.map(({ index, team }) => {
                    const styles = team ? getConferenceStyle(team.conference) : null;
                    const isCurrentPick =
                      index === picks.length && draftOpen && !draftComplete;

                    return (
                      <div
                        key={index}
	                        className={`relative min-h-[108px] overflow-hidden border-b border-r p-3 pt-12 last:border-r-0 sm:min-h-40 sm:p-5 sm:pt-14 ${
	                          team
	                            ? styles?.board
	                            : isCurrentPick
	                              ? "border-emerald-300/60 bg-[#0b2f2c]/95 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.14)]"
	                              : "border-slate-700/70 bg-[#050a13]/95"
	                        }`}
                      >
                      <span
	                        className={`absolute right-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black sm:right-5 sm:top-5 sm:px-3 sm:text-xs ${
	                          team
	                            ? "bg-blue-500/35 text-blue-50 shadow-sm shadow-blue-950/40"
	                            : isCurrentPick
	                              ? "bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-950/30"
	                              : "bg-[#1F2937] text-slate-500"
	                        }`}
                      >
                        {pickLabel(index, pool.numberOfTeams)}
                      </span>

                      {team ? (
                        <div className="relative z-10 min-w-0">
	                          <p
	                            className="min-w-0 max-w-full overflow-hidden break-words text-xl font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-2xl"
                            style={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                            }}
                          >
                            {team.name}
                          </p>
                          <div className="mt-2 flex items-center">
                            <span className="text-xs font-bold text-slate-500 sm:text-sm">
                              {team.wins}-{team.losses}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative z-10 min-w-0">
                          {isCurrentPick && (
                            <p className="text-sm font-black text-emerald-300">
                              On the clock
                            </p>
                          )}
                          <p
                            className={`text-xs font-bold text-slate-600 sm:text-sm ${
                              isCurrentPick ? "mt-2 sm:mt-3" : ""
                            }`}
                          >
                            Awaiting selection
                          </p>
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {draftOpen &&
              !draftComplete &&
              pool.draftType === "scheduled" &&
              activePickClockSeconds > 0 &&
              (draftOpeningBufferActive || pickClockRemaining !== null) && (
                <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-2xl border border-emerald-500/40 bg-emerald-950/80 px-4 py-3 text-sm font-black text-emerald-100 shadow-2xl shadow-emerald-950/40 backdrop-blur sm:bottom-6 sm:right-6 sm:px-5 sm:py-4 sm:text-base">
                  <span className="mr-3 text-emerald-300">
                    {isPickClockPaused
                      ? "Clock paused"
                      : draftOpeningBufferActive
                        ? "Draft opening"
                        : `${currentManager} is up`}
                  </span>
                  <span className="tabular-nums text-white">
                    {formatClockTime(
                      draftOpeningBufferActive
                        ? draftOpeningBufferRemaining
                        : pickClockRemaining ?? 0
                    )}
                  </span>
                </div>
              )}
          </section>

          <aside className="order-2 min-w-0 rounded-3xl border border-slate-600/35 bg-[#111827] p-4 shadow-xl shadow-black/40 lg:sticky lg:top-6 lg:order-1 lg:h-[calc(100vh-48px)] lg:overflow-hidden">
            <h2 className="text-2xl font-black">Eligible Teams</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Filter by conference, search teams, then draft from the list.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {pool.conferences.map(formatConferenceLabel).join(", ")} • {filteredTeams.length.toLocaleString()} available teams
            </p>

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teams..."
              className="mt-6 w-full rounded-xl border border-slate-600/40 bg-[#172235] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
            />

            <div className="mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-2">
              {["ALL", ...availableConferences].map((conference) => {
                const active = conferenceFilter === conference;

                return (
                  <button
                    key={conference}
                    type="button"
                    onClick={() => setConferenceFilter(conference)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${
                      active
                        ? "border-emerald-300 bg-emerald-300 text-slate-950"
                        : "border-slate-700 bg-[#050a13] text-slate-300 hover:border-emerald-300/40"
                    }`}
                  >
                    {conference === "ALL" ? "All" : formatConferenceLabel(conference)}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-600/35 bg-[#050a13]">
              <div className="max-h-[620px] overflow-y-auto lg:h-[calc(100vh-360px)] lg:max-h-none">
                <div className="sticky top-0 z-10 border-b border-slate-600/35 bg-[#172235] px-4 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-x-3 text-xs font-black uppercase tracking-wide text-slate-500">
                    <div>Team</div>
                    <div className="text-center leading-4">Projected Win Total</div>
                  </div>
                </div>

                {filteredTeams.map((team) => {
                  const styles = getConferenceStyle(team.conference);

                  return (
                    <div
                      key={team.id}
                      className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-x-3 border-b border-slate-700/55 bg-[#050a13] px-4 py-4 text-sm font-black transition last:border-b-0 hover:bg-[#0b1220]"
                    >
                    <button
                      type="button"
                      onClick={() => setDetailsTeam(team)}
                      className="min-w-0 text-left"
                    >
                      <div className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)] items-center gap-3">
                        <span className="flex justify-center">
                          <span className={`inline-flex min-w-[74px] justify-center rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}>
                            {formatConferenceLabel(team.conference)}
                          </span>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-white">
                            {team.name}
                          </p>
                          <p className="truncate text-xs font-bold text-slate-500">
                            {team.wins}-{team.losses}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="grid gap-2">
                      <div className="text-center text-sm font-black text-slate-300">
                        {formatWinTotal(team.winTotal)}
                      </div>
                      <button
                        type="button"
                        onClick={() => openConfirmPick(team)}
                        disabled={!draftOpen || draftComplete || draftedIds.has(team.id)}
                        className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        Draft
                      </button>
                    </div>
                    </div>
                  );
                })}

                {filteredTeams.length === 0 && (
                  <div className="px-4 py-8 text-sm font-bold text-slate-500">
                    No available teams match that filter.
                  </div>
                )}
              </div>
            </div>

          </aside>
        </div>
      </div>

      {detailsTeam && (
        <TeamDetailsModal
          team={detailsTeam}
          onClose={() => setDetailsTeam(null)}
          onDraft={() => {
            setPendingTeam(detailsTeam);
            setDetailsTeam(null);
          }}
          canDraft={draftOpen && !draftComplete && !draftedIds.has(detailsTeam.id)}
        />
      )}

      {pendingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-3rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
              Confirm Pick
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Draft {pendingTeam.name}?
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                {formatConferenceLabel(pendingTeam.conference)}
              </span>
              <span className="text-sm font-bold text-slate-400">
                Projected Win Total {formatWinTotal(pendingTeam.winTotal)}
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              This will add {pendingTeam.name} to {currentManager}&apos;s current pick.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingTeam(null)}
                className="rounded-xl border border-white/15 px-4 py-3 font-bold text-slate-200 transition hover:bg-[#111827]"
              >
                No
              </button>

              <button
                type="button"
                onClick={() => draftTeam(pendingTeam)}
                className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
