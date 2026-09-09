"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import { getCurrentOrganizerUser } from "../../lib/poolApi";
import {
  FootballDraftPick,
  FootballPlayer,
  FootballPool,
  FootballScoring,
  defaultScoring,
  footballPlayers,
  loadFootballDraftPicks,
  loadFootballPool,
  saveFootballDraftPicks,
  saveFootballPool,
} from "../lib/storage";
import { loadPersistedFootballHistory } from "../lib/platformStorage";
import {
  getPlayerPpg,
  getProjectedScore,
  scoreFootballStats,
} from "../lib/scoringEngine";
import type { FootballStatLine } from "../lib/scoringEngine";

type TeamScoringColumn = {
  group: string;
  label: string;
  value: (stats: FootballStatLine) => number | undefined;
};

type PlayerDetailColumn = Omit<TeamScoringColumn, "group">;

type TeamRosterEntry = {
  player: FootballPlayer;
  slotLabel: FootballPlayer["position"] | "FLEX";
};

type FootballRecapAward = {
  title: string;
  headline: string;
  detail: string;
};

type DraftedFootballPlayer = {
  player: FootballPlayer;
  team: string;
  pickNumber: number;
  points: number;
  projected: number;
};

const RECAP_FEATURE_ENABLED = false;

const positionBadgeClasses: Record<FootballPlayer["position"], string> = {
  QB: "bg-purple-500/45 border-purple-200 text-purple-50 shadow-purple-500/20",
  RB: "bg-sky-500/45 border-sky-200 text-sky-50 shadow-sky-500/20",
  WR: "bg-yellow-500/45 border-yellow-200 text-yellow-50 shadow-yellow-500/20",
  TE: "bg-red-500/45 border-red-200 text-red-50 shadow-red-500/20",
  DST: "bg-green-500/45 border-green-200 text-green-50 shadow-green-500/20",
  K: "bg-slate-400/45 border-slate-100 text-white shadow-slate-400/20",
};

function scoringStatLine(player: FootballPlayer) {
  return player.liveStats || {};
}

function scoringTotal(player: FootballPlayer, scoring: FootballScoring) {
  return scoreFootballStats(scoringStatLine(player), scoring).total;
}

function projectedTotal(player: FootballPlayer, scoring: FootballScoring) {
  return getProjectedScore(player, scoring).total;
}

function gameLogColumnsForPosition(
  position: FootballPlayer["position"],
  scoring: FootballScoring
) {
  if (position === "QB") {
    return [
      { label: "Cmp", value: (stats: FootballStatLine) => stats.completions },
      { label: "Pass Att", value: (stats: FootballStatLine) => stats.passingAttempts },
      { label: "Pass Yd", value: (stats: FootballStatLine) => stats.passingYards },
      { label: "Pass TD", value: (stats: FootballStatLine) => stats.passingTds },
      { label: "INT", value: (stats: FootballStatLine) => stats.interceptionsThrown },
      { label: "Rush Att", value: (stats: FootballStatLine) => stats.rushingAttempts },
      { label: "Rush Yd", value: (stats: FootballStatLine) => stats.rushingYards },
      { label: "Rush TD", value: (stats: FootballStatLine) => stats.rushingTds },
      scoring.passing.twoPointConversion !== 0 && {
        label: "2PT",
        value: (stats: FootballStatLine) => stats.twoPointConversions,
      },
    ].filter(Boolean) as PlayerDetailColumn[];
  }

  if (position === "RB") {
    return [
      { label: "Rush Att", value: (stats: FootballStatLine) => stats.rushingAttempts },
      { label: "Rush Yd", value: (stats: FootballStatLine) => stats.rushingYards },
      { label: "Rush TD", value: (stats: FootballStatLine) => stats.rushingTds },
      { label: "Rec", value: (stats: FootballStatLine) => stats.receptions },
      { label: "Rec Yd", value: (stats: FootballStatLine) => stats.receivingYards },
      { label: "Rec TD", value: (stats: FootballStatLine) => stats.receivingTds },
      scoring.rushing.twoPointConversion !== 0 && {
        label: "2PT",
        value: (stats: FootballStatLine) => stats.twoPointConversions,
      },
    ].filter(Boolean) as PlayerDetailColumn[];
  }

  if (position === "WR" || position === "TE") {
    return [
      { label: "Rec", value: (stats: FootballStatLine) => stats.receptions },
      { label: "Rec Yd", value: (stats: FootballStatLine) => stats.receivingYards },
      { label: "Rec TD", value: (stats: FootballStatLine) => stats.receivingTds },
      scoring.receiving.twoPointConversion !== 0 && {
        label: "2PT",
        value: (stats: FootballStatLine) => stats.twoPointConversions,
      },
    ].filter(Boolean) as PlayerDetailColumn[];
  }

  if (position === "DST") {
    return [
      scoring.defense.sack !== 0 && {
        label: "Sacks",
        value: (stats: FootballStatLine) => stats.sacks,
      },
      scoring.defense.interception !== 0 && {
        label: "INT",
        value: (stats: FootballStatLine) => stats.defenseInterceptions,
      },
      scoring.defense.fumbleRecovery !== 0 && {
        label: "Fum Rec",
        value: (stats: FootballStatLine) => stats.fumbleRecoveries,
      },
      scoring.defense.touchdown !== 0 && {
        label: "TD",
        value: (stats: FootballStatLine) => stats.defenseTds,
      },
      scoring.defense.safety !== 0 && {
        label: "Safety",
        value: (stats: FootballStatLine) => stats.safeties,
      },
      scoring.defense.blockedKick !== 0 && {
        label: "Blk Kick",
        value: (stats: FootballStatLine) => stats.blockedKicks,
      },
      scoring.defense.returnTouchdown !== 0 && {
        label: "Ret TD",
        value: (stats: FootballStatLine) => stats.returnTds,
      },
    ].filter(Boolean) as PlayerDetailColumn[];
  }

  return [
    scoring.kicking.extraPoint !== 0 && {
      label: "XP Made",
      value: (stats: FootballStatLine) => stats.extraPointsMade,
    },
    scoring.kicking.missedExtraPoint !== 0 && {
      label: "XP Miss",
      value: (stats: FootballStatLine) => stats.extraPointsMissed,
    },
    scoring.kicking.fieldGoal !== 0 && {
      label: "FG Made",
      value: (stats: FootballStatLine) => stats.fieldGoalsMade,
    },
    scoring.kicking.missedFieldGoal !== 0 && {
      label: "FG Miss",
      value: (stats: FootballStatLine) => stats.fieldGoalsMissed,
    },
    scoring.kicking.fieldGoal50Bonus !== 0 && {
      label: "50+ FG",
      value: (stats: FootballStatLine) => stats.fieldGoals50Plus,
    },
  ].filter(Boolean) as PlayerDetailColumn[];
}

function playerGameRows(player: FootballPlayer, scoring: FootballScoring) {
  if (player.gameLogs && player.gameLogs.length > 0) {
    return player.gameLogs.map((log) => ({
      label: log.week,
      opponent: log.opponent,
      statLine: log.statLine,
      points: scoreFootballStats(log.statLine, scoring).total,
    }));
  }

  return [
    {
      label: "Avg",
      opponent: "Season avg",
      statLine: player.averageStats,
      points: getPlayerPpg(player, scoring),
    },
  ];
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
      className={`inline-flex min-w-10 items-center justify-center rounded-lg border px-2 py-1 text-center text-[11px] font-black sm:min-w-14 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm ${positionBadgeClasses[player.position]}`}
    >
      {slotLabel}
    </span>
  );
}

type ScoringSummaryRule = {
  label: string;
  value: string;
};

type ScoringSummarySection = {
  title: string;
  rules: ScoringSummaryRule[];
};

function formatScoringNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatPointsPer(value: number, event: string) {
  const pointLabel = Math.abs(value) === 1 ? "pt" : "pts";
  return `${formatScoringNumber(value)} ${pointLabel} / ${event}`;
}

function buildScoringSummary(scoring: FootballScoring) {
  const pointRule = (
    label: string,
    value: number,
    event: string
  ): ScoringSummaryRule | null =>
    value === 0 ? null : { label, value: formatPointsPer(value, event) };
  const yardRule = (
    label: string,
    yardsPerPoint: number
  ): ScoringSummaryRule | null =>
    yardsPerPoint <= 0
      ? null
      : {
          label,
          value: `1 pt / ${formatScoringNumber(yardsPerPoint)} yds`,
        };
  const rules = (...items: Array<ScoringSummaryRule | null>) =>
    items.filter((item): item is ScoringSummaryRule => item !== null);

  const sections: ScoringSummarySection[] = [
    {
      title: "Passing",
      rules: rules(
        yardRule("Pass Yards", scoring.passing.passingYardsPerPoint),
        pointRule("Passing TD", scoring.passing.passingTd, "TD"),
        pointRule("Completion", scoring.passing.completion, "completion"),
        pointRule("Interception Thrown", scoring.passing.interception, "INT")
      ),
    },
    {
      title: "Rushing",
      rules: rules(
        yardRule("Rush Yards", scoring.rushing.rushingYardsPerPoint),
        pointRule("Rushing TD", scoring.rushing.rushingTd, "TD"),
        pointRule("Rush Attempt", scoring.rushing.attempt, "attempt")
      ),
    },
    {
      title: "Receiving",
      rules: rules(
        yardRule("Receiving Yards", scoring.receiving.receivingYardsPerPoint),
        pointRule("Receiving TD", scoring.receiving.receivingTd, "TD"),
        pointRule("Reception", scoring.receiving.reception, "reception")
      ),
    },
    ...(scoring.roster.DST > 0
      ? [
          {
            title: "Defense / Special Teams",
            rules: rules(
              pointRule("Sack", scoring.defense.sack, "sack"),
              pointRule("Interception", scoring.defense.interception, "INT"),
              pointRule("Fumble Recovery", scoring.defense.fumbleRecovery, "recovery"),
              pointRule("Touchdown", scoring.defense.touchdown, "TD"),
              pointRule("Safety", scoring.defense.safety, "safety"),
              pointRule("Blocked Kick", scoring.defense.blockedKick, "block"),
              pointRule("Kick/Punt Return TD", scoring.defense.returnTouchdown, "TD")
            ),
          },
        ]
      : []),
    ...(scoring.roster.K > 0
      ? [
          {
            title: "Kicking",
            rules: rules(
              pointRule("Made Extra Point", scoring.kicking.extraPoint, "XP"),
              pointRule("Missed Extra Point", scoring.kicking.missedExtraPoint, "miss"),
              pointRule("Field Goal", scoring.kicking.fieldGoal, "FG"),
              pointRule("Missed Field Goal", scoring.kicking.missedFieldGoal, "miss"),
              pointRule("50+ Yard FG Bonus", scoring.kicking.fieldGoal50Bonus, "FG")
            ),
          },
        ]
      : []),
    {
      title: "More",
      rules: rules(
        pointRule(
          "2-Point Conversion",
          scoring.passing.twoPointConversion,
          "conversion"
        ),
        pointRule("Fumble Lost", scoring.passing.fumbleLost, "fumble")
      ),
    },
  ];

  return sections.filter((section) => section.rules.length > 0);
}

function ScoringSettingsModal({
  poolName,
  scoring,
  onClose,
}: {
  poolName: string;
  scoring: FootballScoring;
  onClose: () => void;
}) {
  const sections = buildScoringSummary(scoring);
  const rosterLabels: Record<keyof FootballScoring["roster"], string> = {
    QB: "QB",
    RB: "RB",
    WR: "WR",
    TE: "TE",
    FLEX: "Flex",
    DST: "D/ST",
    K: "K",
  };
  const roster = (Object.entries(scoring.roster) as Array<
    [keyof FootballScoring["roster"], number]
  >).filter(([, count]) => count > 0);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scoring settings"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#030712]/80 px-2 pb-3 backdrop-blur-sm md:items-center md:p-6"
    >
      <div className="flex min-w-0 max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60">
        <div className="min-w-0 shrink-0 border-b border-white/10 bg-[#1F2937] p-4 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            {poolName}
          </p>
          <h2 className="mt-2 break-words text-2xl font-black text-white sm:text-4xl">
            Scoring Settings
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            The points and roster rules used by this pool.
          </p>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-7">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-[#030712] p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Active Roster
              </p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                {roster.map(([position, count]) => (
                  <span
                    key={position}
                    className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm font-black text-emerald-200"
                  >
                    {count} {rosterLabels[position]}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#030712] p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Point Precision
                </p>
                <p className="mt-2 text-base font-black text-white">
                  Fractional Scoring
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-black ${
                  scoring.fractionalPoints
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {scoring.fractionalPoints ? "On" : "Off"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <section
                key={section.title}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712]"
              >
                <h3 className="border-b border-white/10 bg-[#1F2937] px-4 py-3 text-sm font-black uppercase tracking-wide text-white">
                  {section.title}
                </h3>
                <div className="divide-y divide-white/5">
                  {section.rules.map((rule) => (
                    <div
                      key={rule.label}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="font-bold text-slate-400">{rule.label}</span>
                      <span className="shrink-0 text-right font-black text-emerald-300">
                        {rule.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
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

function LeaderboardPlayerDetailsModal({
  player,
  scoring,
  onClose,
}: {
  player: FootballPlayer;
  scoring: FootballScoring;
  onClose: () => void;
}) {
  const ppg = getPlayerPpg(player, scoring);
  const rows = playerGameRows(player, scoring);
  const hasGameLogs = Boolean(player.gameLogs?.length);
  const columns = gameLogColumnsForPosition(player.position, scoring);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} details`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#030712]/80 px-2 pb-3 backdrop-blur-sm md:items-center md:p-6"
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60">
        <div className="shrink-0 border-b border-white/10 bg-[#1F2937] p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${positionBadgeClasses[player.position]}`}
                >
                  {player.position}
                </span>
                <span className="text-sm font-black uppercase tracking-wide text-slate-400">
                  {player.school}
                </span>
              </div>
              <h2 className="mt-3 break-words text-3xl font-black text-white sm:text-4xl">
                {player.name}
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-400 sm:text-base">
                {player.conference} • {player.gameTime} {player.opponent}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-[#030712] px-4 py-3 text-center sm:min-w-28 sm:p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">PPG</p>
              <p className="mt-1 text-2xl font-black text-emerald-300">
                {formatNumber(ppg)}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
          <h3 className="text-xl font-black">Game Log</h3>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            Fantasy points reflect your pool&apos;s scoring rules.
          </p>
          {!hasGameLogs ? (
            <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
              No completed game log is available yet. PPG will populate as game data becomes available.
            </p>
          ) : null}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#030712]">
            <table className="w-full min-w-[760px] text-right text-sm font-black text-slate-200">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-left">Opp</th>
                  <th className="px-4 py-3 text-emerald-300">Pts</th>
                  {columns.map((column) => (
                    <th key={column.label} className="px-4 py-3">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.label}-${row.opponent}`}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td className="px-4 py-4 text-left text-slate-400">{row.label}</td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-left">
                      {row.opponent}
                    </td>
                    <td className="px-4 py-4 text-emerald-300">
                      {formatNumber(row.points)}
                    </td>
                    {columns.map((column) => (
                      <td key={column.label} className="px-4 py-4">
                        {formatNumber(column.value(row.statLine))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function TeamStatTable({
  entries,
  columns,
  groups,
  scoring,
  title,
  onSelectPlayer,
}: {
  entries: TeamRosterEntry[];
  columns: TeamScoringColumn[];
  groups?: { group: string; span: number }[];
  scoring: FootballScoring;
  title?: string;
  onSelectPlayer: (player: FootballPlayer) => void;
}) {
  if (entries.length === 0 || columns.length === 0) return null;

  return (
    <div className="mt-5">
      {title && (
        <h4 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
          {title}
        </h4>
      )}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#030712]">
        <table className="w-full min-w-[560px] table-fixed text-right text-xs font-black sm:min-w-[760px] sm:text-sm">
          <thead className="text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
            {groups && groups.length > 0 && (
              <tr className="border-b border-white/10 bg-[#111827]">
                <th rowSpan={2} className="w-[230px] px-1.5 py-2 text-left sm:w-[300px] sm:px-4 sm:py-3">
                  Player
                </th>
                <th rowSpan={2} className="w-[50px] px-2 py-2 text-center align-middle text-emerald-300 sm:w-[76px] sm:px-4 sm:py-3">
                  Pts
                </th>
                {groups.map((group) => (
                  <th
                    key={group.group}
                    colSpan={group.span}
                    className="border-l border-white/10 px-2 py-2 text-center sm:px-4 sm:py-3"
                  >
                    {group.group}
                  </th>
                ))}
              </tr>
            )}
            <tr className="border-b border-white/10 bg-[#111827]">
              {!groups && (
                <>
                  <th className="w-[230px] px-1.5 py-2 text-left sm:w-[300px] sm:px-4 sm:py-3">Player</th>
                  <th className="w-[50px] px-2 py-2 text-center text-emerald-300 sm:w-[76px] sm:px-4 sm:py-3">
                    Pts
                  </th>
                </>
              )}
              {columns.map((column, index) => (
                <th
                  key={`${title}-${column.group}-${column.label}`}
                  className={`px-1.5 py-2 text-center sm:px-3 sm:py-3 ${
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
                  <td className="px-1.5 py-3 text-left sm:px-4 sm:py-4">
                    <button
                      type="button"
                      onClick={() => onSelectPlayer(player)}
                      aria-label={`View ${player.name} stats`}
                      className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-lg text-left outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-emerald-300/70 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-3"
                    >
                      <PositionBadge entry={entry} />
                      <div className="min-w-0">
                        <p className="truncate whitespace-nowrap text-sm font-black text-white sm:text-base">
                          {formatCompactName(player.name)}
                        </p>
                        <p className="whitespace-normal text-[10px] font-bold leading-4 text-slate-500 sm:text-xs">
                          {player.schoolAbbreviation || player.school} • {player.gameTime}{" "}
                          {player.opponent}
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="px-2 py-3 text-center align-middle text-emerald-300 sm:px-4 sm:py-4">
                    {points.toFixed(1)}
                  </td>
                  {columns.map((column, index) => (
                    <td
                      key={`${player.id}-${title}-${column.group}-${column.label}`}
                      className={`px-1.5 py-3 text-center align-middle text-slate-300 sm:px-3 sm:py-4 ${
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

function RecapAwardCard({ award }: { award: FootballRecapAward }) {
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

function FootballRecapModal({
  awards,
  undraftedPlayers,
  poolName,
  onClose,
}: {
  awards: FootballRecapAward[];
  undraftedPlayers: DraftedFootballPlayer[];
  poolName: string;
  onClose: () => void;
}) {
  const undraftedTotal = undraftedPlayers.reduce(
    (sum, entry) => sum + entry.points,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-6 backdrop-blur-sm sm:px-6">
      <section className="relative w-full max-w-5xl rounded-3xl border border-emerald-400/20 bg-[#111827] p-4 shadow-2xl shadow-black sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pool recap"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#030712] text-2xl font-black text-slate-300 transition hover:border-emerald-300/50 hover:text-white"
        >
          X
        </button>

        <div className="pr-12">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
            Pool Recap
          </p>
          <h2 className="mt-2 text-3xl font-black text-white sm:text-5xl">
            {poolName} Awards
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-slate-400 sm:text-base">
            The draft is settled. Here is who carried the roster, who torched
            the projection sheet, and who somehow remained available while
            everyone confidently clicked other names.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {awards.map((award) => (
            <RecapAwardCard key={award.title} award={award} />
          ))}
        </div>

        {undraftedPlayers.length > 0 && (
          <div className="mt-5 rounded-2xl border border-white/5 bg-[#030712] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Best Undrafted Team
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {undraftedTotal.toFixed(1)} points left undrafted
                </h3>
              </div>
              <p className="max-w-xl text-sm font-bold leading-6 text-slate-400">
                The best available roster nobody took. Useful for scouting, and
                slightly uncomfortable for whoever needed depth.
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {undraftedPlayers.map((entry) => (
                <div
                  key={entry.player.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#1F2937] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {formatPlayerName(entry.player.name)}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {entry.player.position} • {entry.player.school}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-emerald-300">
                    {entry.points.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function FootballLeaderboardPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [players, setPlayers] = useState<FootballPlayer[]>(footballPlayers);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isLoadingSharedPicks, setIsLoadingSharedPicks] = useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [recapDismissed, setRecapDismissed] = useState(false);
  const [recapManuallyOpened, setRecapManuallyOpened] = useState(false);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<FootballPlayer | null>(null);
  const [showScoringSettings, setShowScoringSettings] = useState(false);

  useEffect(() => {
    getCurrentOrganizerUser().then((user) => setOrganizerId(user?.id || null));
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      setIsLoadingPool(false);
      setIsLoadingSharedPicks(false);
      return;
    }
    const poolId = id;

    const savedPool = loadFootballPool(poolId);
    if (savedPool) {
      setPool(savedPool);
      setPicks(loadFootballDraftPicks(savedPool.id));
      setRecapDismissed(
        window.localStorage.getItem(`dWf:footballRecapDismissed:${savedPool.id}`) ===
          "true"
      );
      setIsLoadingPool(false);
    }

    let cancelled = false;

    async function syncSharedHistory() {
      try {
        const history = await loadPersistedFootballHistory(poolId);
        if (cancelled || !history) return;

        saveFootballPool(history.pool);
        saveFootballDraftPicks(history.pool.id, history.picks);
        setPool(history.pool);
        setPicks(history.picks);
        setRecapDismissed(
          window.localStorage.getItem(
            `dWf:footballRecapDismissed:${history.pool.id}`
          ) === "true"
        );
      } catch {
        // Keep the last shared snapshot visible during a temporary connection issue.
      }
    }

    syncSharedHistory().finally(() => {
        if (!cancelled) {
          setIsLoadingPool(false);
          setIsLoadingSharedPicks(false);
        }
      });
    const syncInterval = window.setInterval(() => {
      void syncSharedHistory();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(syncInterval);
    };
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
      } finally {
        if (!cancelled) setIsLoadingPlayers(false);
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
          .map(
            (pick) =>
              players.find((player) => player.id === pick.playerId) || pick.playerSnapshot
          )
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
          draftedPickCount: picks.filter((pick) => pick.team === team).length,
          projected,
          live,
          displayScore: live,
        };
      })
      .sort((a, b) => b.displayScore - a.displayScore);
  }, [picks, players, pool]);

  const recap = useMemo(() => {
    if (!pool) {
      return {
        awards: [] as FootballRecapAward[],
        undraftedPlayers: [] as DraftedFootballPlayer[],
      };
    }

    const scoring = pool.scoring ?? defaultScoring;
    const draftedIds = new Set(picks.map((pick) => pick.playerId));
    const draftedPlayers: DraftedFootballPlayer[] = picks
      .map((pick) => {
        const player =
          players.find((item) => item.id === pick.playerId) || pick.playerSnapshot;
        if (!player) return null;

        const points = scoringTotal(player, scoring);

        return {
          player,
          team: pick.team,
          pickNumber: pick.pickNumber,
          points,
          projected: projectedTotal(player, scoring),
        };
      })
      .filter((entry): entry is DraftedFootballPlayer => entry !== null);
    const totalRosterSpots = Object.values(scoring.roster).reduce(
      (sum, count) => sum + count,
      0
    );
    const totalPicks = pool.numberOfTeams * totalRosterSpots;
    const draftComplete = totalPicks > 0 && picks.length >= totalPicks;

    if (!draftComplete || draftedPlayers.length === 0 || standings.length === 0) {
      return { awards: [], undraftedPlayers: [] };
    }

    const mvp = [...draftedPlayers].sort((a, b) => b.points - a.points)[0];
    const lvp = [...draftedPlayers].sort((a, b) => {
      const aDelta = a.points - a.projected;
      const bDelta = b.points - b.projected;
      if (aDelta !== bDelta) return aDelta - bDelta;
      return a.pickNumber - b.pickNumber;
    })[0];
    const value =
      [...draftedPlayers]
        .filter((entry) => entry.pickNumber > Math.floor(totalPicks / 3))
        .sort((a, b) => {
          const aDelta = a.points - a.projected;
          const bDelta = b.points - b.projected;
          if (aDelta !== bDelta) return bDelta - aDelta;
          return b.points - a.points;
        })[0] ||
      [...draftedPlayers].sort((a, b) => b.points - b.projected - (a.points - a.projected))[0];
    const undraftedPlayers = players
      .filter((player) => !draftedIds.has(player.id))
      .map((player) => ({
        player,
        team: "Undrafted",
        pickNumber: 0,
        points: scoringTotal(player, scoring),
        projected: projectedTotal(player, scoring),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, Math.max(5, totalRosterSpots));
    const awards: FootballRecapAward[] = [
      standings[0]
        ? {
            title: "Champion",
            headline: standings[0].team,
            detail: `Won the pool with ${standings[0].displayScore.toFixed(
              1
            )} points. The math says champion; the group chat will decide whether it was genius or theft.`,
          }
        : null,
      mvp
        ? {
            title: "MVP",
            headline: mvp.player.name,
            detail: `${mvp.team} got ${mvp.points.toFixed(1)} points from the ${getOrdinal(
              mvp.pickNumber
            )} pick. That is the sort of selection people start calling obvious after it already worked.`,
          }
        : null,
      lvp
        ? {
            title: "LVP",
            headline: lvp.player.name,
            detail: `${lvp.team}'s ${getOrdinal(lvp.pickNumber)} pick finished ${
              (lvp.points - lvp.projected).toFixed(1)
            } versus projection. Not fatal, necessarily. Just the kind of pick that makes the recap writers circle back.`,
          }
        : null,
      value
        ? {
            title: "Best Mid-Round Value",
            headline: value.player.name,
            detail: `${value.team} found ${(value.points - value.projected).toFixed(
              1
            )} extra points with the ${getOrdinal(
              value.pickNumber
            )} pick. Mid-round value is how tidy drafts become annoying drafts.`,
          }
        : null,
    ].filter((award): award is FootballRecapAward => award !== null);

    return { awards, undraftedPlayers };
  }, [picks, players, pool, standings]);

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
  const shouldShowRecap =
    RECAP_FEATURE_ENABLED &&
    recap.awards.length > 0 &&
    (!recapDismissed || recapManuallyOpened);

  function closeRecap() {
    if (!pool) return;
    setRecapDismissed(true);
    setRecapManuallyOpened(false);
    window.localStorage.setItem(`dWf:footballRecapDismissed:${pool.id}`, "true");
  }

  if (isLoadingPool) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <BrandMark size="md" />
          <p className="mt-8 text-slate-400">Loading live leaderboard...</p>
        </div>
      </main>
    );
  }

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
      {shouldShowRecap && (
        <FootballRecapModal
          awards={recap.awards}
          undraftedPlayers={recap.undraftedPlayers}
          poolName={pool.poolName}
          onClose={closeRecap}
        />
      )}
      {selectedPlayer ? (
        <LeaderboardPlayerDetailsModal
          player={selectedPlayer}
          scoring={pool.scoring ?? defaultScoring}
          onClose={() => setSelectedPlayer(null)}
        />
      ) : null}
      {showScoringSettings ? (
        <ScoringSettingsModal
          poolName={pool.poolName}
          scoring={pool.scoring ?? defaultScoring}
          onClose={() => setShowScoringSettings(false)}
        />
      ) : null}

      <div className="mx-auto w-full max-w-7xl px-2 py-6 sm:px-6 sm:py-7">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-8 flex flex-col gap-4 md:mt-10 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-4xl font-black sm:text-5xl md:text-7xl">Leaderboard</h1>
            <p className="mt-4 break-words text-base font-bold text-white sm:text-xl">
              <span className="text-emerald-300">{pool.poolName}</span>
              {" • "}
              {pool.season}
              {" • Live Scoring"}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowScoringSettings(true)}
              className="rounded-2xl border border-white/15 bg-[#111827] px-6 py-3 text-center text-base font-black text-slate-200 transition hover:border-emerald-400/40 hover:bg-[#1F2937]"
            >
              Scoring Settings
            </button>

            {organizerId === pool.ownerId && pool.ownerId && <Link
              href={`/football/pool?id=${pool.id}`}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-6 py-3 text-center text-base font-black text-emerald-300 transition hover:bg-emerald-400/15"
            >
              {pool.poolName} Lobby
            </Link>}

            {RECAP_FEATURE_ENABLED && recap.awards.length > 0 && (
              <button
                type="button"
                onClick={() => setRecapManuallyOpened(true)}
                className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-6 py-3 text-center text-base font-black text-emerald-300 transition hover:bg-emerald-400/15"
              >
                View Recap
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-[320px_1fr]">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-3 shadow-xl shadow-black/40 sm:p-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto lg:self-start">
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-400">
              Leaderboard
            </h2>
            <div className="mt-5 space-y-1">
              {standings.map((team, index) => (
                <div
                  key={team.team}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#1F2937] px-3 py-3"
                >
                  <div className="min-w-0 flex items-center gap-3 sm:gap-4">
                    <span className="shrink-0 text-lg font-black text-slate-400">
                      {index + 1}
                    </span>
                    <span className="truncate text-lg font-black sm:text-xl">{team.team}</span>
                  </div>
                  <span className="shrink-0 text-lg font-black text-emerald-300 sm:text-xl">
                    {team.displayScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 space-y-5 sm:space-y-6">
            {standings.map((team) => (
              <div
                key={team.team}
                className="min-w-0 rounded-2xl border border-slate-700/60 bg-[#1F2937] p-2.5 shadow-xl shadow-black/40 sm:p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-2xl font-black uppercase tracking-wide">{team.team}</h3>
                  <span className="text-2xl font-black text-emerald-300">
                    {team.displayScore.toFixed(1)}
                  </span>
                </div>

                {isLoadingSharedPicks || isLoadingPlayers ? (
                  <p className="mt-5 text-slate-500">Loading live leaderboard...</p>
                ) : team.players.length === 0 && team.draftedPickCount > 0 ? (
                  <p className="mt-5 text-slate-500">
                    Live player data is temporarily unavailable.
                  </p>
                ) : team.players.length === 0 ? (
                  <p className="mt-5 text-slate-500">No players drafted yet.</p>
                ) : (
                  <>
                    <TeamStatTable
                      entries={team.players.filter(
                        (entry) => entry.player.position !== "K" && entry.player.position !== "DST"
                      )}
                      columns={offenseColumns}
                      groups={offenseGroups}
                      scoring={pool.scoring ?? defaultScoring}
                      onSelectPlayer={setSelectedPlayer}
                    />
                    <TeamStatTable
                      title="Defense / Special Teams"
                      entries={team.players.filter((entry) => entry.player.position === "DST")}
                      columns={defenseColumns}
                      scoring={pool.scoring ?? defaultScoring}
                      onSelectPlayer={setSelectedPlayer}
                    />
                    <TeamStatTable
                      title="Kickers"
                      entries={team.players.filter((entry) => entry.player.position === "K")}
                      columns={kickingColumns}
                      scoring={pool.scoring ?? defaultScoring}
                      onSelectPlayer={setSelectedPlayer}
                    />
                  </>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
