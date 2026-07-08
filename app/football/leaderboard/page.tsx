"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballDraftPick,
  FootballPlayer,
  FootballPool,
  FootballScoring,
  defaultScoring,
  footballPlayers,
  loadFootballDraftPicks,
  loadFootballPool,
} from "../lib/storage";
import {
  getProjectedScore,
  scoreFootballStats,
} from "../lib/scoringEngine";
import type { FootballStatLine } from "../lib/scoringEngine";

type TeamScoringColumn = {
  group: string;
  label: string;
  value: (stats: FootballStatLine) => number | undefined;
};

const positionBadgeClasses: Record<FootballPlayer["position"], string> = {
  QB: "border-fuchsia-300/55 bg-fuchsia-400/20 text-fuchsia-100",
  RB: "border-teal-200/55 bg-teal-300/20 text-teal-100",
  WR: "border-sky-200/60 bg-sky-300/25 text-sky-50",
  TE: "border-amber-200/55 bg-amber-300/20 text-amber-100",
  DST: "border-lime-200/55 bg-lime-300/20 text-lime-100",
  K: "border-violet-200/55 bg-violet-300/20 text-violet-100",
};

function hasStatLine(stats?: FootballStatLine) {
  if (!stats) return false;
  return Object.values(stats).some((value) => typeof value === "number" && value !== 0);
}

function scoringStatLine(player: FootballPlayer) {
  return hasStatLine(player.liveStats) ? player.liveStats! : player.projectedStats;
}

function scoringTotal(player: FootballPlayer, scoring: FootballScoring) {
  return scoreFootballStats(scoringStatLine(player), scoring).total;
}

function formatNumber(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatCompactName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;

  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1];
  return `${first}. ${last}`;
}

function buildTeamScoringColumns(scoring: FootballScoring): TeamScoringColumn[] {
  const columns: TeamScoringColumn[] = [];
  const hasPassing = scoring.roster.QB > 0;
  const hasRushing =
    scoring.roster.QB > 0 || scoring.roster.RB > 0 || scoring.roster.FLEX > 0;
  const hasReceiving =
    scoring.roster.RB > 0 ||
    scoring.roster.WR > 0 ||
    scoring.roster.TE > 0 ||
    scoring.roster.FLEX > 0;

  if (hasPassing) {
    if (scoring.passing.completion !== 0) {
      columns.push({ group: "Passing", label: "Comp", value: (stats) => stats.completions });
    }
    if (scoring.passing.passingYardsPerPoint !== 0) {
      columns.push({ group: "Passing", label: "Yds", value: (stats) => stats.passingYards });
    }
    if (scoring.passing.passingTd !== 0) {
      columns.push({ group: "Passing", label: "TD", value: (stats) => stats.passingTds });
    }
    if (scoring.passing.interception !== 0) {
      columns.push({ group: "Passing", label: "Int", value: (stats) => stats.interceptionsThrown });
    }
  }

  if (hasRushing) {
    if (scoring.rushing.attempt !== 0) {
      columns.push({ group: "Rushing", label: "Att", value: (stats) => stats.rushingAttempts });
    }
    if (scoring.rushing.rushingYardsPerPoint !== 0) {
      columns.push({ group: "Rushing", label: "Yds", value: (stats) => stats.rushingYards });
    }
    if (scoring.rushing.rushingTd !== 0) {
      columns.push({ group: "Rushing", label: "TD", value: (stats) => stats.rushingTds });
    }
  }

  if (hasReceiving) {
    if (scoring.receiving.reception !== 0) {
      columns.push({ group: "Receiving", label: "Rec", value: (stats) => stats.receptions });
    }
    if (scoring.receiving.receivingYardsPerPoint !== 0) {
      columns.push({ group: "Receiving", label: "Yds", value: (stats) => stats.receivingYards });
    }
    if (scoring.receiving.receivingTd !== 0) {
      columns.push({ group: "Receiving", label: "TD", value: (stats) => stats.receivingTds });
    }
  }

  if (scoring.roster.K > 0) {
    if (scoring.kicking.extraPoint !== 0) {
      columns.push({ group: "Kicking", label: "XP", value: (stats) => stats.extraPointsMade });
    }
    if (scoring.kicking.missedExtraPoint !== 0) {
      columns.push({ group: "Kicking", label: "XP Miss", value: (stats) => stats.extraPointsMissed });
    }
    if (scoring.kicking.fieldGoal !== 0) {
      columns.push({ group: "Kicking", label: "FG", value: (stats) => stats.fieldGoalsMade });
    }
    if (scoring.kicking.missedFieldGoal !== 0) {
      columns.push({ group: "Kicking", label: "FG Miss", value: (stats) => stats.fieldGoalsMissed });
    }
    if (scoring.kicking.fieldGoal50Bonus !== 0) {
      columns.push({ group: "Kicking", label: "50+", value: (stats) => stats.fieldGoals50Plus });
    }
  }

  if (scoring.roster.DST > 0) {
    if (scoring.defense.sack !== 0) {
      columns.push({ group: "Defense", label: "Sack", value: (stats) => stats.sacks });
    }
    if (scoring.defense.interception !== 0) {
      columns.push({ group: "Defense", label: "Int", value: (stats) => stats.defenseInterceptions });
    }
    if (scoring.defense.fumbleRecovery !== 0) {
      columns.push({ group: "Defense", label: "Fum Rec", value: (stats) => stats.fumbleRecoveries });
    }
    if (scoring.defense.touchdown !== 0) {
      columns.push({ group: "Defense", label: "TD", value: (stats) => stats.defenseTds });
    }
    if (scoring.defense.safety !== 0) {
      columns.push({ group: "Defense", label: "Safe", value: (stats) => stats.safeties });
    }
    if (scoring.defense.blockedKick !== 0) {
      columns.push({ group: "Defense", label: "Blk Kick", value: (stats) => stats.blockedKicks });
    }
    if (scoring.defense.returnTouchdown !== 0) {
      columns.push({ group: "Defense", label: "Ret TD", value: (stats) => stats.returnTds });
    }
  }

  if (scoring.passing.twoPointConversion !== 0) {
    columns.push({ group: "Misc", label: "2PT", value: (stats) => stats.twoPointConversions });
  }
  if (scoring.passing.fumbleLost !== 0) {
    columns.push({ group: "Misc", label: "Lost", value: (stats) => stats.fumblesLost });
  }

  return columns;
}

function columnGroups(columns: TeamScoringColumn[]) {
  return columns.reduce<{ group: string; span: number }[]>((groups, column) => {
    const last = groups[groups.length - 1];
    if (last?.group === column.group) {
      last.span += 1;
    } else {
      groups.push({ group: column.group, span: 1 });
    }
    return groups;
  }, []);
}

export default function FootballLeaderboardPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [players, setPlayers] = useState<FootballPlayer[]>(footballPlayers);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadFootballPool(id);
    if (savedPool) {
      setPool(savedPool);
      setPicks(loadFootballDraftPicks(savedPool.id));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReplayPlayers() {
      try {
        const response = await fetch("/api/football/replay", { cache: "no-store" });
        if (!response.ok) throw new Error("Replay player pool failed");
        const data = await response.json();
        const replayPlayers = data?.playerPool?.players;

        if (!cancelled && Array.isArray(replayPlayers) && replayPlayers.length > 0) {
          setPlayers(replayPlayers);
        }
      } catch {
        if (!cancelled) {
          setPlayers(footballPlayers);
        }
      }
    }

    loadReplayPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  const standings = useMemo(() => {
    if (!pool) return [];
    const scoring = pool.scoring ?? defaultScoring;

    return pool.teamNames
      .map((team) => {
        const draftedPlayers = picks
          .filter((pick) => pick.team === team)
          .map((pick) => players.find((player) => player.id === pick.playerId))
          .filter(Boolean) as FootballPlayer[];

        const projected = draftedPlayers.reduce(
          (sum, player) => sum + getProjectedScore(player, scoring).total,
          0
        );
        const live = draftedPlayers.reduce(
          (sum, player) => sum + scoringTotal(player, scoring),
          0
        );

        return {
          team,
          players: draftedPlayers,
          projected,
          live,
        };
      })
      .sort((a, b) => b.live - a.live);
  }, [picks, players, pool]);

  const scoringColumns = useMemo(
    () => (pool ? buildTeamScoringColumns(pool.scoring ?? defaultScoring) : []),
    [pool]
  );
  const groups = useMemo(() => columnGroups(scoringColumns), [scoringColumns]);

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

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-black sm:text-5xl md:text-7xl">Leaderboard</h1>
            <p className="mt-4 break-words text-base font-bold text-slate-400 sm:text-xl">
              {pool.poolName} • {pool.season} • Replay live scoring
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/football/draft?id=${pool.id}`}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-6 py-4 text-center text-base font-black text-emerald-300 hover:bg-emerald-400/15 sm:px-8 sm:text-lg"
            >
              Draft Room
            </Link>
            <Link
              href="/football"
              className="rounded-2xl bg-emerald-400 px-6 py-4 text-center text-base font-black text-slate-950 hover:bg-emerald-300 sm:px-8 sm:text-lg"
            >
              Football Home
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-5 sm:mt-10 sm:space-y-6">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-8">
            <h2 className="text-2xl font-black uppercase tracking-wide text-slate-300">
              Leaderboard
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Totals use this pool&apos;s scoring settings against the newest
              available stat line.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {standings.map((team, index) => (
                <div
                  key={team.team}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#1F2937] p-4 sm:p-5"
                >
                  <div className="min-w-0 flex items-center gap-3 sm:gap-4">
                    <span className="shrink-0 text-xl font-black text-slate-400 sm:text-2xl">
                      {index + 1}
                    </span>
                    <span className="truncate text-xl font-black sm:text-2xl">{team.team}</span>
                  </div>
                  <span className="shrink-0 text-2xl font-black text-emerald-300 sm:text-3xl">
                    {team.live.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black">Team Player Scoring</h2>
              <p className="text-sm font-semibold text-slate-500">
                Columns match the roster and scoring categories selected for this pool.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {standings.map((team) => (
                <div
                  key={team.team}
                  className="min-w-0 rounded-2xl border border-slate-700/60 bg-[#1F2937] p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-black uppercase tracking-wide">{team.team}</h3>
                    <span className="text-2xl font-black text-emerald-300">
                      {team.live.toFixed(1)}
                    </span>
                  </div>

                  {team.players.length === 0 ? (
                    <p className="mt-5 text-slate-500">No players drafted yet.</p>
                  ) : (
                    <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#030712]">
                      <table className="w-full min-w-[1080px] table-fixed text-right text-sm font-black">
                        <thead className="text-xs uppercase tracking-wide text-slate-500">
                          <tr className="border-b border-white/10 bg-[#111827]">
                            <th rowSpan={2} className="w-[360px] px-4 py-3 text-left">
                              Offense
                            </th>
                            <th rowSpan={2} className="px-4 py-3 text-emerald-300">
                              Pts
                            </th>
                            {groups.map((group) => (
                              <th
                                key={group.group}
                                colSpan={group.span}
                                className="border-l border-white/10 px-4 py-3 text-center"
                              >
                                {group.group}
                              </th>
                            ))}
                          </tr>
                          <tr className="border-b border-white/10 bg-[#111827]">
                            {scoringColumns.map((column) => (
                              <th key={`${column.group}-${column.label}`} className="px-4 py-3">
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {team.players.map((player) => {
                            const stats = scoringStatLine(player);
                            const points = scoringTotal(player, pool.scoring ?? defaultScoring);

                            return (
                              <tr key={player.id} className="border-b border-white/5 last:border-b-0">
                                <td className="px-4 py-4 text-left">
                                  <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3">
                                    <span
                                      className={`rounded-xl border px-3 py-2 text-center text-sm font-black ${positionBadgeClasses[player.position]}`}
                                    >
                                      {player.position}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate whitespace-nowrap text-base font-black text-white">
                                        {formatCompactName(player.name)}
                                      </p>
                                      <p className="truncate whitespace-nowrap text-xs font-bold text-slate-500">
                                        {player.school} • {player.opponent}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-emerald-300">
                                  {points.toFixed(1)}
                                </td>
                                {scoringColumns.map((column) => (
                                  <td key={`${player.id}-${column.group}-${column.label}`} className="px-4 py-4 text-slate-300">
                                    {formatNumber(column.value(stats))}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
