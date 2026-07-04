"use client";

export type FootballScoring = {
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

export type FootballPlayerPool = {
  mode: "power" | "custom";
  conferences: string[];
};

export type FootballPool = {
  id: string;
  poolName: string;
  season: string;
  numberOfTeams: number;
  teamNames: string[];
  draftOrder: string[];
  playerPool?: FootballPlayerPool;
  scoring?: FootballScoring;
  createdAt: string;
};

export type FootballPlayer = {
  id: string;
  name: string;
  school: string;
  position: "QB" | "RB" | "WR" | "TE" | "DST" | "K";
  rank: number;
  projected: number;
};

export type FootballDraftPick = {
  playerId: string;
  team: string;
  pickNumber: number;
};

const poolKey = (id: string) => `dwf-football-pool-${id}`;
const picksKey = (id: string) => `dwf-football-picks-${id}`;

export const footballPlayers: FootballPlayer[] = [
  { id: "jeremiah-smith", name: "Jeremiah Smith", school: "Ohio State", position: "WR", rank: 1, projected: 24.8 },
  { id: "cade-klubnik", name: "Cade Klubnik", school: "Clemson", position: "QB", rank: 2, projected: 23.9 },
  { id: "ryan-williams", name: "Ryan Williams", school: "Alabama", position: "WR", rank: 3, projected: 22.7 },
  { id: "drew-allar", name: "Drew Allar", school: "Penn State", position: "QB", rank: 4, projected: 21.8 },
  { id: "nicholas-singleton", name: "Nicholas Singleton", school: "Penn State", position: "RB", rank: 5, projected: 21.1 },
  { id: "justice-haynes", name: "Justice Haynes", school: "Michigan", position: "RB", rank: 6, projected: 20.4 },
  { id: "garrett-nussmeier", name: "Garrett Nussmeier", school: "LSU", position: "QB", rank: 7, projected: 20.1 },
  { id: "carnell-tate", name: "Carnell Tate", school: "Ohio State", position: "WR", rank: 8, projected: 19.6 },
  { id: "sam-leavitt", name: "Sam Leavitt", school: "Arizona State", position: "QB", rank: 9, projected: 19.2 },
  { id: "eugene-wilson", name: "Eugene Wilson III", school: "Florida", position: "WR", rank: 10, projected: 18.7 },
  { id: "mark-fletcher", name: "Mark Fletcher Jr.", school: "Miami", position: "RB", rank: 11, projected: 18.1 },
  { id: "mason-taylor", name: "Mason Taylor", school: "LSU", position: "TE", rank: 12, projected: 16.6 },
  { id: "georgia-dst", name: "Georgia D/ST", school: "Georgia", position: "DST", rank: 13, projected: 15.2 },
  { id: "ohio-state-dst", name: "Ohio State D/ST", school: "Ohio State", position: "DST", rank: 14, projected: 14.9 },
  { id: "mitchell-evans", name: "Mitchell Evans", school: "Notre Dame", position: "TE", rank: 15, projected: 14.4 },
  { id: "alabama-dst", name: "Alabama D/ST", school: "Alabama", position: "DST", rank: 16, projected: 14.1 },
];

export const defaultScoring: FootballScoring = {
  fractionalPoints: true,
  negativePoints: true,
  playerPool: "Power 5 + Notre Dame",
  includeKickers: false,
  roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 0 },
  passing: {
    passingTd: 4,
    passingYardsPerPoint: 25,
    completion: 0.2,
    interception: -2,
    twoPointConversion: 2,
    fumbleLost: -2,
  },
  rushing: {
    rushingTd: 6,
    rushingYardsPerPoint: 10,
    attempt: 0.2,
    twoPointConversion: 2,
  },
  receiving: {
    receivingTd: 6,
    receivingYardsPerPoint: 10,
    reception: 0.5,
    twoPointConversion: 2,
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
    missedExtraPoint: -1,
    fieldGoal: 3,
    missedFieldGoal: -1,
    fieldGoal50Bonus: 2,
  },
};

export const defaultFootballPlayerPool: FootballPlayerPool = {
  mode: "power",
  conferences: ["ACC", "Big Ten", "Big 12", "Pac-12", "SEC", "Independents"],
};

export function createFootballPoolId() {
  return `cfb-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function saveFootballPool(pool: FootballPool) {
  localStorage.setItem(poolKey(pool.id), JSON.stringify(pool));
}

export function loadFootballPool(id: string) {
  const raw = localStorage.getItem(poolKey(id));
  return raw ? (JSON.parse(raw) as FootballPool) : null;
}

export function saveFootballDraftPicks(poolId: string, picks: FootballDraftPick[]) {
  localStorage.setItem(picksKey(poolId), JSON.stringify(picks));
}

export function loadFootballDraftPicks(poolId: string) {
  const raw = localStorage.getItem(picksKey(poolId));
  return raw ? (JSON.parse(raw) as FootballDraftPick[]) : [];
}

export function getTotalRosterSlots(scoring?: FootballScoring) {
  const roster = scoring?.roster || defaultScoring.roster;
  return Object.values(roster).reduce((total, value) => total + value, 0);
}
