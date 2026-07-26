"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPool, getDraftPicks, getGolferScores } from "../lib/poolApi";
import {
  loadPool as loadLocalPool,
  loadDraftPicks as loadLocalDraftPicks,
} from "../lib/poolStorage";
import BrandMark from "../components/BrandMark";

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
  position?: string | null;
  status?: string | null;
};

type GolferStatusRow = {
  name: string;
  position?: string | null;
  status?: string | null;
  penalty_status?: boolean;
};

type TeamGolfer = {
  name: string;
  teamName: string;
  rank: number;
  pickIndex: number;
  position: string;
  missedCut: boolean;
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

type GolfRecapAward = {
  title: string;
  headline: string;
  detail: string;
};

type UndraftedGolfer = {
  name: string;
  total: number;
  position: string;
};

const FALLBACK_EVENT_ID = "GENESIS_SCOTTISH_OPEN_2026";

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

function formatGolferTotal(golfer: TeamGolfer) {
  if (!golfer.hasScore) return "-";
  return formatScore(golfer.total);
}

function getGolferRowClass(golfer: TeamGolfer) {
  if (golfer.counts) return "text-white";
  if (golfer.missedCut) return "text-slate-500";
  return "text-slate-500 line-through";
}

function calculateGolferTotal(scoreData?: GolferScoreRow) {
  const normalized = normalizeGolferScore(scoreData);

  return {
    hasScore: normalized.hasScore,
    total: normalized.total,
  };
}

function isMissedCutScore(scoreData?: GolferScoreRow) {
  const statusText = `${scoreData?.position ?? ""} ${scoreData?.status ?? ""}`
    .toUpperCase()
    .trim();

  return /\b(MC|CUT|MISSED CUT|WD|W\/D|WITHDRAWN|WITHDREW|DQ|DISQUALIFIED|MDF)\b/.test(
    statusText
  );
}

function normalizeFutureRoundScore(
  score: number | null | undefined,
  scoreData?: GolferScoreRow
) {
  if (score === null || score === undefined) return null;

  // SportsData can leave +8 placeholders for players who have not teed off.
  // For MC golfers, +8 is the intentional penalty for started rounds.
  if (score === 8 && !isMissedCutScore(scoreData)) return null;

  return score;
}

function normalizeGolferScore(
  scoreData?: GolferScoreRow,
  options: { showRound4?: boolean } = {}
) {
  const showRound4 = options.showRound4 ?? true;
  const missedCut = isMissedCutScore(scoreData);
  const round1 = scoreData?.round_1 ?? null;
  const round2 = scoreData?.round_2 ?? null;
  const round3 = normalizeFutureRoundScore(scoreData?.round_3, scoreData);
  const round4 =
    showRound4 ? normalizeFutureRoundScore(scoreData?.round_4, scoreData) : null;
  const completedRounds = [
    round1,
    round2,
    round3,
    round4,
  ].filter((score): score is number => typeof score === "number");

  return {
    missedCut,
    round1,
    round2,
    round3,
    round4,
    hasScore: completedRounds.length > 0,
    total: completedRounds.reduce((sum, score) => sum + score, 0),
  };
}

function hasUsableScore(scores: GolferScoreRow[]) {
  return scores.some((score) => normalizeGolferScore(score).hasScore);
}

function sameEventName(first?: string | null, second?: string | null) {
  if (!first || !second) return false;

  const firstName = normalizeName(first);
  const secondName = normalizeName(second);

  return (
    firstName === secondName ||
    firstName.includes(secondName) ||
    secondName.includes(firstName)
  );
}

function getRankMap(scores: GolferScoreRow[], showRound4: boolean) {
  const validScores = scores
    .map((score) => {
      const calculated = normalizeGolferScore(score, { showRound4 });

      return {
        ...score,
        calculatedTotal: calculated.total,
        hasScore: calculated.hasScore,
        missedCut: calculated.missedCut,
      };
    })
    .filter((score) => score.hasScore && !score.missedCut)
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

function getOrdinal(value: number) {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? "th"
      : value % 10 === 1
        ? "st"
        : value % 10 === 2
          ? "nd"
          : value % 10 === 3
            ? "rd"
            : "th";

  return `${value}${suffix}`;
}

function RecapAwardCard({ award }: { award: GolfRecapAward }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1F2937] p-4">
      <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
        {award.title}
      </p>
      <h3 className="mt-2 text-xl font-black text-white">{award.headline}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{award.detail}</p>
    </div>
  );
}

export default function LeaderboardPage() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [draftPicks, setDraftPicks] = useState<DraftPickRow[]>([]);
  const [golferScores, setGolferScores] = useState<GolferScoreRow[]>([]);
  const [golferStatuses, setGolferStatuses] = useState<GolferStatusRow[]>([]);
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
    const localPool = savedPool ? null : loadLocalPool(poolId);

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
          draftOrder: savedPool.draft_order || [],
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
          draftOrder: localPool!.draftOrder || [],
        };

    setPool(formattedPool);

    const savedPicks = savedPool
      ? await getDraftPicks(formattedPool.id)
      : loadLocalDraftPicks(formattedPool.id) || [];
    setDraftPicks(
      (savedPicks || [])
        .filter(Boolean)
        .map((pick: any, index: number) => ({
          pool_id: formattedPool.id,
          team: pick.team,
          golfer_name: pick.golfer_name ?? pick.golfer?.name,
          golfer_rank: pick.golfer_rank ?? pick.golfer?.rank ?? 999999,
          pick_index: pick.pick_index ?? pick.pickIndex ?? index,
        }))
        .filter((pick: DraftPickRow) => pick.golfer_name)
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

    let scores = await getGolferScores(eventId);

    if (formattedPool.eventId && !hasUsableScore(scores)) {
      try {
        const response = await fetch("/api/events/active", { cache: "no-store" });
        const data = await response.json();
        const activeEvent = data?.activeEvent;

        if (
          activeEvent?.id &&
          activeEvent.id !== formattedPool.eventId &&
          sameEventName(activeEvent.name, formattedPool.golfEvent)
        ) {
          eventId = activeEvent.id;
          scores = await getGolferScores(eventId);
        }
      } catch (error) {
        console.error("Could not retry scores against active golf event", error);
      }
    }

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
      const response = await fetch(`/api/scoring/sync?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (Array.isArray(data?.scoreStatuses)) {
        setGolferStatuses(data.scoreStatuses);
      }

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
  const statusMap: Record<string, GolferStatusRow> = {};

  golferScores.forEach((score) => {
    scoreMap[normalizeName(score.name)] = score;
  });

  golferStatuses.forEach((status) => {
    statusMap[normalizeName(status.name)] = status;
  });

  function getMergedScoreData(golferName: string) {
    const key = normalizeName(golferName);
    const scoreData = scoreMap[key];
    const statusData = statusMap[key];

    if (!scoreData) return undefined;
    if (!statusData) return scoreData;

    return {
      ...scoreData,
      position: statusData.position ?? scoreData.position,
      status: statusData.status ?? scoreData.status,
    };
  }

  const hasRealRound4Scores = golferScores.some((score) => {
      const statusData = statusMap[normalizeName(score.name)];
      const mergedScore = statusData
        ? {
            ...score,
            position: statusData.position ?? score.position,
            status: statusData.status ?? score.status,
        }
        : score;

      return (
        !isMissedCutScore(mergedScore) &&
        typeof normalizeFutureRoundScore(mergedScore.round_4, mergedScore) ===
          "number"
      );
    });
  const scoresWithStatuses = golferScores.map((score) => {
    const statusData = statusMap[normalizeName(score.name)];

    return statusData
      ? {
          ...score,
          position: statusData.position ?? score.position,
          status: statusData.status ?? score.status,
        }
      : score;
  });
  const rankMap = getRankMap(scoresWithStatuses, hasRealRound4Scores);

  const teamsWithGolfers: TeamResult[] = pool.teamNames.map((teamName) => {
    const teamPicks = draftPicks
      .filter((pick) => pick.team === teamName)
      .sort((a, b) => a.pick_index - b.pick_index);

    const rawGolfers = teamPicks.map((pick) => {
      const scoreData = getMergedScoreData(pick.golfer_name);
      const normalizedScore = normalizeGolferScore(scoreData, {
        showRound4: hasRealRound4Scores,
      });

      return {
        name: pick.golfer_name,
        teamName,
        rank: pick.golfer_rank,
        pickIndex: pick.pick_index,
        position: normalizedScore.missedCut
          ? "MC"
          : scoreData
            ? rankMap[normalizeName(scoreData.name)] || "-"
            : "-",
        missedCut: normalizedScore.missedCut,
        round1: normalizedScore.round1,
        round2: normalizedScore.round2,
        round3: normalizedScore.round3,
        round4: normalizedScore.round4,
        total: normalizedScore.total,
        hasScore: normalizedScore.hasScore,
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
  const totalPicks = pool.numberOfTeams * pool.golfersPerTeam;
  const draftComplete = totalPicks > 0 && draftPicks.length >= totalPicks;
  const draftedNameKeys = new Set(draftPicks.map((pick) => normalizeName(pick.golfer_name)));
  const allDraftedGolfers = teamsWithGolfers.flatMap((team) => team.golfers);
  const scoredDraftedGolfers = allDraftedGolfers.filter((golfer) => golfer.hasScore);
  const mvpGolfer = [...scoredDraftedGolfers].sort((a, b) => a.total - b.total)[0];
  const lvpGolfer = [...scoredDraftedGolfers].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.pickIndex - b.pickIndex;
  })[0];
  const midRoundStart = Math.floor(totalPicks / 3);
  const midRoundEnd = Math.ceil((totalPicks * 2) / 3);
  const midRoundValue =
    [...scoredDraftedGolfers]
      .filter(
        (golfer) =>
          golfer.pickIndex >= midRoundStart && golfer.pickIndex < midRoundEnd
      )
      .sort((a, b) => a.total - b.total)[0] ||
    [...scoredDraftedGolfers]
      .filter((golfer) => golfer.pickIndex >= Math.floor(totalPicks / 2))
      .sort((a, b) => a.total - b.total)[0];
  const undraftedGolfers: UndraftedGolfer[] = scoresWithStatuses
    .filter((score) => !draftedNameKeys.has(normalizeName(score.name)))
    .map((score) => {
      const normalized = normalizeGolferScore(score, {
        showRound4: hasRealRound4Scores,
      });

      return {
        name: score.name,
        total: normalized.total,
        hasScore: normalized.hasScore,
        missedCut: normalized.missedCut,
        position: normalized.missedCut
          ? "MC"
          : rankMap[normalizeName(score.name)] || "-",
      };
    })
    .filter((golfer) => golfer.hasScore && !golfer.missedCut)
    .sort((a, b) => a.total - b.total)
    .slice(0, Math.max(3, pool.scoresToCount));
  const recapAwards: GolfRecapAward[] =
    draftComplete && scoredDraftedGolfers.length > 0
      ? [
          rankedTeams[0]
            ? {
                title: "Champion",
                headline: rankedTeams[0].teamName,
                detail: `Won the pool at ${formatScore(rankedTeams[0].total)}.`,
              }
            : null,
          mvpGolfer
            ? {
                title: "MVP",
                headline: mvpGolfer.name,
                detail: `${mvpGolfer.teamName} landed the best drafted score at ${formatScore(
                  mvpGolfer.total
                )}.`,
              }
            : null,
          lvpGolfer
            ? {
                title: "LVP",
                headline: lvpGolfer.name,
                detail: `${lvpGolfer.teamName}'s ${getOrdinal(
                  lvpGolfer.pickIndex + 1
                )} pick finished at ${formatScore(lvpGolfer.total)}.`,
              }
            : null,
          midRoundValue
            ? {
                title: "Best Mid-Round Value",
                headline: midRoundValue.name,
                detail: `${midRoundValue.teamName} found ${formatScore(
                  midRoundValue.total
                )} with the ${getOrdinal(midRoundValue.pickIndex + 1)} pick.`,
              }
            : null,
        ].filter((award): award is GolfRecapAward => award !== null)
      : [];

  return (
    <main className="min-h-screen bg-[#030712] px-3 py-5 text-white sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" aria-label="Draft With Friends home">
              <BrandMark size="lg" />
            </Link>

            <p className="text-sm font-extrabold text-emerald-400">
              Live Standings
            </p>
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Leaderboard
          </h1>

          <p className="mt-2 text-base font-semibold text-slate-400 sm:text-xl">
            {pool.golfEvent} • Draft {pool.golfersPerTeam} Golfers • Best{" "}
            {pool.scoresToCount} Scores Count
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
              href={`/pool?id=${pool.id}&view=lobby`}
              className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-base font-black text-emerald-300 transition hover:bg-emerald-400/20"
            >
              {pool.poolName} Lobby
            </a>
          </div>
        </div>

        {recapAwards.length > 0 && (
          <section className="mb-6 rounded-3xl border border-emerald-400/20 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  Pool Recap
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Final awards
                </h2>
              </div>
              <p className="text-sm font-bold text-slate-400">
                Built from the draft board and live leaderboard.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {recapAwards.map((award) => (
                <RecapAwardCard key={award.title} award={award} />
              ))}
            </div>

            {undraftedGolfers.length > 0 && (
              <div className="mt-5 rounded-2xl border border-white/5 bg-[#030712] p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Best Undrafted Team
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {undraftedGolfers.map((golfer) => (
                    <div
                      key={golfer.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#1F2937] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {golfer.name}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          {golfer.position}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-emerald-300">
                        {formatScore(golfer.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-slate-700/60 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto lg:self-start">
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
                <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-start justify-between gap-4 border-b border-slate-700/60 bg-[#111827]/95 px-4 pb-4 pt-3 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none">
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
                          getGolferRowClass(golfer)
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

                        <div
                          className={`text-right text-lg font-black ${
                            golfer.missedCut
                              ? "text-slate-400"
                              : "text-emerald-300"
                          }`}
                        >
                          {formatGolferTotal(golfer)}
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
                          getGolferRowClass(golfer)
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

                        <div
                          className={`text-right text-sm font-black ${
                            golfer.missedCut
                              ? "text-slate-400"
                              : "text-emerald-300"
                          }`}
                        >
                          {formatGolferTotal(golfer)}
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
