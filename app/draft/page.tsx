"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getPool,
  getDraftPicks,
  saveDraftPick,
  deleteLastDraftPick,
  loadGolfers,
} from "../lib/poolApi";
import BrandMark from "../components/BrandMark";
import { getOrganizerPoolMeta } from "../lib/organizerStorage";

const CURRENT_EVENT_ID = "TRAVELERS2026";

type Golfer = {
  name: string;
  rank: number;
  vegasOdds?: string;
};

type Pool = {
  id: string;
  poolName: string;
  golfEvent: string;
  numberOfTeams: number;
  golfersPerTeam: number;
  scoresToCount: number;
  teamNames: string[];
  draftOrder: string[];
  draftLocked: boolean;
};

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

function formatOdds(rawOdds: unknown) {
  if (rawOdds === null || rawOdds === undefined || rawOdds === "") {
    return "Odds TBD";
  }

  const oddsNumber =
    typeof rawOdds === "number"
      ? rawOdds
      : Number(String(rawOdds).replace("+", ""));

  if (!Number.isFinite(oddsNumber)) {
    return String(rawOdds);
  }

  return `+${oddsNumber}`;
}

function getSortValue(golfer: any) {
  const odds =
    golfer.odds ??
    golfer.odds_sort ??
    golfer.vegas_odds ??
    golfer.rank ??
    golfer.world_rank;

  const oddsNumber =
    typeof odds === "number"
      ? odds
      : Number(String(odds ?? "").replace("+", ""));

  return Number.isFinite(oddsNumber) ? oddsNumber : 999999;
}

export default function DraftPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [allGolfers, setAllGolfers] = useState<Golfer[]>([]);
  const [draftPicks, setDraftPicks] = useState<(DraftPick | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingGolfer, setPendingGolfer] = useState<Golfer | null>(null);
  const [isSavingPick, setIsSavingPick] = useState(false);

  useEffect(() => {
    async function loadDraft() {
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
        teamNames: savedPool.team_names || [],
        draftOrder: savedPool.draft_order || savedPool.team_names || [],
        draftLocked: Boolean(
          savedPool.draft_locked || getOrganizerPoolMeta(savedPool.id).draftLocked
        ),
      };

      setPool(formattedPool);

      const totalPicks =
        formattedPool.draftOrder.length * formattedPool.golfersPerTeam;

      const savedPicks = await getDraftPicks(formattedPool.id);
      const picksArray: (DraftPick | null)[] = Array(totalPicks).fill(null);

      savedPicks.forEach((pick: any) => {
        if (
          typeof pick.pick_index === "number" &&
          pick.pick_index >= 0 &&
          pick.pick_index < totalPicks
        ) {
          picksArray[pick.pick_index] = {
            team: pick.team,
            golfer: {
              name: pick.golfer_name,
              rank: pick.golfer_rank ?? 999999,
              vegasOdds: formatOdds(pick.golfer_rank),
            },
            pickIndex: pick.pick_index,
          };
        }
      });

      setDraftPicks(picksArray);

      const golfers = await loadGolfers(CURRENT_EVENT_ID);

      const formattedGolfers = golfers
        .map((golfer: any) => {
          const sortValue = getSortValue(golfer);

          return {
            name: golfer.name,
            rank: sortValue,
            vegasOdds: formatOdds(
              golfer.odds ?? golfer.odds_sort ?? golfer.vegas_odds
            ),
          };
        })
        .filter((golfer: Golfer) => golfer.name)
        .sort((a: Golfer, b: Golfer) => a.rank - b.rank);

      setAllGolfers(formattedGolfers);
      setIsLoading(false);
    }

    loadDraft();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      window.location.reload();
    }, 40000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const draftedGolferNames = useMemo(() => {
    return new Set(
      draftPicks
        .filter((pick): pick is DraftPick => pick !== null)
        .map((pick) => normalizeGolferName(pick.golfer.name))
    );
  }, [draftPicks]);

  const visibleGolfers = useMemo(() => {
    const search = normalizeGolferName(searchTerm);

    return allGolfers.filter((golfer) => {
      const normalizedName = normalizeGolferName(golfer.name);
      return !search || normalizedName.includes(search);
    });
  }, [allGolfers, searchTerm]);

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
            Create a pool →
          </a>
        </div>
      </main>
    );
  }

  const activePool = pool;
  const teams = activePool.draftOrder;
  const golfersPerTeam = activePool.golfersPerTeam;
  const totalPicks = teams.length * golfersPerTeam;

  const currentPickIndex = draftPicks.findIndex((pick) => pick === null);
  const draftComplete =
    draftPicks.length === totalPicks && currentPickIndex === -1;

  const currentTeamIndex = draftComplete
    ? null
    : getTeamIndexForPick(currentPickIndex, teams.length);

  const currentTeam =
    currentTeamIndex === null ? "Draft Complete" : teams[currentTeamIndex];

  function isGolferTaken(golfer: Golfer) {
    return draftedGolferNames.has(normalizeGolferName(golfer.name));
  }

  function draftGolfer(golfer: Golfer) {
    if (activePool.draftLocked) return;
    if (draftComplete) return;
    if (isSavingPick) return;
    if (isGolferTaken(golfer)) return;

    setPendingGolfer(golfer);
  }

  function cancelDraftGolfer() {
    if (isSavingPick) return;
    setPendingGolfer(null);
  }

  async function confirmDraftGolfer() {
    if (!pendingGolfer || draftComplete || isSavingPick) return;

    const golfer = pendingGolfer;

    if (isGolferTaken(golfer)) {
      setPendingGolfer(null);
      return;
    }

    const nextPickIndex = draftPicks.findIndex((pick) => pick === null);

    if (nextPickIndex === -1) {
      setPendingGolfer(null);
      return;
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
      await saveDraftPick({
        pool_id: activePool.id,
        team: nextTeam,
        golfer_name: golfer.name,
        golfer_rank: golfer.rank,
        pick_index: nextPickIndex,
      });
    } catch (error) {
      setDraftPicks(previousPicks);
      console.error(error);
    } finally {
      setIsSavingPick(false);
    }
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
      await deleteLastDraftPick(activePool.id, lastPick.index);
    } catch (error) {
      setDraftPicks(previousPicks);
      console.error(error);
    }
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-[1700px] px-3 py-4 md:px-6 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="md" />
          </Link>

          <a
            href={`/pool?id=${activePool.id}`}
            className="text-sm font-medium text-emerald-300"
          >
            ← Back to Pool Lobby
          </a>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:mt-6 md:flex-row md:items-end md:justify-between md:gap-6">
          <div>
            <p className="text-sm font-semibold text-emerald-300 md:text-base">
              {draftComplete
                ? "Draft Complete"
                : `Current Pick ${getRoundPickLabel(
                    currentPickIndex,
                    teams.length
                  )}`}
            </p>

            <h1 className="mt-2 text-3xl font-black uppercase leading-none md:text-5xl">
              Draft Room
            </h1>

            <p className="mt-3 text-base font-semibold text-slate-200 md:mt-4 md:text-xl">
              {activePool.draftLocked
                ? "This draft is locked by the organizer."
                : draftComplete
                ? "All picks are complete."
                : `${currentTeam} is on the clock.`}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              Eligible field: {CURRENT_EVENT_ID}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:flex">
            <button
              onClick={undoLastPick}
              disabled={isSavingPick}
              className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-50 md:px-5 md:text-base"
            >
              Undo Pick
            </button>

            <a
              href={`/leaderboard?id=${activePool.id}`}
              className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-bold text-slate-950 md:px-6 md:text-base"
            >
              Finish Draft
            </a>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:mt-8 lg:flex-row lg:gap-6">
          <aside className="w-full shrink-0 rounded-2xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:w-[340px] lg:rounded-3xl lg:p-5">
            <h2 className="text-xl font-bold md:text-2xl">Eligible Golfers</h2>

            <p className="mt-2 text-sm text-slate-400">
              Available golfers are highlighted. Taken golfers stay visible but
              cannot be drafted again.
            </p>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search golfers..."
              className="mt-4 w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-sm text-white outline-none md:mt-5 md:text-base"
            />

            <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1 lg:h-[calc(100vh-240px)] lg:max-h-none">
              {visibleGolfers.map((golfer) => {
                const isTaken = isGolferTaken(golfer);

                return (
                  <button
                    key={golfer.name}
                    onClick={() => draftGolfer(golfer)}
                    disabled={
                      activePool.draftLocked ||
                      draftComplete ||
                      isTaken ||
                      isSavingPick
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition md:p-4 ${
                      isTaken
                        ? "cursor-not-allowed border-white/5 bg-[#030712]/60 opacity-45"
                        : "border-emerald-400/30 bg-[#1F2937] hover:border-emerald-400/70 hover:bg-emerald-400/10"
                    }`}
                  >
                    <div>
                      <p
                        className={`text-sm font-bold leading-tight md:text-base ${
                          isTaken ? "text-slate-500 line-through" : "text-white"
                        }`}
                      >
                        {golfer.name}
                      </p>

                      <p
                        className={`mt-1 text-sm ${
                          isTaken ? "text-slate-600" : "text-slate-400"
                        }`}
                      >
                        {golfer.vegasOdds || "Odds TBD"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        isTaken
                          ? "bg-[#1F2937] text-slate-500"
                          : "bg-emerald-400/15 text-emerald-300"
                      }`}
                    >
                      {isTaken ? "Taken" : "Draft"}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 flex-1 rounded-2xl border border-white/5 bg-[#111827] p-3 shadow-xl shadow-black/40 md:rounded-3xl md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
              <div>
                <h2 className="text-xl font-bold md:text-2xl">Draft Board</h2>

                <p className="mt-1 text-xs text-slate-400 md:text-sm">
                  Picks fill in automatically as golfers are selected.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 md:px-4 md:text-sm">
                Snake Draft
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/5">
              <div style={{ minWidth: `${teams.length * 150}px` }}>
                <div
                  className="sticky top-0 z-20 grid bg-gradient-to-r from-emerald-900 to-emerald-700"
                  style={{
                    gridTemplateColumns: `repeat(${teams.length}, minmax(150px, 1fr))`,
                  }}
                >
                  {teams.map((team) => (
                    <div
                      key={team}
                      className="border-r border-emerald-600/40 p-3 text-center last:border-r-0 md:p-5"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200 md:text-xs">
                        Team
                      </p>

                      <p className="mt-1 text-sm font-black text-white md:text-xl">
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

                      return (
                        <div
                          key={`${roundIndex}-${team}`}
                          className={`relative min-h-[92px] border-r border-t border-white/5 p-3 last:border-r-0 md:min-h-[118px] md:p-4 ${
                            pick
                              ? "bg-blue-500/15"
                              : isCurrentPick
                              ? "bg-emerald-400/15"
                              : "bg-[#030712]"
                          }`}
                        >
                          <div
                            className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold md:right-3 md:top-3 md:text-xs ${
                              pick
                                ? "bg-blue-400/20 text-blue-200"
                                : isCurrentPick
                                ? "bg-emerald-400 text-slate-950"
                                : "bg-[#1F2937] text-slate-400"
                            }`}
                          >
                            {getRoundPickLabel(
                              displayedPickIndex,
                              teams.length
                            )}
                          </div>

                          {pick ? (
  <>
    <p className="pr-10 text-xs font-semibold text-blue-200 md:pr-12 md:text-sm">
      Drafted
    </p>

    <p className="mt-2 pr-10 text-sm font-bold leading-tight text-white md:pr-12 md:text-lg">
      {pick.golfer.name}
    </p>
  </>
) : (
                            <>
                              <p
                                className={`pr-10 text-xs font-semibold md:pr-12 md:text-sm ${
                                  isCurrentPick
                                    ? "text-emerald-300"
                                    : "text-slate-500"
                                }`}
                              >
                                {isCurrentPick ? "On the clock" : "Open"}
                              </p>

                              <p className="mt-2 pr-10 text-xs text-slate-600 md:pr-12 md:text-sm">
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

      {pendingGolfer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#030712]/70 px-4 pb-6 backdrop-blur-sm md:items-center md:pb-0">
          <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
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
    </main>
  );
}
