"use client";

import { useEffect, useState } from "react";
import {
  getPool,
  getDraftPicks,
  saveDraftPick,
  deleteLastDraftPick,
  loadGolfers,
} from "../lib/poolApi";

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

export default function DraftPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [availableGolfers, setAvailableGolfers] = useState<Golfer[]>([]);
  const [draftPicks, setDraftPicks] = useState<(DraftPick | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            rank: pick.golfer_rank,
          },
          pickIndex: pick.pick_index,
        };
      });

      setDraftPicks(picksArray);

      const draftedGolferNames = savedPicks.map(
        (pick: any) => pick.golfer_name
      );

      const golfers = await loadGolfers("USOPEN2026");

      const formattedGolfers = golfers.map((golfer: any) => ({
  name: golfer.name,
  rank: golfer.world_rank,
  vegasOdds: golfer.vegas_odds,
}));

      console.log("GOLFERS FROM SUPABASE:", formattedGolfers);
console.log("DRAFTED NAMES:", draftedGolferNames);

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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-2 md:px-6 py-12">
          <h1 className="text-2xl md:text-4xl font-black">Loading draft...</h1>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-2 md:px-6 py-12">
          <h1 className="text-2xl md:text-4xl font-black">No pool found</h1>
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
      <div className="mx-auto max-w-[1700px] px-2 md:px-6 py-8">
        <a
          href={`/pool?id=${pool.id}`}
          className="text-sm font-medium text-emerald-300"
        >
          ← Back to Pool Lobby
        </a>

        <div className="mt-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              {draftComplete
                ? "Draft Complete"
                : `Current Pick ${getRoundPickLabel(
                    currentPickIndex,
                    teams.length
                  )}`}
            </p>

            <h1 className="mt-2 text-3xl md:text-5xl font-black">Draft Room</h1>

            <p className="mt-4 text-base md:text-xl font-semibold text-slate-200">
              {draftComplete
                ? "All picks are complete."
                : `${currentTeam} is on the clock.`}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={undoLastPick}
              className="rounded-xl border border-white/15 px-5 py-3 font-bold text-slate-200 transition hover:bg-white/10"
            >
              Undo Pick
            </button>

            <a
              href={`/leaderboard?id=${pool.id}`}
              className="rounded-xl bg-emerald-400 px-2 md:px-6 py-3 font-bold text-slate-950"
            >
              Finish Draft
            </a>
          </div>
        </div>

        <div className="mt-8 flex gap-6">
          <aside className="sticky top-6 h-[calc(100vh-48px)] w-[340px] shrink-0 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-2xl font-bold">Eligible Golfers</h2>
            <p className="mt-2 text-sm text-slate-400">
              Click Draft to select a golfer for the team on the clock.
            </p>

            <input
              type="text"
              placeholder="Search golfers..."
              className="mt-5 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />

            <div className="mt-5 h-[calc(100vh-240px)] space-y-3 overflow-y-auto pr-1">
              {availableGolfers.map((golfer) => (
                <button
                  key={`${golfer.name}-${golfer.rank}`}
                  onClick={() => draftGolfer(golfer)}
                  disabled={draftComplete}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-4 text-left transition hover:border-emerald-400/50 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div>
                    <p className="font-bold">{golfer.name}</p>
                    <p className="text-sm text-slate-400">
                      {golfer.vegasOdds || "Odds TBD"}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm">
                    Draft
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 flex-1 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Draft Board</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Picks fill in automatically as golfers are selected.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                Snake Draft
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <div style={{ minWidth: `${teams.length * 230}px` }}>
                <div
                  className="grid bg-gradient-to-r from-emerald-900 to-emerald-700"
                  style={{
                    gridTemplateColumns: `repeat(${teams.length}, minmax(180px, 1fr))`,
                  }}
                >
                  {teams.map((team) => (
                    <div
                      key={team}
                      className="border-r border-emerald-600/40 p-5 text-center last:border-r-0"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
                        Team
                      </p>

                      <p className="mt-1 text-xl font-black text-white">
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
                      gridTemplateColumns: `repeat(${teams.length}, minmax(180px, 1fr))`,
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
                          className={`relative min-h-[118px] border-r border-t border-white/10 p-4 last:border-r-0 ${
                            pick
                              ? "bg-blue-500/15"
                              : isCurrentPick
                              ? "bg-emerald-400/15"
                              : "bg-slate-950"
                          }`}
                        >
                          <div
                            className={`absolute right-3 top-3 rounded-full px-2 py-1 text-xs font-bold ${
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
                              <p className="pr-12 text-sm font-semibold text-blue-200">
                                Drafted
                              </p>
                              <p className="mt-2 pr-12 text-lg font-bold text-white">
                                {pick.golfer.name}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">
                                World Rank #{pick.golfer.rank}
                              </p>
                            </>
                          ) : (
                            <>
                              <p
                                className={`pr-12 text-sm font-semibold ${
                                  isCurrentPick
                                    ? "text-emerald-300"
                                    : "text-slate-500"
                                }`}
                              >
                                {isCurrentPick ? "On the clock" : "Open"}
                              </p>
                              <p className="mt-2 pr-12 text-sm text-slate-600">
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