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
  tournament_score: number | null;
  round_1: number | null;
  round_2: number | null;
  round_3: number | null;
  round_4: number | null;
};

function formatScore(score: number) {
  if (score > 0) return `+${score}`;
  if (score === 0) return "E";
  return score.toString();
}

function getRankMap(scores: GolferScoreRow[]) {
  const sorted = [...scores]
    .filter((g) => typeof g.tournament_score === "number")
    .sort((a, b) => (a.tournament_score ?? 0) - (b.tournament_score ?? 0));

  const map = new Map<string, string>();

  sorted.forEach((golfer) => {
    const score = golfer.tournament_score ?? 0;
    const firstIndex = sorted.findIndex(
      (g) => (g.tournament_score ?? 0) === score
    );
    const sameScoreCount = sorted.filter(
      (g) => (g.tournament_score ?? 0) === score
    ).length;

    map.set(golfer.name, sameScoreCount > 1 ? `T${firstIndex + 1}` : `${firstIndex + 1}`);
  });

  return map;
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

    const interval = setInterval(loadLeaderboard, 3000);
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

  const scoreMap = new Map(golferScores.map((golfer) => [golfer.name, golfer]));
  const rankMap = getRankMap(golferScores);

  const teamsWithGolfers = pool.draftOrder.map((team) => {
    const golfers = draftPicks
      .filter((pick) => pick.team === team)
      .map((pick) => {
        const scoreData = scoreMap.get(pick.golfer_name);

        return {
          name: pick.golfer_name,
          rank: rankMap.get(pick.golfer_name) || "-",
          round1: scoreData?.round_1 ?? 0,
          round2: scoreData?.round_2 ?? 0,
          round3: scoreData?.round_3 ?? 0,
          round4: scoreData?.round_4 ?? 0,
          total: scoreData?.tournament_score ?? 0,
        };
      })
      .sort((a, b) => a.total - b.total);

    const countingGolfers = [...golfers]
      .sort((a, b) => a.total - b.total)
      .slice(0, pool.scoresToCount);

    const teamTotal = countingGolfers.reduce((sum, g) => sum + g.total, 0);
    const teamRound1 = countingGolfers.reduce((sum, g) => sum + g.round1, 0);
    const teamRound2 = countingGolfers.reduce((sum, g) => sum + g.round2, 0);
    const teamRound3 = countingGolfers.reduce((sum, g) => sum + g.round3, 0);
    const teamRound4 = countingGolfers.reduce((sum, g) => sum + g.round4, 0);

    return {
      name: team,
      golfers,
      countingGolferNames: countingGolfers.map((g) => g.name),
      round1: teamRound1,
      round2: teamRound2,
      round3: teamRound3,
      round4: teamRound4,
      total: teamTotal,
    };
  });

  const sortedTeams = [...teamsWithGolfers].sort((a, b) => a.total - b.total);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1700px] px-3 py-6 md:px-6 md:py-8">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold text-emerald-300 md:text-sm">
              Live Standings
            </p>
            <h1 className="mt-1 text-3xl font-black md:text-5xl">
              Leaderboard
            </h1>
            <p className="mt-2 text-xs text-slate-400 md:text-base">
              {pool.golfEvent} • Draft {pool.golfersPerTeam} golfers • Best{" "}
              {pool.scoresToCount} scores count
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={syncScores}
              disabled={isSyncing}
              className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50 md:px-5 md:py-3 md:text-sm"
            >
              {isSyncing ? "Updating..." : "Refresh Scores"}
            </button>

            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 md:px-4 md:py-3 md:text-sm">
              {pool.poolName}
            </div>
          </div>
        </div>

        <section className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="self-start rounded-2xl border border-white/10 bg-white/[0.04] p-3 xl:sticky xl:top-6">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">
              Leaderboard
            </h2>

            <div className="space-y-1">
              {sortedTeams.map((team, index) => (
                <div
                  key={team.name}
                  className="grid grid-cols-[32px_1fr_70px] items-center border-b border-white/5 py-2 text-sm last:border-0"
                >
                  <p className="font-bold text-slate-400">{index + 1}</p>
                  <p className="font-bold">{team.name}</p>
                  <p className="text-right text-lg font-black text-emerald-300">
                    {formatScore(team.total)}
                  </p>
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-3">
            {sortedTeams.map((team, index) => (
              <div
                key={team.name}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      {index + 1}
                    </p>
                    <h2 className="text-xl font-black">{team.name}</h2>
                  </div>

                  <p className="text-3xl font-black text-emerald-300">
                    {formatScore(team.total)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-2 pr-3">Pos</th>
                        <th className="py-2 pr-3">Player</th>
                        <th className="py-2 text-center">R1</th>
                        <th className="py-2 text-center">R2</th>
                        <th className="py-2 text-center">R3</th>
                        <th className="py-2 text-center">R4</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {team.golfers.map((golfer) => {
                        const isCounting = team.countingGolferNames.includes(
                          golfer.name
                        );

                        return (
                          <tr
                            key={`${team.name}-${golfer.name}`}
                            className={`border-b border-white/5 last:border-0 ${
                              isCounting ? "text-white" : "text-slate-500"
                            }`}
                          >
                            <td className="py-2 pr-3 font-bold text-slate-400">
                              {golfer.rank}
                            </td>
                            <td className="py-2 pr-3 font-bold">
                              {golfer.name}
                            </td>
                            <td className="py-2 text-center">
                              {formatScore(golfer.round1)}
                            </td>
                            <td className="py-2 text-center">
                              {formatScore(golfer.round2)}
                            </td>
                            <td className="py-2 text-center">
                              {formatScore(golfer.round3)}
                            </td>
                            <td className="py-2 text-center">
                              {formatScore(golfer.round4)}
                            </td>
                            <td
                              className={`py-2 text-right font-black ${
                                isCounting
                                  ? "text-emerald-300"
                                  : "text-slate-500"
                              }`}
                            >
                              {formatScore(golfer.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
