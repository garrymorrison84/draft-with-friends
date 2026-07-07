"use client";

import type { FootballPlayer, FootballScoring } from "./storage";
import { defaultScoring } from "./storage";

export type FootballStatLine = {
  passingYards?: number;
  passingTds?: number;
  completions?: number;
  interceptionsThrown?: number;
  rushingYards?: number;
  rushingTds?: number;
  rushingAttempts?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTds?: number;
  sacks?: number;
  defenseInterceptions?: number;
  fumbleRecoveries?: number;
  defenseTds?: number;
  safeties?: number;
  blockedKicks?: number;
  returnTds?: number;
  extraPointsMade?: number;
  extraPointsMissed?: number;
  fieldGoalsMade?: number;
  fieldGoalsMissed?: number;
  fieldGoals50Plus?: number;
  fumblesLost?: number;
  twoPointConversions?: number;
};

export type ScoreComponent = {
  label: string;
  points: number;
};

export type PlayerScoreResult = {
  total: number;
  components: ScoreComponent[];
};

function applyScoreOptions(points: number, scoring: FootballScoring) {
  if (!scoring.negativePoints && points < 0) return 0;
  return points;
}

function finishScore(points: number, scoring: FootballScoring) {
  const adjusted = scoring.fractionalPoints ? points : Math.round(points);
  return Number(adjusted.toFixed(1));
}

function addComponent(
  components: ScoreComponent[],
  label: string,
  statValue: number | undefined,
  points: number,
  scoring: FootballScoring
) {
  if (!statValue || points === 0) return;

  const adjusted = applyScoreOptions(points, scoring);
  if (adjusted === 0) return;

  components.push({
    label,
    points: finishScore(adjusted, scoring),
  });
}

export function scoreFootballStats(
  statLine: FootballStatLine,
  scoring: FootballScoring = defaultScoring
): PlayerScoreResult {
  const components: ScoreComponent[] = [];

  addComponent(
    components,
    `${statLine.passingYards || 0} pass yds`,
    statLine.passingYards,
    (statLine.passingYards || 0) / scoring.passing.passingYardsPerPoint,
    scoring
  );
  addComponent(
    components,
    `${statLine.passingTds || 0} pass TD`,
    statLine.passingTds,
    (statLine.passingTds || 0) * scoring.passing.passingTd,
    scoring
  );
  addComponent(
    components,
    `${statLine.completions || 0} completions`,
    statLine.completions,
    (statLine.completions || 0) * scoring.passing.completion,
    scoring
  );
  addComponent(
    components,
    `${statLine.interceptionsThrown || 0} INT thrown`,
    statLine.interceptionsThrown,
    (statLine.interceptionsThrown || 0) * scoring.passing.interception,
    scoring
  );
  addComponent(
    components,
    `${statLine.rushingYards || 0} rush yds`,
    statLine.rushingYards,
    (statLine.rushingYards || 0) / scoring.rushing.rushingYardsPerPoint,
    scoring
  );
  addComponent(
    components,
    `${statLine.rushingTds || 0} rush TD`,
    statLine.rushingTds,
    (statLine.rushingTds || 0) * scoring.rushing.rushingTd,
    scoring
  );
  addComponent(
    components,
    `${statLine.rushingAttempts || 0} attempts`,
    statLine.rushingAttempts,
    (statLine.rushingAttempts || 0) * scoring.rushing.attempt,
    scoring
  );
  addComponent(
    components,
    `${statLine.receptions || 0} catches`,
    statLine.receptions,
    (statLine.receptions || 0) * scoring.receiving.reception,
    scoring
  );
  addComponent(
    components,
    `${statLine.receivingYards || 0} rec yds`,
    statLine.receivingYards,
    (statLine.receivingYards || 0) / scoring.receiving.receivingYardsPerPoint,
    scoring
  );
  addComponent(
    components,
    `${statLine.receivingTds || 0} rec TD`,
    statLine.receivingTds,
    (statLine.receivingTds || 0) * scoring.receiving.receivingTd,
    scoring
  );
  addComponent(
    components,
    `${statLine.twoPointConversions || 0} 2PT`,
    statLine.twoPointConversions,
    (statLine.twoPointConversions || 0) * scoring.passing.twoPointConversion,
    scoring
  );
  addComponent(
    components,
    `${statLine.fumblesLost || 0} fumbles lost`,
    statLine.fumblesLost,
    (statLine.fumblesLost || 0) * scoring.passing.fumbleLost,
    scoring
  );
  addComponent(
    components,
    `${statLine.sacks || 0} sacks`,
    statLine.sacks,
    (statLine.sacks || 0) * scoring.defense.sack,
    scoring
  );
  addComponent(
    components,
    `${statLine.defenseInterceptions || 0} defensive INT`,
    statLine.defenseInterceptions,
    (statLine.defenseInterceptions || 0) * scoring.defense.interception,
    scoring
  );
  addComponent(
    components,
    `${statLine.fumbleRecoveries || 0} fumble rec`,
    statLine.fumbleRecoveries,
    (statLine.fumbleRecoveries || 0) * scoring.defense.fumbleRecovery,
    scoring
  );
  addComponent(
    components,
    `${statLine.defenseTds || 0} defense TD`,
    statLine.defenseTds,
    (statLine.defenseTds || 0) * scoring.defense.touchdown,
    scoring
  );
  addComponent(
    components,
    `${statLine.safeties || 0} safety`,
    statLine.safeties,
    (statLine.safeties || 0) * scoring.defense.safety,
    scoring
  );
  addComponent(
    components,
    `${statLine.blockedKicks || 0} blocked kick`,
    statLine.blockedKicks,
    (statLine.blockedKicks || 0) * scoring.defense.blockedKick,
    scoring
  );
  addComponent(
    components,
    `${statLine.returnTds || 0} return TD`,
    statLine.returnTds,
    (statLine.returnTds || 0) * scoring.defense.returnTouchdown,
    scoring
  );
  addComponent(
    components,
    `${statLine.extraPointsMade || 0} XP`,
    statLine.extraPointsMade,
    (statLine.extraPointsMade || 0) * scoring.kicking.extraPoint,
    scoring
  );
  addComponent(
    components,
    `${statLine.extraPointsMissed || 0} missed XP`,
    statLine.extraPointsMissed,
    (statLine.extraPointsMissed || 0) * scoring.kicking.missedExtraPoint,
    scoring
  );
  addComponent(
    components,
    `${statLine.fieldGoalsMade || 0} FG`,
    statLine.fieldGoalsMade,
    (statLine.fieldGoalsMade || 0) * scoring.kicking.fieldGoal,
    scoring
  );
  addComponent(
    components,
    `${statLine.fieldGoalsMissed || 0} missed FG`,
    statLine.fieldGoalsMissed,
    (statLine.fieldGoalsMissed || 0) * scoring.kicking.missedFieldGoal,
    scoring
  );
  addComponent(
    components,
    `${statLine.fieldGoals50Plus || 0} 50+ FG bonus`,
    statLine.fieldGoals50Plus,
    (statLine.fieldGoals50Plus || 0) * scoring.kicking.fieldGoal50Bonus,
    scoring
  );

  return {
    total: finishScore(
      components.reduce((sum, component) => sum + component.points, 0),
      scoring
    ),
    components,
  };
}

export function getProjectedScore(
  player: FootballPlayer,
  scoring: FootballScoring = defaultScoring
) {
  return scoreFootballStats(player.projectedStats, scoring);
}

export function getLiveScore(
  player: FootballPlayer,
  scoring: FootballScoring = defaultScoring
) {
  return scoreFootballStats(player.liveStats || player.projectedStats, scoring);
}

export function getPlayerPpg(
  player: FootballPlayer,
  scoring: FootballScoring = defaultScoring
) {
  return scoreFootballStats(player.averageStats, scoring).total;
}

export function getProjectionSummary(
  player: FootballPlayer,
  scoring: FootballScoring = defaultScoring
) {
  const result = getProjectedScore(player, scoring);
  return result.components
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 3)
    .map((component) => `${component.label}: ${component.points.toFixed(1)}`);
}
