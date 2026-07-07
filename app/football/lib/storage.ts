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
  conference: string;
  position: "QB" | "RB" | "WR" | "TE" | "DST" | "K";
  rank: number;
  projected: number;
  opponent: string;
  gameTime: string;
  averageStats: import("./scoringEngine").FootballStatLine;
  projectedStats: import("./scoringEngine").FootballStatLine;
  liveStats?: import("./scoringEngine").FootballStatLine;
  gameLogs?: FootballGameLog[];
};

export type FootballGameLog = {
  id: string;
  week: string;
  opponent: string;
  result?: string;
  statLine: import("./scoringEngine").FootballStatLine;
};

export type FootballDraftPick = {
  playerId: string;
  team: string;
  pickNumber: number;
};

const poolKey = (id: string) => `dwf-football-pool-${id}`;
const picksKey = (id: string) => `dwf-football-picks-${id}`;

export const footballPlayers: FootballPlayer[] = [
  {
    id: "jeremiah-smith",
    name: "Jeremiah Smith",
    school: "Ohio State",
    conference: "Big Ten",
    position: "WR",
    rank: 1,
    projected: 24.8,
    opponent: "Western Kentucky",
    gameTime: "Sat 12:00 PM",
    averageStats: { receptions: 7.2, receivingYards: 96, receivingTds: 0.9 },
    projectedStats: { receptions: 8, receivingYards: 100, receivingTds: 0 },
    liveStats: { receptions: 6, receivingYards: 88, receivingTds: 1 },
  },
  {
    id: "cade-klubnik",
    name: "Cade Klubnik",
    school: "Clemson",
    conference: "ACC",
    position: "QB",
    rank: 2,
    projected: 23.9,
    opponent: "Florida Atlantic",
    gameTime: "Sat 8:00 PM",
    averageStats: { passingYards: 276, passingTds: 2.1, completions: 21, rushingYards: 28 },
    projectedStats: { passingYards: 290, passingTds: 2, completions: 22, rushingYards: 24 },
    liveStats: { passingYards: 312, passingTds: 3, completions: 24, rushingYards: 18 },
  },
  {
    id: "ryan-williams",
    name: "Ryan Williams",
    school: "Alabama",
    conference: "SEC",
    position: "WR",
    rank: 3,
    projected: 22.7,
    opponent: "South Florida",
    gameTime: "Sat 3:30 PM",
    averageStats: { receptions: 5.8, receivingYards: 91, receivingTds: 0.8 },
    projectedStats: { receptions: 6, receivingYards: 95, receivingTds: 1 },
    liveStats: { receptions: 4, receivingYards: 76, receivingTds: 1 },
  },
  {
    id: "drew-allar",
    name: "Drew Allar",
    school: "Penn State",
    conference: "Big Ten",
    position: "QB",
    rank: 4,
    projected: 21.8,
    opponent: "Illinois",
    gameTime: "Sat 12:00 PM",
    averageStats: { passingYards: 248, passingTds: 1.9, completions: 19, rushingYards: 12 },
    projectedStats: { passingYards: 255, passingTds: 2, completions: 20, rushingYards: 10 },
    liveStats: { passingYards: 221, passingTds: 2, completions: 18, rushingYards: 18 },
  },
  {
    id: "nicholas-singleton",
    name: "Nicholas Singleton",
    school: "Penn State",
    conference: "Big Ten",
    position: "RB",
    rank: 5,
    projected: 21.1,
    opponent: "Illinois",
    gameTime: "Sat 12:00 PM",
    averageStats: { rushingAttempts: 15, rushingYards: 86, rushingTds: 0.8, receptions: 2, receivingYards: 18 },
    projectedStats: { rushingAttempts: 16, rushingYards: 92, rushingTds: 1, receptions: 2, receivingYards: 16 },
    liveStats: { rushingAttempts: 18, rushingYards: 104, rushingTds: 1, receptions: 1, receivingYards: 9 },
  },
  {
    id: "justice-haynes",
    name: "Justice Haynes",
    school: "Michigan",
    conference: "Big Ten",
    position: "RB",
    rank: 6,
    projected: 20.4,
    opponent: "Bowling Green",
    gameTime: "Sat 7:30 PM",
    averageStats: { rushingAttempts: 14, rushingYards: 82, rushingTds: 0.7, receptions: 1.5, receivingYards: 12 },
    projectedStats: { rushingAttempts: 17, rushingYards: 96, rushingTds: 1, receptions: 1, receivingYards: 8 },
    liveStats: { rushingAttempts: 13, rushingYards: 73, rushingTds: 1, receptions: 2, receivingYards: 17 },
  },
  {
    id: "garrett-nussmeier",
    name: "Garrett Nussmeier",
    school: "LSU",
    conference: "SEC",
    position: "QB",
    rank: 7,
    projected: 20.1,
    opponent: "Mississippi State",
    gameTime: "Sat 12:00 PM",
    averageStats: { passingYards: 268, passingTds: 2, completions: 20, interceptionsThrown: 0.6 },
    projectedStats: { passingYards: 282, passingTds: 2, completions: 21, interceptionsThrown: 1 },
    liveStats: { passingYards: 305, passingTds: 2, completions: 23, interceptionsThrown: 0 },
  },
  {
    id: "carnell-tate",
    name: "Carnell Tate",
    school: "Ohio State",
    conference: "Big Ten",
    position: "WR",
    rank: 8,
    projected: 19.6,
    opponent: "Western Kentucky",
    gameTime: "Sat 12:00 PM",
    averageStats: { receptions: 5, receivingYards: 74, receivingTds: 0.6 },
    projectedStats: { receptions: 5, receivingYards: 80, receivingTds: 1 },
    liveStats: { receptions: 5, receivingYards: 61, receivingTds: 0 },
  },
  {
    id: "sam-leavitt",
    name: "Sam Leavitt",
    school: "Arizona State",
    conference: "Pac-12",
    position: "QB",
    rank: 9,
    projected: 19.2,
    opponent: "Fresno State",
    gameTime: "Sat 10:30 PM",
    averageStats: { passingYards: 238, passingTds: 1.6, completions: 18, rushingYards: 36 },
    projectedStats: { passingYards: 242, passingTds: 2, completions: 19, rushingYards: 31 },
    liveStats: { passingYards: 198, passingTds: 1, completions: 16, rushingYards: 42, rushingTds: 1 },
  },
  {
    id: "eugene-wilson",
    name: "Eugene Wilson III",
    school: "Florida",
    conference: "SEC",
    position: "WR",
    rank: 10,
    projected: 18.7,
    opponent: "Tennessee",
    gameTime: "Sat 7:00 PM",
    averageStats: { receptions: 6.4, receivingYards: 72, receivingTds: 0.5 },
    projectedStats: { receptions: 7, receivingYards: 76, receivingTds: 0 },
    liveStats: { receptions: 8, receivingYards: 82, receivingTds: 0 },
  },
  {
    id: "mark-fletcher",
    name: "Mark Fletcher Jr.",
    school: "Miami",
    conference: "ACC",
    position: "RB",
    rank: 11,
    projected: 18.1,
    opponent: "Bethune-Cookman",
    gameTime: "Thu 7:30 PM",
    averageStats: { rushingAttempts: 13, rushingYards: 78, rushingTds: 0.8, receptions: 1, receivingYards: 7 },
    projectedStats: { rushingAttempts: 15, rushingYards: 88, rushingTds: 1, receptions: 1, receivingYards: 6 },
    liveStats: { rushingAttempts: 17, rushingYards: 95, rushingTds: 1 },
  },
  {
    id: "mason-taylor",
    name: "Mason Taylor",
    school: "LSU",
    conference: "SEC",
    position: "TE",
    rank: 12,
    projected: 16.6,
    opponent: "Mississippi State",
    gameTime: "Sat 12:00 PM",
    averageStats: { receptions: 4.3, receivingYards: 49, receivingTds: 0.4 },
    projectedStats: { receptions: 5, receivingYards: 54, receivingTds: 0 },
    liveStats: { receptions: 4, receivingYards: 44, receivingTds: 1 },
  },
  {
    id: "georgia-dst",
    name: "Georgia D/ST",
    school: "Georgia",
    conference: "SEC",
    position: "DST",
    rank: 13,
    projected: 15.2,
    opponent: "South Carolina",
    gameTime: "Sat 3:30 PM",
    averageStats: { sacks: 3.2, defenseInterceptions: 1.1, fumbleRecoveries: 0.7 },
    projectedStats: { sacks: 3, defenseInterceptions: 1, fumbleRecoveries: 1 },
    liveStats: { sacks: 4, defenseInterceptions: 1, fumbleRecoveries: 1, defenseTds: 1 },
  },
  {
    id: "ohio-state-dst",
    name: "Ohio State D/ST",
    school: "Ohio State",
    conference: "Big Ten",
    position: "DST",
    rank: 14,
    projected: 14.9,
    opponent: "Western Kentucky",
    gameTime: "Sat 12:00 PM",
    averageStats: { sacks: 3, defenseInterceptions: 1, fumbleRecoveries: 0.6 },
    projectedStats: { sacks: 3, defenseInterceptions: 1, fumbleRecoveries: 1 },
    liveStats: { sacks: 5, defenseInterceptions: 2, fumbleRecoveries: 0 },
  },
  {
    id: "mitchell-evans",
    name: "Mitchell Evans",
    school: "Notre Dame",
    conference: "Independents",
    position: "TE",
    rank: 15,
    projected: 14.4,
    opponent: "Central Michigan",
    gameTime: "Sat 2:30 PM",
    averageStats: { receptions: 4, receivingYards: 46, receivingTds: 0.3 },
    projectedStats: { receptions: 4, receivingYards: 52, receivingTds: 0 },
    liveStats: { receptions: 5, receivingYards: 57, receivingTds: 0 },
  },
  {
    id: "alabama-dst",
    name: "Alabama D/ST",
    school: "Alabama",
    conference: "SEC",
    position: "DST",
    rank: 16,
    projected: 14.1,
    opponent: "South Florida",
    gameTime: "Sat 3:30 PM",
    averageStats: { sacks: 2.8, defenseInterceptions: 1, fumbleRecoveries: 0.5 },
    projectedStats: { sacks: 3, defenseInterceptions: 1, fumbleRecoveries: 1 },
    liveStats: { sacks: 2, defenseInterceptions: 1, fumbleRecoveries: 1, blockedKicks: 1 },
  },
  {
    id: "notre-dame-k",
    name: "Notre Dame K",
    school: "Notre Dame",
    conference: "Independents",
    position: "K",
    rank: 17,
    projected: 8.5,
    opponent: "Central Michigan",
    gameTime: "Sat 2:30 PM",
    averageStats: { extraPointsMade: 3.1, fieldGoalsMade: 1.6, fieldGoals50Plus: 0.2 },
    projectedStats: { extraPointsMade: 3, fieldGoalsMade: 2, fieldGoals50Plus: 0 },
    liveStats: { extraPointsMade: 4, fieldGoalsMade: 1, fieldGoals50Plus: 1 },
  },
  {
    id: "uconn-dst",
    name: "UConn D/ST",
    school: "UConn",
    conference: "Independents",
    position: "DST",
    rank: 18,
    projected: 9.4,
    opponent: "FIU",
    gameTime: "Sat 3:30 PM",
    averageStats: { sacks: 2, defenseInterceptions: 0.7, fumbleRecoveries: 0.5 },
    projectedStats: { sacks: 2, defenseInterceptions: 1, fumbleRecoveries: 0 },
    liveStats: { sacks: 3, defenseInterceptions: 0, fumbleRecoveries: 1 },
  },
];

export const defaultScoring: FootballScoring = {
  fractionalPoints: false,
  negativePoints: false,
  playerPool: "Power 5 + Notre Dame",
  includeKickers: false,
  roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 0 },
  passing: {
    passingTd: 4,
    passingYardsPerPoint: 25,
    completion: 0.2,
    interception: -2,
    twoPointConversion: 0,
    fumbleLost: 0,
  },
  rushing: {
    rushingTd: 6,
    rushingYardsPerPoint: 10,
    attempt: 0.2,
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
