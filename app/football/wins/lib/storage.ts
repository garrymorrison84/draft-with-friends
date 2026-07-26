"use client";

import type { DraftTiming } from "../../../lib/draftTiming";

export type WinsPoolMode = "power" | "custom";

export type WinsTeam = {
  id: string;
  name: string;
  conference: string;
  winTotal: number;
  wins: number;
  losses: number;
  rank: number;
  schedule: {
    week: string;
    opponent: string;
    location: "Home" | "Away" | "Neutral";
    result?: "W" | "L";
  }[];
};

export type WinsPool = DraftTiming & {
  id: string;
  poolName: string;
  season: string;
  numberOfTeams: number;
  picksPerTeam: number;
  teamNames: string[];
  draftOrder: string[];
  poolMode: WinsPoolMode;
  conferences: string[];
  createdAt: string;
};

export type WinsDraftPick = {
  teamId: string;
  manager: string;
  pickNumber: number;
};

export const winsConferenceOptions = [
  "ACC",
  "Big Ten",
  "Big 12",
  "Pac-12",
  "SEC",
  "Independents",
];

export const defaultWinsConferences = winsConferenceOptions;

const poolKey = (id: string) => `dwf-football-wins-pool-${id}`;
const picksKey = (id: string) => `dwf-football-wins-picks-${id}`;

function teamId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function scheduleFor(opponents: string[], wins: number): WinsTeam["schedule"] {
  return opponents.map((opponent, index) => ({
    week: `Week ${index + 1}`,
    opponent,
    location: index % 3 === 0 ? "Home" : index % 3 === 1 ? "Away" : "Neutral",
    result: index < wins + Math.min(1, 12 - wins) ? (index < wins ? "W" : "L") : undefined,
  }));
}

const teamsSeed: Omit<WinsTeam, "id" | "rank" | "schedule">[] = [
  { name: "Georgia", conference: "SEC", winTotal: 10.5, wins: 3, losses: 0 },
  { name: "Texas", conference: "SEC", winTotal: 10.5, wins: 3, losses: 0 },
  { name: "Ohio State", conference: "Big Ten", winTotal: 10.5, wins: 2, losses: 1 },
  { name: "Oregon", conference: "Big Ten", winTotal: 10.5, wins: 3, losses: 0 },
  { name: "Alabama", conference: "SEC", winTotal: 9.5, wins: 2, losses: 1 },
  { name: "Notre Dame", conference: "Independents", winTotal: 9.5, wins: 2, losses: 1 },
  { name: "Penn State", conference: "Big Ten", winTotal: 9.5, wins: 3, losses: 0 },
  { name: "Clemson", conference: "ACC", winTotal: 9.5, wins: 2, losses: 1 },
  { name: "LSU", conference: "SEC", winTotal: 9.5, wins: 2, losses: 1 },
  { name: "Miami", conference: "ACC", winTotal: 9.5, wins: 3, losses: 0 },
  { name: "Ole Miss", conference: "SEC", winTotal: 9.5, wins: 3, losses: 0 },
  { name: "Tennessee", conference: "SEC", winTotal: 8.5, wins: 2, losses: 1 },
  { name: "Michigan", conference: "Big Ten", winTotal: 8.5, wins: 2, losses: 1 },
  { name: "Kansas State", conference: "Big 12", winTotal: 8.5, wins: 3, losses: 0 },
  { name: "Utah", conference: "Big 12", winTotal: 8.5, wins: 2, losses: 1 },
  { name: "Iowa State", conference: "Big 12", winTotal: 8.5, wins: 3, losses: 0 },
  { name: "Arizona State", conference: "Big 12", winTotal: 8.5, wins: 2, losses: 1 },
  { name: "Florida State", conference: "ACC", winTotal: 8.5, wins: 2, losses: 1 },
  { name: "SMU", conference: "ACC", winTotal: 8.5, wins: 3, losses: 0 },
  { name: "Louisville", conference: "ACC", winTotal: 8.5, wins: 2, losses: 1 },
  { name: "USC", conference: "Big Ten", winTotal: 7.5, wins: 2, losses: 1 },
  { name: "Washington", conference: "Big Ten", winTotal: 7.5, wins: 2, losses: 1 },
  { name: "Nebraska", conference: "Big Ten", winTotal: 7.5, wins: 3, losses: 0 },
  { name: "Texas Tech", conference: "Big 12", winTotal: 7.5, wins: 2, losses: 1 },
  { name: "Colorado", conference: "Big 12", winTotal: 6.5, wins: 2, losses: 1 },
  { name: "Auburn", conference: "SEC", winTotal: 6.5, wins: 1, losses: 2 },
  { name: "Florida", conference: "SEC", winTotal: 6.5, wins: 2, losses: 1 },
  { name: "North Carolina", conference: "ACC", winTotal: 6.5, wins: 2, losses: 1 },
  { name: "Oregon State", conference: "Pac-12", winTotal: 7.5, wins: 2, losses: 1 },
  { name: "Washington State", conference: "Pac-12", winTotal: 7.5, wins: 3, losses: 0 },
  { name: "Stanford", conference: "Pac-12", winTotal: 4.5, wins: 1, losses: 2 },
  { name: "UConn", conference: "Independents", winTotal: 5.5, wins: 2, losses: 1 },
];

const opponentPool = [
  "Akron",
  "Boise State",
  "Cal",
  "Duke",
  "Florida",
  "Georgia Tech",
  "Iowa",
  "Kentucky",
  "Maryland",
  "Mississippi State",
  "NC State",
  "Oklahoma",
  "Purdue",
  "Rutgers",
  "South Carolina",
  "TCU",
  "UCLA",
  "Virginia Tech",
];

export const winsTeams: WinsTeam[] = teamsSeed
  .map((team, index) => ({
    ...team,
    id: teamId(team.name),
    rank: index + 1,
    schedule: scheduleFor(
      Array.from({ length: 12 }).map(
        (_, scheduleIndex) =>
          opponentPool[(index + scheduleIndex * 3) % opponentPool.length]
      ),
      team.wins
    ),
  }))
  .sort((a, b) => b.winTotal - a.winTotal || a.rank - b.rank);

export function createWinsPoolId() {
  return `cfb-wins-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function saveWinsPool(pool: WinsPool) {
  localStorage.setItem(poolKey(pool.id), JSON.stringify(pool));
}

export function loadWinsPool(id: string) {
  const raw = localStorage.getItem(poolKey(id));
  return raw ? (JSON.parse(raw) as WinsPool) : null;
}

export function saveWinsDraftPicks(poolId: string, picks: WinsDraftPick[]) {
  localStorage.setItem(picksKey(poolId), JSON.stringify(picks));
}

export function loadWinsDraftPicks(poolId: string) {
  const raw = localStorage.getItem(picksKey(poolId));
  return raw ? (JSON.parse(raw) as WinsDraftPick[]) : [];
}

export function eligibleWinsTeams(pool: WinsPool) {
  return winsTeams.filter((team) => pool.conferences.includes(team.conference));
}

export function snakeManagerForPick(pool: WinsPool, pickIndex: number) {
  const round = Math.floor(pickIndex / pool.numberOfTeams);
  const pickInRound = pickIndex % pool.numberOfTeams;
  const orderIndex = round % 2 === 0 ? pickInRound : pool.numberOfTeams - 1 - pickInRound;

  return pool.draftOrder[orderIndex] || pool.teamNames[orderIndex] || `Team ${orderIndex + 1}`;
}

export function formatWinTotal(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}
