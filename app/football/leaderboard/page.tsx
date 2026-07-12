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

type TeamRosterEntry = {
  player: FootballPlayer;
  slotLabel: FootballPlayer["position"] | "FLEX";
};

const positionBadgeClasses: Record<FootballPlayer["position"], string> = {
  QB: "bg-violet-400/20 border-violet-300/70 text-violet-100",
  RB: "bg-cyan-400/20 border-cyan-300/70 text-cyan-100",
  WR: "bg-amber-400/20 border-amber-300/70 text-amber-100",
  TE: "bg-lime-400/20 border-lime-300/70 text-lime-100",
  DST: "bg-rose-400/20 border-rose-300/70 text-rose-100",
  K: "bg-sky-300/20 border-sky-200/70 text-sky-100",
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

function projectedTotal(player: FootballPlayer, scoring: FootballScoring) {
  return getProjectedScore(player, scoring).total;
}

function formatNumber(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatCompactName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;

  const suffixMap: Record<string, string> = {
    jr: "Jr.",
    "jr.": "Jr.",
    sr: "Sr.",
    "sr.": "Sr.",
    ii: "II",
    iii: "III",
    iv: "IV",
    v: "V",
  };

  const first = parts[0]?.[0] ?? "";
  const lastPart = parts[parts.length - 1].replace(/,$/, "");
  const suffix = suffixMap[lastPart.toLowerCase()];
  const lastName = suffix ? parts[parts.length - 2] : parts[parts.length - 1];

  return `${first}. ${lastName}${suffix ? ` ${suffix}` : ""}`;
}

function assignRosterSlots(players: FootballPlayer[], scoring: FootballScoring): TeamRosterEntry[] {
  const remaining = [...players];
  const entries: TeamRosterEntry[] = [];

  const takeNext = (
    predicate: (player: FootballPlayer) => boolean,
    slotLabel: TeamRosterEntry["slotLabel"]
  ) => {
    const index = remaining.findIndex(predicate);
    if (index === -1) return;

    const [player] = remaining.splice(index, 1);
    entries.push({ player, slotLabel });
  };

  const takePosition = (position: FootballPlayer["position"], count: number) => {
    for (let index = 0; index < count; index += 1) {
      takeNext((player) => player.position === position, position);
    }
  };

  takePosition("QB", scoring.roster.QB);
  takePosition("RB", scoring.roster.RB);
  takePosition("WR", scoring.roster.WR);
  takePosition("TE", scoring.roster.TE);

  for (let index = 0; index < scoring.roster.FLEX; index += 1) {
    takeNext(
      (player) => player.position === "RB" || player.position === "WR" || player.position === "TE",
      "FLEX"
    );
  }

  takePosition("DST", scoring.roster.DST);
  takePosition("K", scoring.roster.K);

  return [
    ...entries,
    ...remaining.map((player) => ({
      player,
      slotLabel: player.position,
    })),
  ];
}

function buildOffenseColumns(scoring: FootballScoring): TeamScoringColumn[] {
  const columns: TeamScoringColumn[] = [];

  if (scoring.roster.QB > 0) {
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

  if (scoring.roster.QB > 0 || scoring.roster.RB > 0 || scoring.roster.FLEX > 0) {
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

  if (
    scoring.roster.RB > 0 ||
    scoring.roster.WR > 0 ||
    scoring.roster.TE > 0 ||
    scoring.roster.FLEX > 0
  ) {
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

  if (scoring.passing.twoPointConversion !== 0) {
    columns.push({ group: "Misc", label: "2PT", value: (stats) => stats.twoPointConversions });
  }
  if (scoring.passing.fumbleLost !== 0) {
    columns.push({ group: "Misc", label: "Lost", value: (stats) => stats.fumblesLost });
  }

  return columns;
}

function buildKickingColumns(scoring: FootballScoring): TeamScoringColumn[] {
  const columns: TeamScoringColumn[] = [];

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

  return columns;
}

function buildDefenseColumns(scoring: FootballScoring): TeamScoringColumn[] {
  const columns: TeamScoringColumn[] = [];

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
    columns.push({ group: "Defense", label: "Safety", value: (stats) => stats.safeties });
  }
  if (scoring.defense.blockedKick !== 0) {
    columns.push({ group: "Defense", label: "Blk Kick", value: (stats) => stats.blockedKicks });
  }
  if (scoring.defense.returnTouchdown !== 0) {
    columns.push({ group: "Defense", label: "Ret TD", value: (stats) => stats.returnTds });
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

function isGroupStart(columns: TeamScoringColumn[], index: number) {
  return index === 0 || columns[index - 1].group !== columns[index].group;
}

function PositionBadge({ entry }: { entry: TeamRosterEntry }) {
  const { player, slotLabel } = entry;

  return (
    <span
      className={`rounded-xl border px-3 py-2 text-center text-sm font-black ${positionBadgeClasses[player.position]}`}
    >
      {slotLabel}
    </span>
  );
}

function TeamStatTable({
  entries,
  columns,
  groups,
  scoring,
  title,
}: {
  entries: TeamRosterEntry[];
  columns: TeamScoringColumn[];
  groups?: { group: string; span: number }[];
  scoring: FootballScoring;
  title: string;
}) {
  if (entries.length === 0 || columns.length === 0) return null;

  return (
    <div className="mt-5">
      <h4 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
        {title}
      </h4>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#030712]">
        <table className="w-full min-w-[760px] table-fixed text-right text-sm font-black">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            {groups && groups.length > 0 && (
              <tr className="border-b border-white/10 bg-[#111827]">
                <th rowSpan={2} className="w-[300px] px-4 py-3 text-left">
                  Player
                </th>
                <th rowSpan={2} className="w-[76px] px-4 py-3 text-center align-middle text-emerald-300">
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
            )}
            <tr className="border-b border-white/10 bg-[#111827]">
              {!groups && (
                <>
                  <th className="w-[300px] px-4 py-3 text-left">Player</th>
                  <th className="w-[76px] px-4 py-3 text-center text-emerald-300">
                    Pts
                  </th>
                </>
              )}
              {columns.map((column, index) => (
                <th
                  key={`${title}-${column.group}-${column.label}`}
                  className={`px-3 py-3 text-center ${
                    groups && isGroupStart(columns, index) ? "border-l border-white/10" : ""
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const { player } = entry;
              const stats = scoringStatLine(player);
              const points = scoringTotal(player, scoring);

              return (
                <tr key={player.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-4 py-4 text-left">
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
                      <PositionBadge entry={entry} />
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
                  <td className="px-4 py-4 text-center align-middle text-emerald-300">
                    {points.toFixed(1)}
                  </td>
                  {columns.map((column, index) => (
                    <td
                      key={`${player.id}-${title}-${column.group}-${column.label}`}
                      className={`px-3 py-4 text-center align-middle text-slate-300 ${
                        groups && isGroupStart(columns, index) ? "border-l border-white/10" : ""
                      }`}
                    >
                      {formatNumber(column.value(stats))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const formatPlayerName = (name: string) => {
  const clean = name.replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length <= 1) return clean;

  const suffixMap: Record<string, string> = {
    jr: "Jr.",
    "jr.": "Jr.",
    sr: "Sr.",
    "sr.": "Sr.",
    ii: "II",
    iii: "III",
    iv: "IV",
    v: "V",
  };

  const lastPart = parts[parts.length - 1].replace(/,$/, "");
  const suffix = suffixMap[lastPart.toLowerCase()];
  const lastName = suffix ? parts[parts.length - 2] : parts[parts.length - 1];
  const firstName = parts[0];

  return `${firstName.charAt(0)}. ${lastName}${suffix ? ` ${suffix}` : ""}`;
};

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
    const hasLiveScores = picks.some((pick) => {
      const player = players.find((item) => item.id === pick.playerId);
      return player ? hasStatLine(player.liveStats) : false;
    });

    return pool.teamNames
      .map((team) => {
        const draftedPlayers = picks
          .filter((pick) => pick.team === team)
          .map((pick) => players.find((player) => player.id === pick.playerId))
          .filter(Boolean) as FootballPlayer[];

        const projected = draftedPlayers.reduce(
          (sum, player) => sum + projectedTotal(player, scoring),
          0
        );
        const live = draftedPlayers.reduce(
          (sum, player) => sum + scoringTotal(player, scoring),
          0
        );

        return {
          team,
          players: assignRosterSlots(draftedPlayers, scoring),
          projected,
          live,
          displayScore: hasLiveScores ? live : projected,
        };
      })
      .sort((a, b) => b.displayScore - a.displayScore);
  }, [picks, players, pool]);

  const hasLiveScores = useMemo(
    () =>
      picks.some((pick) => {
        const player = players.find((item) => item.id === pick.playerId);
        return player ? hasStatLine(player.liveStats) : false;
      }),
    [picks, players]
  );
  const scoringModeLabel = hasLiveScores ? "Live" : "Projected";
  const offenseColumns = useMemo(
    () => (pool ? buildOffenseColumns(pool.scoring ?? defaultScoring) : []),
    [pool]
  );
  const offenseGroups = useMemo(() => columnGroups(offenseColumns), [offenseColumns]);
  const kickingColumns = useMemo(
    () => (pool ? buildKickingColumns(pool.scoring ?? defaultScoring) : []),
    [pool]
  );
  const defenseColumns = useMemo(
    () => (pool ? buildDefenseColumns(pool.scoring ?? defaultScoring) : []),
    [pool]
  );

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
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-7">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-8 flex flex-col gap-4 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-black sm:text-5xl md:text-7xl">Leaderboard</h1>
            <p className="mt-4 break-words text-base font-bold text-slate-400 sm:text-xl">
              {pool.poolName} • {pool.season} • Replay live scoring
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
          </div>
        </div>

        <div className="mt-8 space-y-5 sm:mt-10 sm:space-y-6">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
            <h2 className="text-2xl font-black uppercase tracking-wide text-slate-300">
              Leaderboard
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {`${scoringModeLabel} totals use this pool's scoring settings against the newest available stat line.`}
            </p>
            <div className="mt-6 max-w-3xl space-y-3">
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
                    {team.displayScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
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
                      {team.displayScore.toFixed(1)}
                    </span>
                  </div>

                  {team.players.length === 0 ? (
                    <p className="mt-5 text-slate-500">No players drafted yet.</p>
                  ) : (
                    <>
                      <TeamStatTable
                        title="Position Players"
                        entries={team.players.filter(
                          (entry) => entry.player.position !== "K" && entry.player.position !== "DST"
                        )}
                        columns={offenseColumns}
                        groups={offenseGroups}
                        scoring={pool.scoring ?? defaultScoring}
                      />
                      <TeamStatTable
                        title="Defense / Special Teams"
                        entries={team.players.filter((entry) => entry.player.position === "DST")}
                        columns={defenseColumns}
                        scoring={pool.scoring ?? defaultScoring}
                      />
                      <TeamStatTable
                        title="Kickers"
                        entries={team.players.filter((entry) => entry.player.position === "K")}
                        columns={kickingColumns}
                        scoring={pool.scoring ?? defaultScoring}
                      />
                    </>
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
