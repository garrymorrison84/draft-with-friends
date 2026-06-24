"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPool,
  getDraftPicks,
  saveDraftPick,
  deleteLastDraftPick,
  loadGolfers,
} from "../lib/poolApi";

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
};

type DraftPick = {
  team: string;
  golfer: Golfer;
  pickIndex: number;
};

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
  const odds = golfer.odds ?? golfer.vegas_odds ?? golfer.rank ?? golfer.world_rank;

  const oddsNumber =
    typeof odds === "number"
      ? odds
      : Number(String(odds ?? "").replace("+", ""));

  return Number.isFinite(oddsNumber) ? oddsNumber : 999999;
}

export default function DraftPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [availableGolfers, setAvailableGolfers] = useState<Golfer[]>([]);
  const [draftPicks, setDraftPicks] = useState<(DraftPick | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        teamNames: savedPool.team_names,
        draftOrder: savedPool.draft_order,
      };

      setPool(formattedPool);

      const totalPicks =
        formattedPool.draftOrder.length * formattedPool.golfersPerTeam;

      const savedPicks = await getDraftPicks(formattedPool.id);

      const picksArray: (DraftPick | null)[] = Array(totalPicks).fill(null);

      savedPicks.forEach((pick: any) => {
        picksArray[pick.pick_index] = {
          team: pick.team,
          golfer: {
            name: pick.golfer_name,
            rank: pick.golfer_rank ?? 999999,
            vegasOdds: pick.golfer_rank
              ? formatOdds(pick.golfer_rank)
              : "Odds TBD",
          },
          pickIndex: pick.pick_index,
        };
      });

      setDraftPicks(picksArray);

      const draftedGolferNames = savedPicks.map(
        (pick: any) => pick.golfer_name
      );

      const golfers = await loadGolfers(CURRENT_EVENT_ID);

      const formattedGolfers = golfers
        .map((golfer: any) => {
          const sortValue = getSortValue(golfer);

          return {
            name: golfer.name,
            rank: sortValue,
            vegasOdds: formatOdds(golfer.odds ?? golfer.vegas_odds),
          };
        })
        .sort((a: Golfer, b: Golfer) => a.rank - b.rank);

      setAvailableGolfers(
        formattedGolfers.filter(
          (golfer: Golfer) => !draftedGolferNames.includes(golfer.name)
        )
      );

      setIsLoading(false);
    }

    loadDraft();

    const interval = setInterval(() => {
      loadDraft();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredAvailableGolfers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return availableGolfers;

    return availableGolfers.filter((golfer) =>
      golfer.name.toLowerCase().includes(search)
    );
  }, [availableGolfers, searchTerm]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-3 py-8 md:px-6 md:py-12">
          <h1 className="text-2xl font-black md:text-4xl">
            Loading draft...
          </h1>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-3 py-8 md:px-6 md:py-12">
          <h1 className="text-2xl font-black md:text-4xl">No pool found</h1>
          <a href="/create-pool" className="mt-6 inline-block text-emerald-300">
            Create a pool →
          </a>
        </div>
      </main>
    );
  }

  const teams = pool.draftOrder;
  const golfersPerTeam = pool.golfersPerTeam;
  const totalPicks = teams.length * golfersPerTeam;

  const currentPickIndex = draftPicks.findIndex((pick) => pick === null);
  const draftComplete =
    draftPicks.length === totalPicks && currentPickIndex === -1;

  const currentTeamIndex = draftComplete
    ? null
    : getTeamIndexForPick(currentPickIndex, teams.length);

  const currentTeam =
    currentTeamIndex === null ? "Draft Complete" : teams[currentTeamIndex];

  async function draftGolfer(golfer: Golfer) {
  if (draftComplete) return;

  const confirmed = window.confirm(`Draft ${golfer.name}?`);

  if (!confirmed) return;

  const nextPick: DraftPick = {
    team: currentTeam,
    golfer,
    pickIndex: currentPickIndex,
  };

  const nextPicks = [...draftPicks];
  nextPicks[currentPickIndex] = nextPick;

  setDraftPicks(nextPicks);
  setAvailableGolfers((prev) =>
    prev.filter((player) => player.name !== golfer.name)
  );

  await saveDraftPick({
    pool_id: pool!.id,
    team: currentTeam,
    golfer_name: golfer.name,
    golfer_rank: golfer.rank,
    pick_index: currentPickIndex,
  });
}

  async function undoLastPick() {
    const lastPick = [...draftPicks]
      .map((pick, index) => ({ pick, index }))
      .filter(
        (item): item is { pick: DraftPick; index: number } =>
          item.pick !== null
      )
      .pop();

    if (!lastPick) return;

    const nextPicks = [...draftPicks];
    nextPicks[lastPick.index] = null;

    setDraftPicks(nextPicks);

    setAvailableGolfers((prev) =>
      [...prev, lastPick.pick.golfer].sort((a, b) => a.rank - b.rank)
    );

    await deleteLastDraftPick(pool!.id, lastPick.index);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1700px] px-3 py-4 md:px-6 md:py-8">
        <a
          href={`/pool?id=${pool.id}`}
          className="text-sm font-medium text-emerald-300"
        >
          ← Back to Pool Lobby
        </a>

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

            <h1 className="mt-2 text-3xl font-black leading-tight md:text-5xl">
              Draft Room
            </h1>

            <p className="mt-3 text-base font-semibold text-slate-200 md:mt-4 md:text-xl">
              {draftComplete
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
              className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 md:px-5 md:text-base"
            >
              Undo Pick
            </button>

            <a
              href={`/leaderboard?id=${pool.id}`}
              className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-bold text-slate-950 md:px-6 md:text-base"
            >
              Finish Draft
            </a>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:mt-8 lg:flex-row lg:gap-6">
          <aside className="w-full shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:w-[340px] lg:rounded-3xl lg:p-5">
            <h2 className="text-xl font-bold md:text-2xl">Eligible Golfers</h2>

            <p className="mt-2 text-sm text-slate-400">
              Click Draft to select a golfer for the team on the clock.
            </p>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search golfers..."
              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none md:mt-5 md:text-base"
            />

            <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1 lg:h-[calc(100vh-240px)] lg:max-h-none">
              {filteredAvailableGolfers.map((golfer) => (
                <button
                  key={golfer.name}
                  onClick={() => draftGolfer(golfer)}
                  disabled={draftComplete}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 p-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40 md:p-4"
                >
                  <div>
                    <p className="text-sm font-bold leading-tight md:text-base">
                      {golfer.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {golfer.vegasOdds || "Odds TBD"}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                    Draft
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:rounded-3xl md:p-5">
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

            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10">
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
                          className={`relative min-h-[92px] border-r border-t border-white/10 p-3 last:border-r-0 md:min-h-[118px] md:p-4 ${
                            pick
                              ? "bg-blue-500/15"
                              : isCurrentPick
                              ? "bg-emerald-400/15"
                              : "bg-slate-950"
                          }`}
                        >
                          <div
                            className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold md:right-3 md:top-3 md:text-xs ${
                              pick
                                ? "bg-blue-400/20 text-blue-200"
                                : isCurrentPick
                                ? "bg-emerald-400 text-slate-950"
                                : "bg-white/10 text-slate-400"
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

                              <p className="mt-1 text-xs text-slate-400 md:text-sm">
                                Odds {pick.golfer.vegasOdds || "TBD"}
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
    </main>
  );
}
