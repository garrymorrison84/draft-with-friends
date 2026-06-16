"use client";

import { useEffect, useState } from "react";
import { getPool, getDraftPicks, getGolferScores } from "../lib/poolApi";

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

type DraftPickRow = {
  id: number;
  pool_id: string;
  team: string;
  golfer_name: string;
  golfer_rank: number;
  pick_index: number;
};

type GolferScoreRow = {
  name: string;
  vegas_odds?: string;
  tournament_score: number | null;
  round_1: number | null;
  round_2: number | null;
  round_3: number | null;
  round_4: number | null;
};

function golferTotal(rounds: number[]) {
  return rounds.reduce((sum, score) => sum + score, 0);
}

function formatScore(score: number) {
  if (score > 0) return `+${score}`;
  if (score === 0) return "E";
  return score.toString();
}

export default function LeaderboardPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [draftPicks, setDraftPicks] = useState<DraftPickRow[]>([]);
  const [golferScores, setGolferScores] = useState<GolferScoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  async function syncScores() {
  setIsSyncing(true);

  await fetch("/api/sync-sportsdata-scores");

  window.location.reload();
}
  useEffect(() => {
    async function loadLeaderboard() {
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

      const savedPicks = await getDraftPicks(formattedPool.id);
      setDraftPicks(savedPicks || []);

      const scores = await getGolferScores("USOPEN2026");
      setGolferScores(scores || []);

      setIsLoading(false);
    }

    loadLeaderboard();

    const interval = setInterval(() => {
      loadLeaderboard();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-4xl font-black">Loading leaderboard...</h1>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-4xl font-black">No pool found</h1>
          <a href="/create-pool" className="mt-6 inline-block text-emerald-300">
            Create a pool →
          </a>
        </div>
      </main>
    );
  }

  const scoreMap = new Map(
    golferScores.map((golfer) => [golfer.name, golfer])
  );

  const teamsWithGolfers = pool.draftOrder.map((team) => {
    const golfers = draftPicks
      .filter((pick) => pick.team === team)
      .sort((a, b) => a.pick_index - b.pick_index)
      .map((pick) => {
        const scoreData = scoreMap.get(pick.golfer_name);

        const rounds = [
          scoreData?.round_1 ?? 0,
          scoreData?.round_2 ?? 0,
          scoreData?.round_3 ?? 0,
          scoreData?.round_4 ?? 0,
        ];

        return {
          name: pick.golfer_name,
          rank: pick.golfer_rank,
          vegasOdds: scoreData?.vegas_odds || "Odds TBD",
          rounds,
          total: scoreData?.tournament_score ?? golferTotal(rounds),
        };
      });

    const countingGolferNames = [...golfers]
      .sort((a, b) => a.total - b.total)
      .slice(0, pool.scoresToCount)
      .map((golfer) => golfer.name);

    const teamTotal = golfers
      .filter((golfer) => countingGolferNames.includes(golfer.name))
      .reduce((sum, golfer) => sum + golfer.total, 0);

    return {
      name: team,
      golfers,
      countingGolferNames,
      total: teamTotal,
    };
  });

  const sortedTeams = [...teamsWithGolfers].sort((a, b) => a.total - b.total);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
<div className="mx-auto max-w-[1700px] px-6 py-8">
  <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div>
      <p className="text-sm font-semibold text-emerald-300">
        Live Standings
      </p>
      <h1 className="mt-2 text-5xl font-black">Leaderboard</h1>
      <p className="mt-3 text-slate-400">
        {pool.golfEvent} • Draft {pool.golfersPerTeam} golfers • Best{" "}
        {pool.scoresToCount} scores count
      </p>
    </div>

    <div className="flex gap-3">
      <button
        onClick={syncScores}
        disabled={isSyncing}
        className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
      >
        {isSyncing ? "Updating..." : "Refresh Scores"}
      </button>

      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
        {pool.poolName}
      </div>
    </div>
  </div>
        <section className="mt-8 grid gap-5 xl:grid-cols-4">
          {sortedTeams.map((team, index) => (
            <div
              key={team.name}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-400">
                    {index + 1}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{team.name}</h2>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-400">Team Total</p>
                  <p className="text-4xl font-black text-emerald-300">
                    {formatScore(team.total)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {team.golfers.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-500">
                    No golfers drafted yet.
                  </div>
                ) : (
                  team.golfers.map((golfer) => {
                    const isCounting = team.countingGolferNames.includes(
                      golfer.name
                    );

                    return (
                      <div
                        key={golfer.name}
                        className={`rounded-xl border p-3 ${
                          isCounting
                            ? "border-emerald-400/30 bg-emerald-400/10"
                            : "border-white/10 bg-slate-900 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold">{golfer.name}</p>
                            <p className="text-xs text-slate-500">
                              {golfer.vegasOdds}
                            </p>
                          </div>

                          <p
                            className={`text-lg font-black ${
                              isCounting
                                ? "text-emerald-300"
                                : "text-slate-500"
                            }`}
                          >
                            {formatScore(golfer.total)}
                          </p>
                        </div>

                        <div className="mt-3 grid grid-cols-5 gap-1 text-center text-xs">
                          {["RD1", "RD2", "RD3", "RD4", "TOTAL"].map(
                            (label) => (
                              <p
                                key={label}
                                className="font-bold text-slate-400"
                              >
                                {label}
                              </p>
                            )
                          )}

                          {golfer.rounds.map((score, roundIndex) => (
                            <p
                              key={roundIndex}
                              className={
                                isCounting
                                  ? "font-semibold text-white"
                                  : "font-semibold text-slate-500"
                              }
                            >
                              {formatScore(score)}
                            </p>
                          ))}

                          <p
                            className={`font-black ${
                              isCounting
                                ? "text-emerald-300"
                                : "text-slate-500"
                            }`}
                          >
                            {formatScore(golfer.total)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}