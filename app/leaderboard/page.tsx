"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPool, getDraftPicks, getGolferScores } from "../lib/poolApi";
import BrandMark from "../components/BrandMark";

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

type TeamGolfer = {
  name: string;
  rank: number;
  position: string;
  round1: number | null;
  round2: number | null;
  round3: number | null;
  round4: number | null;
  total: number;
  hasScore: boolean;
  counts: boolean;
};

type TeamResult = {
  teamName: string;
  total: number;
  golfers: TeamGolfer[];
};

const CURRENT_EVENT_ID = "TRAVELERS2026";

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatScore(score: number) {
  if (score > 0) return `+${score}`;
  if (score === 0) return "E";
  return score.toString();
}

function formatRoundScore(score: number | null | undefined) {
  if (score === null || score === undefined) return "-";
  if (score > 0) return `+${score}`;
  if (score === 0) return "E";
  return score.toString();
}

function calculateGolferTotal(scoreData?: GolferScoreRow) {
  const completedRounds = [
    scoreData?.round_1,
    scoreData?.round_2,
    scoreData?.round_3,
    scoreData?.round_4,
  ].filter((score): score is number => typeof score === "number");

  return {
    hasScore: completedRounds.length > 0,
    total: completedRounds.reduce((sum, score) => sum + score, 0),
  };
}

function getRankMap(scores: GolferScoreRow[]) {
  const validScores = scores
    .map((score) => {
      const calculated = calculateGolferTotal(score);

      return {
        ...score,
        calculatedTotal: calculated.total,
        hasScore: calculated.hasScore,
      };
    })
    .filter((score) => score.hasScore)
    .sort((a, b) => a.calculatedTotal - b.calculatedTotal);

  const rankMap: Record<string, string> = {};
  let previousScore: number | null = null;
  let previousRank = 0;

  validScores.forEach((score, index) => {
    const currentScore = score.calculatedTotal;
    const rank = currentScore === previousScore ? previousRank : index + 1;

    previousScore = currentScore;
    previousRank = rank;

    const tiedCount = validScores.filter(
      (item) => item.calculatedTotal === currentScore
    ).length;

    rankMap[normalizeName(score.name)] = tiedCount > 1 ? `T${rank}` : `${rank}`;
  });

  return rankMap;
}

export default function LeaderboardPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [draftPicks, setDraftPicks] = useState<DraftPickRow[]>([]);
  const [golferScores, setGolferScores] = useState<GolferScoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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
      teamNames: savedPool.team_names || [],
      draftOrder: savedPool.draft_order || [],
    };

    setPool(formattedPool);

    const savedPicks = await getDraftPicks(formattedPool.id);
    setDraftPicks(savedPicks || []);

    const scores = await getGolferScores(CURRENT_EVENT_ID);
    setGolferScores(scores || []);

    setIsLoading(false);
  }

  useEffect(() => {
    loadLeaderboard();

    const interval = window.setInterval(() => {
      loadLeaderboard();
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  async function syncScores() {
    setIsSyncing(true);

    try {
      await fetch(`/api/scoring/sync?ts=${Date.now()}`, {
        cache: "no-store",
      });

      await loadLeaderboard();
    } catch (error) {
      console.error("Failed to sync scores:", error);
      alert("Score refresh failed. Try again in a minute.");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#030712] px-4 py-8 text-white">
        <BrandMark size="md" />
        <p className="text-slate-400">Loading leaderboard...</p>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] px-4 py-8 text-white">
        <BrandMark size="md" />
        <p className="text-slate-400">Pool not found.</p>
      </main>
    );
  }

  const scoreMap: Record<string, GolferScoreRow> = {};

  golferScores.forEach((score) => {
    scoreMap[normalizeName(score.name)] = score;
  });

  const rankMap = getRankMap(golferScores);

  const teamsWithGolfers: TeamResult[] = pool.teamNames.map((teamName) => {
    const teamPicks = draftPicks
      .filter((pick) => pick.team === teamName)
      .sort((a, b) => a.pick_index - b.pick_index);

    const rawGolfers = teamPicks.map((pick) => {
      const scoreData = scoreMap[normalizeName(pick.golfer_name)];
      const calculated = calculateGolferTotal(scoreData);

      return {
        name: pick.golfer_name,
        rank: pick.golfer_rank,
        position: scoreData ? rankMap[normalizeName(scoreData.name)] || "-" : "-",
        round1: scoreData?.round_1 ?? null,
        round2: scoreData?.round_2 ?? null,
        round3: scoreData?.round_3 ?? null,
        round4: scoreData?.round_4 ?? null,
        total: calculated.total,
        hasScore: calculated.hasScore,
        counts: false,
      };
    });

    const sortedForScoring = [...rawGolfers].sort((a, b) => {
      if (a.hasScore !== b.hasScore) return a.hasScore ? -1 : 1;
      return a.total - b.total;
    });

    const scoringNames = new Set(
      sortedForScoring
        .filter((golfer) => golfer.hasScore)
        .slice(0, pool.scoresToCount)
        .map((golfer) => normalizeName(golfer.name))
    );

    const golfers = rawGolfers
      .map((golfer) => ({
        ...golfer,
        counts: scoringNames.has(normalizeName(golfer.name)),
      }))
      .sort((a, b) => {
        if (a.counts !== b.counts) return a.counts ? -1 : 1;
        if (a.hasScore !== b.hasScore) return a.hasScore ? -1 : 1;
        return a.total - b.total;
      });

    const total = golfers
      .filter((golfer) => golfer.counts)
      .reduce((sum, golfer) => sum + golfer.total, 0);

    return {
      teamName,
      total,
      golfers,
    };
  });

  const rankedTeams = [...teamsWithGolfers].sort((a, b) => a.total - b.total);

  return (
    <main className="min-h-screen bg-[#030712] px-3 py-5 text-white sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" aria-label="Draft With Friends home">
              <BrandMark size="md" />
            </Link>

            <p className="text-sm font-extrabold text-emerald-400">
              Live Standings
            </p>
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Leaderboard
          </h1>

          <p className="mt-2 text-base font-semibold text-slate-400 sm:text-xl">
            {pool.golfEvent} • Draft {pool.golfersPerTeam} golfers • Best{" "}
            {pool.scoresToCount} scores count
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={syncScores}
              disabled={isSyncing}
              className="rounded-xl bg-emerald-400 px-5 py-3 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? "Refreshing..." : "Refresh"}
            </button>

            <a
              href={`/pool?id=${pool.id}`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-base font-black text-emerald-300 transition hover:bg-emerald-400/20"
            >
              {pool.poolName}
            </a>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-slate-700/60 bg-[#111827] p-4 sm:p-5 shadow-xl shadow-black/40">
            <h2 className="mb-3 text-lg font-black uppercase tracking-wide text-slate-400">
              Leaderboard
            </h2>

            <div className="space-y-1">
              {rankedTeams.map((team, index) => (
                <div
                  key={team.teamName}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#1F2937] px-3 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-slate-400">
                      {index + 1}
                    </span>
                    <span className="text-lg font-black sm:text-xl">
                      {team.teamName}
                    </span>
                  </div>

                  <span className="text-lg font-black text-emerald-300 sm:text-xl">
                    {formatScore(team.total)}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <section className="space-y-5">
            {rankedTeams.map((team, teamIndex) => (
              <article
                key={team.teamName}
                className="rounded-2xl border border-slate-700/60 bg-[#111827] p-4 sm:p-5 shadow-xl shadow-black/40"
              >
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-700/60 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xl font-black text-slate-400 sm:text-2xl">
                      {teamIndex + 1}
                    </span>
                    <h2 className="min-w-0 truncate text-xl font-black sm:text-2xl">
                      {team.teamName}
                    </h2>
                  </div>

                  <span className="shrink-0 text-xl font-black text-emerald-300 sm:text-2xl">
                    {formatScore(team.total)}
                  </span>
                </div>

                <div className="hidden md:block">
                  <div className="grid grid-cols-[80px_1fr_70px_70px_70px_70px_90px] border-b border-slate-700/60 pb-3 text-sm font-black uppercase tracking-wide text-slate-400">
                    <div>Pos</div>
                    <div>Golfer</div>
                    <div className="text-right">R1</div>
                    <div className="text-right">R2</div>
                    <div className="text-right">R3</div>
                    <div className="text-right">R4</div>
                    <div className="text-right">Total</div>
                  </div>

                  <div>
                    {team.golfers.map((golfer, golferIndex) => (
                      <div
                        key={`${team.teamName}-${golfer.name}-${golferIndex}`}
                        className={`mt-2 grid grid-cols-[80px_1fr_70px_70px_70px_70px_90px] items-center rounded-xl border border-white/5 bg-[#1F2937] px-3 py-3 ${
                          golfer.counts
                            ? "text-white"
                            : "text-slate-500 line-through"
                        }`}
                      >
                        <div className="text-lg font-black text-slate-400">
                          {golfer.position}
                        </div>

                        <div className="text-lg font-black">{golfer.name}</div>

                        <div className="text-right font-bold">
                          {formatRoundScore(golfer.round1)}
                        </div>

                        <div className="text-right font-bold">
                          {formatRoundScore(golfer.round2)}
                        </div>

                        <div className="text-right font-bold">
                          {formatRoundScore(golfer.round3)}
                        </div>

                        <div className="text-right font-bold">
                          {formatRoundScore(golfer.round4)}
                        </div>

                        <div className="text-right text-lg font-black text-emerald-300">
                          {golfer.hasScore ? formatScore(golfer.total) : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:hidden">
                  <div className="grid grid-cols-[38px_minmax(105px,1fr)_30px_30px_30px_30px_44px] gap-1 border-b border-slate-700/60 pb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <div>Pos</div>
                    <div>Golfer</div>
                    <div className="text-right">R1</div>
                    <div className="text-right">R2</div>
                    <div className="text-right">R3</div>
                    <div className="text-right">R4</div>
                    <div className="text-right">Tot</div>
                  </div>

                  <div>
                    {team.golfers.map((golfer, golferIndex) => (
                      <div
                        key={`${team.teamName}-${golfer.name}-${golferIndex}`}
                        className={`mt-2 grid grid-cols-[38px_minmax(105px,1fr)_30px_30px_30px_30px_44px] items-center gap-1 rounded-xl border border-white/5 bg-[#1F2937] px-2 py-2.5 ${
                          golfer.counts
                            ? "text-white"
                            : "text-slate-500 line-through"
                        }`}
                      >
                        <div className="text-sm font-black text-slate-400">
                          {golfer.position}
                        </div>

                        <div className="min-w-0 truncate text-sm font-black">
                          {golfer.name}
                        </div>

                        <div className="text-right text-xs font-bold">
                          {formatRoundScore(golfer.round1)}
                        </div>

                        <div className="text-right text-xs font-bold">
                          {formatRoundScore(golfer.round2)}
                        </div>

                        <div className="text-right text-xs font-bold">
                          {formatRoundScore(golfer.round3)}
                        </div>

                        <div className="text-right text-xs font-bold">
                          {formatRoundScore(golfer.round4)}
                        </div>

                        <div className="text-right text-sm font-black text-emerald-300">
                          {golfer.hasScore ? formatScore(golfer.total) : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
