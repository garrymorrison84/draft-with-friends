export type NflScoring = {
  fractionalPoints: boolean;
  negativePoints: boolean;
  playerPool: string;
  includeKickers: boolean;
  roster: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    FLEX: number;
    DST: number;
    K: number;
  };
  passing: {
    passingTd: number;
    passingYardsPerPoint: number;
    completion: number;
    interception: number;
    twoPointConversion: number;
    fumbleLost: number;
  };
  rushing: {
    rushingTd: number;
    rushingYardsPerPoint: number;
    attempt: number;
    twoPointConversion: number;
  };
  receiving: {
    receivingTd: number;
    receivingYardsPerPoint: number;
    reception: number;
    twoPointConversion: number;
  };
  defense: {
    sack: number;
    interception: number;
    fumbleRecovery: number;
    touchdown: number;
    safety: number;
    blockedKick: number;
    returnTouchdown: number;
  };
  kicking: {
    extraPoint: number;
    missedExtraPoint: number;
    fieldGoal: number;
    missedFieldGoal: number;
    fieldGoal50Bonus: number;
  };
};

export type NflPlayerPool = {
  mode: "power" | "custom";
  conferences: string[];
};

export type NflPool = {
  id: string;
  poolName: string;
  season: string;
  numberOfTeams: number;
  teamNames: string[];
  draftOrder: string[];
  playerPool?: NflPlayerPool;
  scoring?: NflScoring;
  draftType?: "unscheduled" | "scheduled";
  scheduledDraftAt?: string | null;
  timeZone?: import("../../lib/draftTiming").DraftTimeZone;
  pickClockSeconds?: number;
  autoPickOnTimeout?: boolean;
  draftPaused?: boolean;
  draftPausedRemaining?: number | null;
  draftTimerStartedAt?: string | null;
  createdAt: string;
  ownerId?: string;
};

export type NflPlayer = {
  id: string;
  name: string;
  school: string;
  schoolAbbreviation?: string;
  conference: string;
  position: "QB" | "RB" | "WR" | "TE" | "DST" | "K";
  rank: number;
  projected: number;
  opponent: string;
  gameTime: string;
  gameStartAt?: string;
  gameStatus?: string;
  injuryStatus?: string;
  injuryType?: string;
  averageStats: import("./scoringEngine").NflStatLine;
  projectedStats: import("./scoringEngine").NflStatLine;
  liveStats?: import("./scoringEngine").NflStatLine;
  gameLogs?: NflGameLog[];
};

export type NflInjuryAvailability = "available" | "warning" | "out";

export function getNflInjuryAvailability(
  player: Pick<NflPlayer, "injuryStatus" | "injuryType">
): NflInjuryAvailability {
  const status = player.injuryStatus?.trim().toLowerCase() || "";
  if (!status) return player.injuryType ? "warning" : "available";
  if (/^(active|available|healthy|cleared)$/.test(status)) {
    return "available";
  }
  if (
    /^o$|\bout\b|\binactive\b|injured reserve|reserve\/injured|^ir$|\bpup\b|physically unable|season[- ]ending|will not play|\bsuspended\b/.test(
      status
    )
  ) {
    return "out";
  }
  return "warning";
}

export type NflInjuryDesignation = "O" | "Q" | "D" | null;

export function getNflInjuryDesignation(
  player: Pick<NflPlayer, "injuryStatus">
): NflInjuryDesignation {
  const status = player.injuryStatus?.trim().toLowerCase() || "";
  if (/^(o|out)$/.test(status)) return "O";
  if (/^(q|questionable|gtd|game[- ]time decision)$/.test(status)) return "Q";
  if (/^(d|doubtful)$/.test(status)) return "D";
  return null;
}

export function getNflDraftEligibilityCutoff(
  pool: Pick<NflPool, "draftType" | "scheduledDraftAt"> | null | undefined,
  now: Date | number = new Date()
) {
  const nowMs = now instanceof Date ? now.getTime() : now;
  const scheduledDraftMs =
    pool?.draftType === "scheduled" && pool.scheduledDraftAt
      ? Date.parse(pool.scheduledDraftAt)
      : Number.NaN;

  return Number.isFinite(scheduledDraftMs)
    ? Math.max(nowMs, scheduledDraftMs)
    : nowMs;
}

export function isNflPlayerEligibleAt(
  player: Pick<NflPlayer, "gameStartAt">,
  cutoff: Date | number
) {
  const cutoffMs = cutoff instanceof Date ? cutoff.getTime() : cutoff;
  const gameStartMs = player.gameStartAt
    ? Date.parse(player.gameStartAt)
    : Number.NaN;

  return Number.isFinite(cutoffMs) && Number.isFinite(gameStartMs) && gameStartMs > cutoffMs;
}

export type NflGameLog = {
  id: string;
  week: string;
  opponent: string;
  result?: string;
  statLine: import("./scoringEngine").NflStatLine;
};

export type NflDraftPick = {
  playerId: string;
  team: string;
  pickNumber: number;
  pickedAt?: string;
  playerSnapshot?: NflPlayer;
};

export function getNflReplayUrl(
  pool: Pick<NflPool, "season" | "createdAt">
) {
  const weekMatch = pool.season.match(/week\s*(\d+)/i);
  const week = weekMatch ? Number(weekMatch[1]) : 0;
  const createdAt = new Date(pool.createdAt);
  const seasonYear = Number.isNaN(createdAt.getTime())
    ? new Date().getFullYear()
    : createdAt.getMonth() < 2
      ? createdAt.getFullYear() - 1
      : createdAt.getFullYear();
  const params = new URLSearchParams();
  if (week >= 1 && week <= 25) params.set("week", String(week));
  params.set("season", String(seasonYear));
  return `/api/nfl/replay?${params.toString()}`;
}

const poolKey = (id: string) => `dwf-nfl-pool-${id}`;
const picksKey = (id: string) => `dwf-nfl-picks-${id}`;

export const nflPlayers: NflPlayer[] = [];

export const defaultScoring: NflScoring = {
  fractionalPoints: false,
  negativePoints: false,
  playerPool: "All NFL Teams",
  includeKickers: false,
  roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 0 },
  passing: {
    passingTd: 4,
    passingYardsPerPoint: 25,
    completion: 0,
    interception: -2,
    twoPointConversion: 0,
    fumbleLost: 0,
  },
  rushing: {
    rushingTd: 6,
    rushingYardsPerPoint: 10,
    attempt: 0,
    twoPointConversion: 0,
  },
  receiving: {
    receivingTd: 6,
    receivingYardsPerPoint: 10,
    reception: 0.5,
    twoPointConversion: 0,
  },
  defense: {
    sack: 1,
    interception: 2,
    fumbleRecovery: 2,
    touchdown: 6,
    safety: 2,
    blockedKick: 2,
    returnTouchdown: 6,
  },
  kicking: {
    extraPoint: 1,
    missedExtraPoint: 0,
    fieldGoal: 3,
    missedFieldGoal: 0,
    fieldGoal50Bonus: 0,
  },
};

export const defaultNflPlayerPool: NflPlayerPool = {
  mode: "power",
  conferences: [
    "AFC East",
    "AFC North",
    "AFC South",
    "AFC West",
    "NFC East",
    "NFC North",
    "NFC South",
    "NFC West",
  ],
};

export function createNflPoolId() {
  return `nfl-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function saveNflPool(pool: NflPool) {
  localStorage.setItem(poolKey(pool.id), JSON.stringify(pool));
}

export function loadNflPool(id: string) {
  const raw = localStorage.getItem(poolKey(id));
  return raw ? (JSON.parse(raw) as NflPool) : null;
}

export function saveNflDraftPicks(poolId: string, picks: NflDraftPick[]) {
  localStorage.setItem(picksKey(poolId), JSON.stringify(picks));
}

export function loadNflDraftPicks(poolId: string) {
  const raw = localStorage.getItem(picksKey(poolId));
  return raw ? (JSON.parse(raw) as NflDraftPick[]) : [];
}

export function clearNflHistory(poolId: string) {
  localStorage.removeItem(poolKey(poolId));
  localStorage.removeItem(picksKey(poolId));
}

export function getTotalRosterSlots(scoring?: NflScoring) {
  const roster = scoring?.roster || defaultScoring.roster;
  return Object.values(roster).reduce((total, value) => total + value, 0);
}
