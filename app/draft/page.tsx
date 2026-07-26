"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPool,
  getDraftPicks,
  saveDraftPick,
  deleteLastDraftPick,
  loadGolfers,
} from "../lib/poolApi";
import BrandMark from "../components/BrandMark";
import { getOrganizerPoolMeta } from "../lib/organizerStorage";
import {
  loadPool as loadLocalPool,
  loadDraftPicks as loadLocalDraftPicks,
  saveDraftPicks as saveLocalDraftPicks,
} from "../lib/poolStorage";
import {
  formatDraftStart,
  formatPickClock,
  getDraftOpeningBufferStartedAt,
  getDraftStartsIn,
  isDraftOpen,
  scheduledDraftOpeningBufferSeconds,
  type DraftTiming,
} from "../lib/draftTiming";
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
} from "../lib/draftSounds";

const FALLBACK_EVENT_ID = "GENESIS_SCOTTISH_OPEN_2026";

type Golfer = {
  name: string;
  rank: number;
  hasOdds?: boolean;
  vegasOdds?: string;
};

type RecentFinish = {
  tournament: string;
  date: string | null;
  finish: string;
  score: number | null;
};

type Pool = {
  id: string;
  poolName: string;
  golfEvent: string;
  eventId?: string | null;
  numberOfTeams: number;
  golfersPerTeam: number;
  scoresToCount: number;
  teamNames: string[];
  draftOrder: string[];
  draftLocked: boolean;
} & DraftTiming;

type DraftPick = {
  team: string;
  golfer: Golfer;
  pickIndex: number;
};

function normalizeGolferName(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getTeamIndexForPick(pickNumber: number, teamCount: number) {
  const roundIndex = Math.floor(pickNumber / teamCount);
  const pickInRound = pickNumber % teamCount;
  const isSnakeRound = roundIndex % 2 === 1;

  return isSnakeRound ? teamCount - 1 - pickInRound : pickInRound;
}

function getRoundPickLabel(pickNumber: number, teamCount: number) {
  const round = Math.floor(pickNumber / teamCount) + 1;
  const pickInRound = (pickNumber % teamCount) + 1;

  return `${round}.${pickInRound}`;
}

function formatOdds(
  rawOdds: unknown,
  options: { forceFractionalGolfOdds?: boolean } = {}
) {
  const oddsNumber = parseOddsNumber(rawOdds);

  if (!Number.isFinite(oddsNumber)) {
    return "Odds TBD";
  }

  if (oddsNumber > 0) {
    const americanOdds = options.forceFractionalGolfOdds || oddsNumber <= 100
      ? oddsNumber * 100
      : oddsNumber;

    return `+${Math.round(americanOdds)}`;
  }

  return String(oddsNumber);
}

function getSortValue(golfer: any) {
  const oddsNumber = getOddsNumber(golfer);

  return Number.isFinite(oddsNumber) ? oddsNumber : 999999;
}

function getOddsNumber(golfer: any) {
  return parseOddsNumber(golfer.odds_sort ?? golfer.vegas_odds ?? golfer.odds);
}

function getDisplayOdds(golfer: any, eventId: string) {
  return formatOdds(golfer.vegas_odds ?? golfer.odds ?? golfer.odds_sort, {
    forceFractionalGolfOdds: eventId === "THE_OPEN_CHAMPIONSHIP_2026",
  });
}

function parseOddsNumber(rawOdds: unknown) {
  if (rawOdds === null || rawOdds === undefined || rawOdds === "") {
    return Number.NaN;
  }

  return typeof rawOdds === "number"
    ? rawOdds
    : Number(String(rawOdds).replace("+", ""));
}

function formatEligibleField(eventId?: string | null, golfEvent?: string) {
  const rawValue = eventId || golfEvent || FALLBACK_EVENT_ID;

  if (rawValue.toUpperCase().includes("JOHN_DEERE")) {
    return "John Deere";
  }

  if (rawValue.toUpperCase().includes("SCOTTISH_OPEN")) {
    return "Scottish Open";
  }

  return rawValue
    .replace(/\d{4}$/g, "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatClockTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatFinishDate(dateValue: string | null) {
  if (!dateValue) return "Recent";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recent";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFinishScore(score: number | null) {
  if (score === null || !Number.isFinite(score)) return "-";
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : String(score);
}

function GolferDetailsModal({
  golfer,
  finishes,
  isLoading,
  error,
  canDraft,
  onClose,
  onDraft,
}: {
  golfer: Golfer;
  finishes: RecentFinish[];
  isLoading: boolean;
  error: string;
  canDraft: boolean;
  onClose: () => void;
  onDraft: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#030712]/75 px-3 pb-4 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60">
        <div className="shrink-0 border-b border-white/10 bg-[#1F2937] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wide text-emerald-300">
                Golfer Profile
              </p>
              <h2 className="mt-3 break-words text-3xl font-black text-white sm:text-4xl">
                {golfer.name}
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-400 sm:text-base">
                Outright odds {golfer.vegasOdds || "TBD"}
              </p>
            </div>

            <button
              type="button"
              onClick={onDraft}
              disabled={!canDraft}
              className="rounded-2xl bg-emerald-400 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {canDraft ? "Draft" : "Not Open"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <h3 className="text-xl font-black">Last 10 Finishes</h3>

          {isLoading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#030712] p-5 text-sm font-black text-slate-300">
              Loading recent finishes...
            </div>
          ) : error ? (
            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm font-bold text-amber-100">
              {error}
            </div>
          ) : finishes.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#030712] p-5 text-sm font-bold text-slate-400">
              Recent finishes are not available for this golfer yet.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
              {finishes.map((finish) => (
                <div
                  key={`${finish.tournament}-${finish.date}`}
                  className="grid grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-3 border-b border-white/5 px-4 py-4 text-sm font-black last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)_80px_80px]"
                >
                  <div className="text-slate-500">{formatFinishDate(finish.date)}</div>
                  <div className="min-w-0 truncate text-white">{finish.tournament}</div>
                  <div className="text-right text-emerald-300">{finish.finish}</div>
                  <div className="hidden text-right text-slate-300 sm:block">
                    {formatFinishScore(finish.score)}
                  </div>
                </div>
              ))}
            </div>
          )}
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

export default function DraftPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [allGolfers, setAllGolfers] = useState<Golfer[]>([]);
  const [draftPicks, setDraftPicks] = useState<(DraftPick | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingGolfer, setPendingGolfer] = useState<Golfer | null>(null);
  const [detailsGolfer, setDetailsGolfer] = useState<Golfer | null>(null);
  const [recentFinishes, setRecentFinishes] = useState<RecentFinish[]>([]);
  const [isLoadingRecentFinishes, setIsLoadingRecentFinishes] = useState(false);
  const [recentFinishesError, setRecentFinishesError] = useState("");
  const [isSavingPick, setIsSavingPick] = useState(false);
  const [isLocalPool, setIsLocalPool] = useState(false);
  const [showDraftCompletedModal, setShowDraftCompletedModal] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [pickTimerStartedAt, setPickTimerStartedAt] = useState(() => Date.now());
  const [draftOpeningStartedAt, setDraftOpeningStartedAt] = useState<number | null>(null);
  const [isPickClockPaused, setIsPickClockPaused] = useState(false);
  const [pausedPickClockRemaining, setPausedPickClockRemaining] = useState<number | null>(null);
  const autoPickInFlightRef = useRef(false);
  const autoPickedKeyRef = useRef("");
  const wasDraftOpenRef = useRef(false);
  const wasDraftOpeningBufferActiveRef = useRef(false);
  const draftJustOpenedPickKeyRef = useRef("");
  const draftCompleteSoundPlayedRef = useRef(false);
  const tickKeyRef = useRef("");
  const recentFinishesCacheRef = useRef(new Map<string, RecentFinish[]>());
  const recentFinishesInFlightRef = useRef(
    new Map<string, Promise<RecentFinish[]>>()
  );

  useEffect(() => {
    async function loadDraft() {
      const params = new URLSearchParams(window.location.search);
      const poolId = params.get("id");

      if (!poolId) {
        setIsLoading(false);
        return;
      }

      const savedPool = await getPool(poolId);
      const localTiming = loadLocalPool(poolId);
      const localPool = savedPool ? null : localTiming;

      if (!savedPool && !localPool) {
        setIsLoading(false);
        return;
      }

      const formattedPool: Pool = savedPool
        ? {
            id: savedPool.id,
            poolName: savedPool.pool_name,
            golfEvent: savedPool.golf_event,
            eventId: savedPool.event_id,
            numberOfTeams: savedPool.number_of_teams,
            golfersPerTeam: savedPool.golfers_per_team,
            scoresToCount: savedPool.scores_to_count,
            teamNames: savedPool.team_names || [],
            draftOrder: savedPool.draft_order || savedPool.team_names || [],
            draftLocked: Boolean(
              savedPool.draft_locked ||
                getOrganizerPoolMeta(savedPool.id).draftLocked
            ),
            draftType: savedPool.draft_type || localTiming?.draftType,
            scheduledDraftAt:
              savedPool.scheduled_draft_at || localTiming?.scheduledDraftAt,
            timeZone: savedPool.time_zone || localTiming?.timeZone,
            pickClockSeconds:
              savedPool.pick_clock_seconds ?? localTiming?.pickClockSeconds,
            autoPickOnTimeout:
              savedPool.auto_pick_on_timeout ?? localTiming?.autoPickOnTimeout,
          }
        : {
            id: localPool!.id,
            poolName: localPool!.poolName,
            golfEvent: localPool!.golfEvent,
            eventId: localPool!.eventId,
            numberOfTeams: localPool!.numberOfTeams,
            golfersPerTeam: localPool!.golfersPerTeam,
            scoresToCount: localPool!.scoresToCount,
            teamNames: localPool!.teamNames || [],
            draftOrder: localPool!.draftOrder || localPool!.teamNames || [],
            draftLocked: false,
            draftType: localPool!.draftType,
            scheduledDraftAt: localPool!.scheduledDraftAt,
            timeZone: localPool!.timeZone,
            pickClockSeconds: localPool!.pickClockSeconds,
            autoPickOnTimeout: localPool!.autoPickOnTimeout,
          };

      setIsLocalPool(!savedPool);
      setPool(formattedPool);

      const totalPicks =
        formattedPool.draftOrder.length * formattedPool.golfersPerTeam;

      const savedPicks = savedPool
        ? await getDraftPicks(formattedPool.id)
        : loadLocalDraftPicks(formattedPool.id) || [];
      const picksArray: (DraftPick | null)[] = Array(totalPicks).fill(null);

      savedPicks.forEach((pick: any, index: number) => {
        const pickIndex = pick?.pick_index ?? pick?.pickIndex ?? index;
        const golferName = pick?.golfer_name ?? pick?.golfer?.name;

        if (
          typeof pickIndex === "number" &&
          pickIndex >= 0 &&
          pickIndex < totalPicks &&
          golferName
        ) {
          const golferRank = pick?.golfer_rank ?? pick?.golfer?.rank ?? 999999;

          picksArray[pickIndex] = {
            team: pick.team,
            golfer: {
              name: golferName,
              rank: golferRank,
              vegasOdds: undefined,
            },
            pickIndex,
          };
        }
      });

      setDraftPicks(picksArray);
      setShowDraftCompletedModal(
        totalPicks > 0 &&
          picksArray.length === totalPicks &&
          picksArray.every(Boolean)
      );

      let eventId = formattedPool.eventId || FALLBACK_EVENT_ID;

      if (!formattedPool.eventId) {
        try {
          const response = await fetch("/api/events/active", { cache: "no-store" });
          const data = await response.json();
          eventId = data?.activeEvent?.id || FALLBACK_EVENT_ID;
        } catch (error) {
          console.error("Could not load active golf event", error);
        }
      }

      const golfers = await loadGolfers(eventId);

      const formattedGolfers = golfers
        .map((golfer: any) => {
          const sortValue = getSortValue(golfer);
          const hasOdds = Number.isFinite(getOddsNumber(golfer));

          return {
            name: golfer.name,
            rank: sortValue,
            hasOdds,
            vegasOdds: getDisplayOdds(golfer, eventId),
          };
        })
        .filter((golfer: Golfer) => golfer.name && golfer.hasOdds)
        .sort((a: Golfer, b: Golfer) => {
          return a.rank - b.rank;
        });

      setAllGolfers(formattedGolfers);
      setIsLoading(false);
    }

    loadDraft();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDraft();
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const draftedGolferNames = useMemo(() => {
    return new Set(
      draftPicks
        .filter((pick): pick is DraftPick => pick !== null)
        .map((pick) => normalizeGolferName(pick.golfer.name))
    );
  }, [draftPicks]);

  const draftIsComplete = useMemo(() => {
    if (!pool) return false;

    const totalPicks = pool.draftOrder.length * pool.golfersPerTeam;

    return (
      totalPicks > 0 &&
      draftPicks.length === totalPicks &&
      draftPicks.every(Boolean)
    );
  }, [draftPicks, pool]);

  useEffect(() => {
    if (draftIsComplete) {
      setShowDraftCompletedModal(true);
      if (!draftCompleteSoundPlayedRef.current) {
        draftCompleteSoundPlayedRef.current = true;
        playDraftCompleteSound();
      }
      return;
    }
    draftCompleteSoundPlayedRef.current = false;
  }, [draftIsComplete]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setSoundsEnabled(isDraftSoundEnabled());
    preloadDraftSounds();
  }, []);

  const visibleGolfers = useMemo(() => {
    const search = normalizeGolferName(searchTerm);

    return allGolfers.filter((golfer) => {
      const normalizedName = normalizeGolferName(golfer.name);
      return (
        !draftedGolferNames.has(normalizedName) &&
        (!search || normalizedName.includes(search))
      );
    });
  }, [allGolfers, draftedGolferNames, searchTerm]);

  function loadRecentFinishesForGolfer(golferName: string) {
    const cacheKey = normalizeGolferName(golferName);
    const cached = recentFinishesCacheRef.current.get(cacheKey);
    if (cached) return Promise.resolve(cached);

    const inFlight = recentFinishesInFlightRef.current.get(cacheKey);
    if (inFlight) return inFlight;

    const request = fetch(
      `/api/golf/recent-finishes?name=${encodeURIComponent(golferName)}`
    )
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Recent finishes are not available yet.");
        }

        const finishes = Array.isArray(data.finishes) ? data.finishes : [];
        recentFinishesCacheRef.current.set(cacheKey, finishes);
        return finishes;
      })
      .finally(() => {
        recentFinishesInFlightRef.current.delete(cacheKey);
      });

    recentFinishesInFlightRef.current.set(cacheKey, request);
    return request;
  }

  useEffect(() => {
    if (!detailsGolfer) {
      setRecentFinishes([]);
      setRecentFinishesError("");
      setIsLoadingRecentFinishes(false);
      return;
    }

    let cancelled = false;
    const golferName = detailsGolfer.name;
    const cacheKey = normalizeGolferName(golferName);
    const cached = recentFinishesCacheRef.current.get(cacheKey);

    setRecentFinishesError("");

    if (cached) {
      setRecentFinishes(cached);
      setIsLoadingRecentFinishes(false);
      return;
    }

    setIsLoadingRecentFinishes(true);
    setRecentFinishes([]);

    loadRecentFinishesForGolfer(golferName)
      .then((finishes) => {
        if (!cancelled) {
          setRecentFinishes(finishes);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRecentFinishesError(
            error instanceof Error
              ? error.message
              : "Recent finishes are not available yet."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingRecentFinishes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailsGolfer]);

  useEffect(() => {
    if (visibleGolfers.length === 0) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      for (const golfer of visibleGolfers.slice(0, 16)) {
        if (cancelled) return;

        const cacheKey = normalizeGolferName(golfer.name);
        if (recentFinishesCacheRef.current.has(cacheKey)) continue;

        try {
          await loadRecentFinishesForGolfer(golfer.name);
        } catch {
          // Prefetch is opportunistic; the modal still handles errors directly.
        }
      }
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [visibleGolfers]);

  const timerPickIndex = draftPicks.findIndex((pick) => pick === null);
  const timerDraftComplete = draftIsComplete;
  const timerDraftOpen = pool ? isDraftOpen(pool, now) : false;
  const timerPickClockSeconds = Math.max(0, Number(pool?.pickClockSeconds) || 0);
  const timerDraftOpeningBufferRemaining =
    pool &&
    pool.draftType === "scheduled" &&
    timerDraftOpen &&
    !timerDraftComplete &&
    timerPickIndex === 0 &&
    draftOpeningStartedAt !== null
      ? Math.max(
          0,
          scheduledDraftOpeningBufferSeconds -
            Math.floor((now.getTime() - draftOpeningStartedAt) / 1000)
        )
      : 0;
  const timerDraftOpeningBufferActive = timerDraftOpeningBufferRemaining > 0;
  const timerPickClockRemaining =
    timerDraftOpen &&
    !timerDraftOpeningBufferActive &&
    !timerDraftComplete &&
    timerPickClockSeconds > 0
      ? isPickClockPaused && pausedPickClockRemaining !== null
        ? pausedPickClockRemaining
        : Math.max(
          0,
          timerPickClockSeconds -
            Math.floor((Date.now() - pickTimerStartedAt) / 1000)
        )
      : null;

  useEffect(() => {
    setPickTimerStartedAt(Date.now());
    setIsPickClockPaused(false);
    setPausedPickClockRemaining(null);
    autoPickInFlightRef.current = false;
    autoPickedKeyRef.current = "";
    stopCountdownTickSound();
    if (timerPickIndex !== 0) {
      setDraftOpeningStartedAt(null);
    }
  }, [timerPickIndex]);

  useEffect(() => {
    if (timerDraftOpen && !wasDraftOpenRef.current) {
      const openingPickKey = pool ? `${pool.id}-${timerPickIndex}` : "";
      const shouldUseOpeningBuffer =
        pool?.draftType === "scheduled" && timerPickIndex === 0;

      draftJustOpenedPickKeyRef.current = openingPickKey;
      setDraftOpeningStartedAt(
        shouldUseOpeningBuffer && pool
          ? getDraftOpeningBufferStartedAt(pool.id)
          : null
      );
      setPickTimerStartedAt(Date.now());
      setIsPickClockPaused(false);
      setPausedPickClockRemaining(null);
      autoPickInFlightRef.current = false;
      autoPickedKeyRef.current = "";
      tickKeyRef.current = "";
      playDraftStartSound();
      if (!shouldUseOpeningBuffer) {
        window.setTimeout(() => {
          if (draftJustOpenedPickKeyRef.current === openingPickKey) {
            draftJustOpenedPickKeyRef.current = "";
          }
        }, 0);
      }
    }
    wasDraftOpenRef.current = timerDraftOpen;
  }, [pool, timerDraftOpen, timerPickIndex]);

  useEffect(() => {
    if (timerDraftOpeningBufferActive) {
      wasDraftOpeningBufferActiveRef.current = true;
      return;
    }

    if (wasDraftOpeningBufferActiveRef.current) {
      wasDraftOpeningBufferActiveRef.current = false;
      setPickTimerStartedAt(Date.now());
      setIsPickClockPaused(false);
      setPausedPickClockRemaining(null);
      tickKeyRef.current = "";
      draftJustOpenedPickKeyRef.current = "";
      stopCountdownTickSound();
    }
  }, [timerDraftOpeningBufferActive]);

  useEffect(() => {
    if (
      !pool ||
      isPickClockPaused ||
      timerDraftOpeningBufferActive ||
      timerPickClockRemaining === null ||
      timerDraftComplete ||
      !timerDraftOpen
    ) {
      stopCountdownTickSound();
      return;
    }

    const pickKey = `${pool.id}-${timerPickIndex}`;
    if (
      timerPickClockRemaining >= 1 &&
      timerPickClockRemaining <= 8 &&
      tickKeyRef.current !== pickKey
    ) {
      tickKeyRef.current = pickKey;
      playCountdownTickSound();
    } else if (timerPickClockRemaining > 8) {
      stopCountdownTickSound();
    }
  }, [
    pool,
    isPickClockPaused,
    timerDraftComplete,
    timerDraftOpen,
    timerDraftOpeningBufferActive,
    timerPickClockRemaining,
    timerPickIndex,
  ]);

  useEffect(() => {
    if (
      !pool ||
      timerPickClockRemaining !== 0 ||
      timerPickClockSeconds <= 0 ||
      !timerDraftOpen ||
      timerDraftOpeningBufferActive ||
      timerDraftComplete ||
      isPickClockPaused ||
      isSavingPick ||
      autoPickInFlightRef.current
    ) {
      return;
    }

    stopCountdownTickSound();

    const pickKey = `${pool.id}-${timerPickIndex}`;
    if (
      draftJustOpenedPickKeyRef.current === pickKey ||
      autoPickedKeyRef.current === pickKey
    ) {
      return;
    }

    const nextGolfer = visibleGolfers.find((golfer) => !isGolferTaken(golfer));
    if (!nextGolfer) return;

    autoPickInFlightRef.current = true;
    autoPickedKeyRef.current = pickKey;
    setPendingGolfer(null);
    saveGolferPick(nextGolfer).then((didPick) => {
      if (!didPick) {
        autoPickInFlightRef.current = false;
        autoPickedKeyRef.current = "";
      }
    });
  }, [
    isSavingPick,
    isPickClockPaused,
    pool,
    timerDraftComplete,
    timerDraftOpen,
    timerDraftOpeningBufferActive,
    timerPickClockRemaining,
    timerPickClockSeconds,
    visibleGolfers,
  ]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-3 py-8 md:px-6 md:py-12">
          <BrandMark size="md" />
          <h1 className="text-2xl font-black md:text-4xl">Loading draft...</h1>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-3 py-8 md:px-6 md:py-12">
          <BrandMark size="md" />
          <h1 className="text-2xl font-black md:text-4xl">No pool found</h1>
          <a href="/create-pool" className="mt-6 inline-block text-emerald-300">
            Create a pool
          </a>
        </div>
      </main>
    );
  }

  const activePool = pool;
  const teams = activePool.draftOrder;
  const golfersPerTeam = activePool.golfersPerTeam;
  const totalPicks = teams.length * golfersPerTeam;
  const draftBoardNameClass =
    teams.length >= 10
      ? "text-[clamp(0.7rem,0.95vw,0.88rem)] sm:text-[clamp(0.76rem,0.98vw,0.95rem)]"
      : teams.length >= 7
        ? "text-[clamp(0.76rem,1.02vw,0.95rem)] sm:text-[clamp(0.82rem,1.08vw,1.02rem)]"
      : teams.length >= 5
          ? "text-[clamp(0.82rem,1.12vw,1.02rem)] sm:text-[clamp(0.88rem,1.2vw,1.1rem)]"
          : "text-[clamp(0.95rem,1.35vw,1.22rem)] sm:text-[clamp(1.05rem,1.45vw,1.32rem)]";
  const draftBoardTeamClass =
    teams.length >= 10
      ? "text-[clamp(0.85rem,1.2vw,1.15rem)]"
      : teams.length >= 7
        ? "text-[clamp(0.9rem,1.35vw,1.3rem)]"
        : "text-[clamp(0.95rem,1.8vw,1.75rem)]";

  const currentPickIndex = draftPicks.findIndex((pick) => pick === null);
  const draftComplete = draftIsComplete;

  const currentTeamIndex = draftComplete
    ? null
    : getTeamIndexForPick(currentPickIndex, teams.length);

  const currentTeam =
    currentTeamIndex === null ? "Draft Complete" : teams[currentTeamIndex];
  const draftOpen = isDraftOpen(activePool, now);
  const draftStartsIn = getDraftStartsIn(activePool, now);
  const activePickClockSeconds = Math.max(
    0,
    Number(activePool.pickClockSeconds) || 0
  );
  const pickClockRemaining =
    draftOpen && !draftComplete && activePickClockSeconds > 0
      ? isPickClockPaused && pausedPickClockRemaining !== null
        ? pausedPickClockRemaining
        : Math.max(
          0,
          activePickClockSeconds -
            Math.floor((Date.now() - pickTimerStartedAt) / 1000)
        )
      : null;

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

  function isGolferTaken(golfer: Golfer) {
    return draftedGolferNames.has(normalizeGolferName(golfer.name));
  }

  function draftGolfer(golfer: Golfer) {
    if (activePool.draftLocked) return;
    if (!draftOpen) return;
    if (draftComplete) return;
    if (isSavingPick) return;
    if (isGolferTaken(golfer)) return;

    setPendingGolfer(golfer);
  }

  function draftFromDetails(golfer: Golfer) {
    setDetailsGolfer(null);
    draftGolfer(golfer);
  }

  function cancelDraftGolfer() {
    if (isSavingPick) return;
    setPendingGolfer(null);
  }

  async function saveGolferPick(golfer: Golfer) {
    if (draftComplete || isSavingPick || !draftOpen) return false;

    if (isGolferTaken(golfer)) {
      setPendingGolfer(null);
      return false;
    }

    const nextPickIndex = draftPicks.findIndex((pick) => pick === null);

    if (nextPickIndex === -1) {
      setPendingGolfer(null);
      return false;
    }

    const nextTeamIndex = getTeamIndexForPick(nextPickIndex, teams.length);
    const nextTeam = teams[nextTeamIndex];

    const nextPick: DraftPick = {
      team: nextTeam,
      golfer,
      pickIndex: nextPickIndex,
    };

    const previousPicks = [...draftPicks];
    const nextPicks = [...draftPicks];
    nextPicks[nextPickIndex] = nextPick;

    setIsSavingPick(true);
    setDraftPicks(nextPicks);
    setPendingGolfer(null);

    try {
      if (isLocalPool) {
        saveLocalDraftPicks(activePool.id, nextPicks);
      } else {
        await saveDraftPick({
          pool_id: activePool.id,
          team: nextTeam,
          golfer_name: golfer.name,
          golfer_rank: golfer.rank,
          pick_index: nextPickIndex,
        });
      }

      const isFinalPick = nextPicks.every(Boolean);

      if (isFinalPick) {
        setShowDraftCompletedModal(true);
      }
      if (isFinalPick) {
        stopCountdownTickSound();
      } else {
        playPickMadeSound();
      }
      return true;
    } catch (error) {
      setDraftPicks(previousPicks);
      console.error(error);
      return false;
    } finally {
      setIsSavingPick(false);
    }
  }

  async function confirmDraftGolfer() {
    if (!pendingGolfer) return;
    await saveGolferPick(pendingGolfer);
  }

  async function undoLastPick() {
    if (isSavingPick) return;

    const lastPick = [...draftPicks]
      .map((pick, index) => ({ pick, index }))
      .filter(
        (item): item is { pick: DraftPick; index: number } =>
          item.pick !== null
      )
      .pop();

    if (!lastPick) return;

    const previousPicks = [...draftPicks];
    const nextPicks = [...draftPicks];
    nextPicks[lastPick.index] = null;

    setDraftPicks(nextPicks);

    try {
      if (isLocalPool) {
        saveLocalDraftPicks(activePool.id, nextPicks);
      } else {
        await deleteLastDraftPick(activePool.id, lastPick.index);
      }
    } catch (error) {
      setDraftPicks(previousPicks);
      console.error(error);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/" aria-label="Draft With Friends home">
              <BrandMark size="md" />
            </Link>

            <h1 className="mt-6 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              Golf Draft Room
            </h1>

            {activePool.draftLocked ? (
              <p className="mt-4 text-lg font-black text-slate-300 sm:text-xl md:text-2xl">
                This draft is locked by the organizer.
              </p>
            ) : !draftOpen ? (
              <p className="mt-4 text-lg font-black text-slate-300 sm:text-xl md:text-2xl">
                Draft opens {formatDraftStart(activePool)}
                {draftStartsIn ? ` • ${draftStartsIn}` : ""}.
              </p>
            ) : draftComplete ? (
              <p className="mt-4 text-lg font-black text-slate-300 sm:text-xl md:text-2xl">
                All picks are complete.
              </p>
            ) : (
              <p className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">
                <span className="text-emerald-300">{currentTeam}</span>{" "}
                is on the clock.
              </p>
            )}

            <p className="mt-2 text-sm font-bold text-slate-500">
              {formatEligibleField(activePool.eventId, activePool.golfEvent)} • Pick{" "}
              {Math.min(currentPickIndex + 1, totalPicks)} of {totalPicks} •{" "}
              {formatPickClock(activePool.pickClockSeconds)}
            </p>
          </div>

          <div className="hidden flex-col gap-3 sm:flex-row lg:flex">
            <a
              href={`/pool?id=${activePool.id}&view=lobby`}
              className="rounded-2xl border border-slate-700 px-6 py-4 text-center text-base font-black text-slate-200 transition hover:border-emerald-400/40 hover:bg-[#111827] sm:px-8 sm:text-lg"
            >
              Return to Lobby
            </a>
          </div>
        </div>

        {draftOpen && !draftComplete && activePool.draftType === "scheduled" && (
          <div className="fixed bottom-5 right-4 z-50 flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-2xl border border-emerald-400/30 bg-[#06261f]/95 px-3.5 py-3 text-sm font-black shadow-2xl shadow-black/50 backdrop-blur sm:right-6 sm:gap-3 sm:px-4 sm:py-3.5 sm:text-base">
            <span className="min-w-0 max-w-[190px] truncate text-emerald-300 sm:max-w-[260px]">
              {isPickClockPaused
                ? "Draft paused"
                : timerDraftOpeningBufferActive
                  ? "Draft is live"
                  : `${currentTeam} is up`}
            </span>
            <span className="shrink-0 text-white">
              {timerDraftOpeningBufferActive
                ? formatClockTime(timerDraftOpeningBufferRemaining)
                : pickClockRemaining !== null
                  ? formatClockTime(pickClockRemaining)
                  : formatPickClock(activePool.pickClockSeconds)}
            </span>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-4 lg:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] xl:grid-cols-[minmax(380px,460px)_minmax(0,1fr)]">
          <aside className="order-2 min-w-0 rounded-3xl border border-slate-600/35 bg-[#111827] p-4 shadow-xl shadow-black/40 lg:sticky lg:top-6 lg:order-1 lg:h-[calc(100vh-48px)] lg:overflow-hidden">
            <h2 className="text-2xl font-black">Eligible Golfers</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Search the field and draft from the golfers still available.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {formatEligibleField(activePool.eventId, activePool.golfEvent)} •{" "}
              {visibleGolfers.length.toLocaleString()} available golfers
            </p>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search golfers..."
              className="mt-6 w-full rounded-xl border border-slate-600/40 bg-[#172235] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60"
            />

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-600/35 bg-[#050a13]">
              <div className="max-h-[620px] overflow-y-auto lg:h-[calc(100vh-330px)] lg:max-h-none">
                <div className="sticky top-0 z-10 border-b border-slate-600/35 bg-[#172235] px-4 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-x-3 text-xs font-black uppercase tracking-wide text-slate-500">
                    <div>Golfer</div>
                    <div className="text-right">Action</div>
                  </div>
                </div>

                {visibleGolfers.length === 0 ? (
                  <div className="px-4 py-8 text-sm font-bold text-slate-500">
                    No available golfers match your search.
                  </div>
                ) : (
                  visibleGolfers.map((golfer) => (
                    <div
                      key={golfer.name}
                      className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-x-3 border-b border-slate-700/45 bg-[#050a13] px-4 py-4 text-sm font-black last:border-b-0 hover:bg-emerald-400/5"
                    >
                      <button
                        type="button"
                        onClick={() => setDetailsGolfer(golfer)}
                        className="min-w-0 text-left"
                      >
                        <p className="min-w-0 truncate text-base font-black">
                          <span className="text-white transition hover:text-emerald-300">
                            {golfer.name}
                          </span>{" "}
                          <span className="text-slate-400">
                            {golfer.vegasOdds || "Odds TBD"}
                          </span>
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => draftGolfer(golfer)}
                        disabled={
                          activePool.draftLocked ||
                          !draftOpen ||
                          draftComplete ||
                          isSavingPick
                        }
                        className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        Draft
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="order-1 flex min-w-0 flex-col rounded-2xl border border-slate-600/35 bg-[#111827] p-2.5 shadow-xl shadow-black/40 sm:rounded-3xl sm:p-6 lg:sticky lg:top-6 lg:order-2 lg:h-[calc(100vh-48px)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">Draft Board</h2>

                <p className="mt-1 text-sm text-slate-400 sm:mt-2 sm:text-base">
                  Snake draft order reverses each round.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={undoLastPick}
                  disabled={isSavingPick}
                  className="min-h-10 flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm font-black text-slate-200 transition hover:border-emerald-400/40 hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-4 sm:py-3"
                >
                  Undo Pick
                </button>
                {draftOpen &&
                  !timerDraftOpeningBufferActive &&
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
              </div>
            </div>

            <div className="mt-4 min-h-[520px] flex-1 overflow-auto rounded-2xl border border-slate-500/35 bg-[#0B1220] shadow-inner shadow-black/30 sm:mt-8 sm:min-h-[620px] sm:rounded-3xl lg:min-h-0">
              <div style={{ minWidth: `${teams.length * 150}px` }}>
                <div
                  className="sticky top-0 z-20 grid overflow-hidden bg-[#12313b] shadow-[0_18px_28px_rgba(0,0,0,0.35)]"
                  style={{
                    gridTemplateColumns: `repeat(${teams.length}, minmax(150px, 1fr))`,
                  }}
                >
                  {teams.map((team) => (
                    <div
                      key={team}
                      className="min-w-0 border-r border-emerald-400/20 px-3 py-3 text-center last:border-r-0 sm:p-6"
                    >
                      <p className={`truncate font-black leading-tight text-white ${draftBoardTeamClass}`}>
                        {team}
                      </p>
                    </div>
                  ))}
                </div>

                {Array.from({ length: golfersPerTeam }).map((_, roundIndex) => (
                  <div
                    key={roundIndex}
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${teams.length}, minmax(150px, 1fr))`,
                    }}
                  >
                    {teams.map((team, teamIndex) => {
                      const isSnakeRound = roundIndex % 2 === 1;
                      const actualTeamIndex = isSnakeRound
                        ? teams.length - 1 - teamIndex
                        : teamIndex;

                      const displayedPickIndex =
                        roundIndex * teams.length + actualTeamIndex;

                      const pick = draftPicks[displayedPickIndex];

                      const isCurrentPick =
                        !draftComplete &&
                        displayedPickIndex === currentPickIndex;
                      const pickLabel = getRoundPickLabel(
                        displayedPickIndex,
                        teams.length
                      );

                      return (
                        <div
                          key={`${roundIndex}-${team}`}
                          className={`relative min-h-[108px] overflow-hidden border-r border-t p-3 last:border-r-0 sm:min-h-40 sm:p-5 ${
                            pick
                              ? "border-sky-500/35 bg-[#0b3b55]/95"
                              : isCurrentPick
                              ? "border-emerald-300/60 bg-[#0b2f2c]/95 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.14)]"
                              : "border-slate-700/70 bg-[#050a13]/95"
                          }`}
                        >
                          <div
                            className={`${pick ? "mb-5 sm:mb-6" : "mb-3"} inline-flex rounded-full px-2.5 py-1 text-[11px] font-black sm:px-3 sm:text-xs ${
                              pick
                                ? "bg-blue-500/35 text-blue-50 shadow-sm shadow-blue-950/40"
                                : isCurrentPick
                                ? "bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-950/30"
                                : "bg-[#1F2937] text-slate-400"
                            }`}
                          >
                            {pickLabel}
                          </div>

                          {pick ? (
                            <>
                              <p
                                className={`relative z-10 min-w-0 max-w-full overflow-hidden break-words font-black leading-tight text-white [overflow-wrap:anywhere] ${draftBoardNameClass}`}
                                style={{
                                  display: "-webkit-box",
                                  WebkitBoxOrient: "vertical",
                                  WebkitLineClamp: 2,
                                }}
                              >
                                {pick.golfer.name}
                              </p>
                            </>
                          ) : (
                            <>
                              <p
                                className={`relative z-10 text-sm font-black ${
                                  isCurrentPick
                                    ? "text-emerald-300"
                                    : "text-slate-500"
                                }`}
                              >
                                {isCurrentPick ? "On the clock" : "Open"}
                              </p>

                              <p className="relative z-10 mt-2 text-xs font-bold text-slate-600 sm:mt-3 sm:text-sm">
                                Awaiting selection
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {detailsGolfer && (
        <GolferDetailsModal
          golfer={detailsGolfer}
          finishes={recentFinishes}
          isLoading={isLoadingRecentFinishes}
          error={recentFinishesError}
          canDraft={
            !activePool.draftLocked &&
            draftOpen &&
            !draftComplete &&
            !isSavingPick &&
            !isGolferTaken(detailsGolfer)
          }
          onClose={() => setDetailsGolfer(null)}
          onDraft={() => draftFromDetails(detailsGolfer)}
        />
      )}

      {pendingGolfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-3rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
              Confirm Pick
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Draft {pendingGolfer.name}?
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              This will add {pendingGolfer.name} to the current pick.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={cancelDraftGolfer}
                disabled={isSavingPick}
                className="rounded-xl border border-white/15 px-4 py-3 font-bold text-slate-200 transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              >
                No
              </button>

              <button
                onClick={confirmDraftGolfer}
                disabled={isSavingPick}
                className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPick ? "Saving..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDraftCompletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/75 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-3rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-emerald-400/20 bg-[#111827] p-8 text-center shadow-xl shadow-black/40 md:p-10">
            <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
              <span className="block">Congratulations!</span>
              <span className="block">Draft Complete</span>
            </h2>

            <p className="mt-6 text-lg font-semibold text-slate-300">
              Your golf pool is ready for live tracking.
            </p>

            <a
              href={`/leaderboard?id=${activePool.id}`}
              className="mt-8 inline-flex w-full justify-center rounded-2xl bg-emerald-400 px-5 py-5 text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
            >
              Live Leaderboard
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
