import { NextResponse } from "next/server";
import { footballPlayers } from "../../../football/lib/storage";
import type { FootballGameLog, FootballPlayer } from "../../../football/lib/storage";
import type { FootballStatLine } from "../../../football/lib/scoringEngine";

const REPLAY_BASE_URL =
  process.env.SPORTS_DATA_CFB_REPLAY_BASE_URL ||
  "https://replay.sportsdata.io/api/v3/cfb";
const REPLAY_SEASON = process.env.CFB_REPLAY_SEASON || "2023";
const REPLAY_SEASON_TYPE = process.env.CFB_REPLAY_SEASON_TYPE || "reg";
const REPLAY_WEEK = Number(process.env.CFB_REPLAY_WEEK || 3);
const REPLAY_SEASON_KEY = `${REPLAY_SEASON}${REPLAY_SEASON_TYPE}`;
const CACHE_MS = 60 * 1000;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const replayEndpoints = {
  metadata: "https://replay.sportsdata.io/api/metadata",
  week: `${REPLAY_BASE_URL}/scores/json/currentweek`,
  schedule: `${REPLAY_BASE_URL}/scores/json/gamesbyweek/${REPLAY_SEASON_KEY}/${REPLAY_WEEK}`,
  teams: `${REPLAY_BASE_URL}/scores/json/teams`,
  leagueHierarchy: `${REPLAY_BASE_URL}/scores/json/leaguehierarchy`,
  activePlayers: `${REPLAY_BASE_URL}/scores/json/players`,
  playerSeasonStats: `${REPLAY_BASE_URL}/stats/json/playerseasonstats/${REPLAY_SEASON_KEY}`,
  playerGameStatsBySeason: `${REPLAY_BASE_URL}/stats/json/playergamestatsbyseason/${REPLAY_SEASON_KEY}`,
  livePlayerStats: `${REPLAY_BASE_URL}/stats/json/playergamestatsbyweek/${REPLAY_SEASON_KEY}/${REPLAY_WEEK}`,
  teamSeasonStats: `${REPLAY_BASE_URL}/stats/json/teamseasonstats/${REPLAY_SEASON_KEY}`,
  liveTeamStats: `${REPLAY_BASE_URL}/stats/json/teamgamestatsbyweek/${REPLAY_SEASON_KEY}/${REPLAY_WEEK}`,
  liveBoxScores: `${REPLAY_BASE_URL}/stats/json/boxscoresbyweek/${REPLAY_SEASON_KEY}/${REPLAY_WEEK}`,
  liveBoxScoreDelta: `${REPLAY_BASE_URL}/stats/json/boxscoresbyweekdelta/${REPLAY_SEASON_KEY}/${REPLAY_WEEK}/all`,
};

const fantasyPositions = new Set(["QB", "RB", "WR", "TE", "K"]);

type SportsDataTeam = {
  TeamID: number;
  Key: string;
  School: string;
  Conference: string | null;
};

type SportsDataPlayerStats = {
  PlayerID: number;
  Week?: number;
  Name: string;
  TeamID: number;
  Team: string;
  Opponent?: string;
  Position: string;
  Games?: number;
  FantasyPoints?: number;
  PassingCompletions?: number;
  PassingAttempts?: number;
  PassingYards?: number;
  PassingTouchdowns?: number;
  PassingInterceptions?: number;
  RushingAttempts?: number;
  RushingYards?: number;
  RushingTouchdowns?: number;
  Receptions?: number;
  ReceivingTargets?: number;
  ReceivingYards?: number;
  ReceivingTouchdowns?: number;
  PuntReturnTouchdowns?: number;
  KickReturnTouchdowns?: number;
  FieldGoalsAttempted?: number;
  FieldGoalsMade?: number;
  ExtraPointsAttempted?: number;
  ExtraPointsMade?: number;
  Interceptions?: number;
  InterceptionReturnTouchdowns?: number;
  Safeties?: number;
  BlockedKicks?: number;
  Sacks?: number;
  FumblesRecovered?: number;
  FumbleReturnTouchdowns?: number;
  FumblesLost?: number;
  FieldGoalsMade50Plus?: number;
};

type SportsDataTeamStats = {
  TeamID: number;
  Team?: string;
  Games?: number;
  FantasyPoints?: number;
  Interceptions?: number;
  InterceptionReturnTouchdowns?: number;
  Sacks?: number;
  FumblesRecovered?: number;
  FumbleReturnTouchdowns?: number;
  Safeties?: number;
  BlockedKicks?: number;
  PuntReturnTouchdowns?: number;
  KickReturnTouchdowns?: number;
  FieldGoalsMade50Plus?: number;
};

type SportsDataGame = {
  AwayTeam: string;
  HomeTeam: string;
  AwayTeamID: number;
  HomeTeamID: number;
  DateTime?: string;
};

function withKey(url: string, key: string) {
  return `${url}?key=${key}`;
}

async function fetchSportsData<T>(url: string, key: string): Promise<T> {
  const response = await fetch(withKey(url, key), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}`);
  }

  return response.json();
}

async function fetchSportsDataOrEmpty<T>(url: string, key: string): Promise<T[]> {
  try {
    return await fetchSportsData<T[]>(url, key);
  } catch {
    return [];
  }
}

function sanitizeMetadata(metadata: any) {
  if (!metadata || typeof metadata !== "object") return metadata;
  const { ReplayApiKey, ...safeMetadata } = metadata;
  return safeMetadata;
}

function normalizeConference(conference?: string | null) {
  if (!conference) return "Independent";
  if (conference === "Atlantic Coast") return "ACC";
  if (conference.startsWith("Big Ten")) return "Big Ten";
  if (conference === "Big 12") return "Big 12";
  if (conference === "Pac-12") return "Pac-12";
  if (conference.startsWith("SEC")) return "SEC";
  if (conference === "FBS Independents") return "Independents";
  if (conference.startsWith("Mid-American")) return "MAC";
  return conference;
}

const windows1252Bytes: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

function textToMojibakeBytes(value: string) {
  return Uint8Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return windows1252Bytes[code] ?? (code <= 0xff ? code : 0x3f);
  });
}

function repairText(value: string) {
  let repaired = value;
  const decoder = new TextDecoder("utf-8", { fatal: true });

  for (let attempt = 0; attempt < 2 && /Ã|Â/.test(repaired); attempt += 1) {
    try {
      repaired = decoder.decode(textToMojibakeBytes(repaired));
    } catch {
      return value;
    }
  }

  return repaired;
}

function perGame(value: number | undefined, games: number) {
  if (!value || games <= 0) return 0;
  return Number((value / games).toFixed(2));
}

function toStatLine(stats?: SportsDataPlayerStats, perGameStats = false): FootballStatLine {
  if (!stats) return {};

  const divisor = perGameStats ? Math.max(1, stats.Games || 0) : 1;
  const value = (raw: number | undefined) => perGame(raw, divisor);
  const fieldGoalsMade = value(stats.FieldGoalsMade);
  const fieldGoalsAttempted = value(stats.FieldGoalsAttempted);
  const extraPointsMade = value(stats.ExtraPointsMade);
  const extraPointsAttempted = value(stats.ExtraPointsAttempted);

  return {
    passingAttempts: value(stats.PassingAttempts),
    passingYards: value(stats.PassingYards),
    passingTds: value(stats.PassingTouchdowns),
    completions: value(stats.PassingCompletions),
    interceptionsThrown: value(stats.PassingInterceptions),
    rushingYards: value(stats.RushingYards),
    rushingTds: value(stats.RushingTouchdowns),
    rushingAttempts: value(stats.RushingAttempts),
    receptions: value(stats.Receptions),
    receivingTargets: value(stats.ReceivingTargets),
    receivingYards: value(stats.ReceivingYards),
    receivingTds: value(stats.ReceivingTouchdowns),
    returnTds:
      value(stats.PuntReturnTouchdowns) + value(stats.KickReturnTouchdowns),
    fieldGoalsMade,
    fieldGoalsMissed: Math.max(0, fieldGoalsAttempted - fieldGoalsMade),
    extraPointsMade,
    extraPointsMissed: Math.max(0, extraPointsAttempted - extraPointsMade),
    defenseInterceptions: value(stats.Interceptions),
    defenseTds:
      value(stats.InterceptionReturnTouchdowns) +
      value(stats.FumbleReturnTouchdowns),
    safeties: value(stats.Safeties),
    blockedKicks: value(stats.BlockedKicks),
    sacks: value(stats.Sacks),
    fumbleRecoveries: value(stats.FumblesRecovered),
    fumblesLost: value(stats.FumblesLost),
    fieldGoals50Plus: value(stats.FieldGoalsMade50Plus),
  };
}

function toDefenseStatLine(
  stats?: SportsDataTeamStats,
  perGameStats = false
): FootballStatLine {
  if (!stats) return {};

  const divisor = perGameStats ? Math.max(1, stats.Games || 0) : 1;
  const value = (raw: number | undefined) => perGame(raw, divisor);

  return {
    sacks: value(stats.Sacks),
    defenseInterceptions: value(stats.Interceptions),
    fumbleRecoveries: value(stats.FumblesRecovered),
    defenseTds:
      value(stats.InterceptionReturnTouchdowns) +
      value(stats.FumbleReturnTouchdowns),
    safeties: value(stats.Safeties),
    blockedKicks: value(stats.BlockedKicks),
    returnTds:
      value(stats.PuntReturnTouchdowns) + value(stats.KickReturnTouchdowns),
  };
}

function gameInfoForTeam(games: SportsDataGame[], team: SportsDataTeam) {
  const game = games.find(
    (item) => item.AwayTeamID === team.TeamID || item.HomeTeamID === team.TeamID
  );

  if (!game) {
    return {
      opponent: "No Week 3 game",
      gameTime: "TBD",
    };
  }

  const isHome = game.HomeTeamID === team.TeamID;
  const opponent = isHome ? game.AwayTeam : game.HomeTeam;
  const prefix = isHome ? "vs" : "@";
  const gameTime = game.DateTime
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }).format(new Date(game.DateTime))
    : "TBD";

  return {
    opponent: `${prefix} ${opponent}`,
    gameTime,
  };
}

function weeklyPlayerStatsEndpoint(week: number) {
  return `${REPLAY_BASE_URL}/stats/json/playergamestatsbyweek/${REPLAY_SEASON_KEY}/${week}`;
}

function weeklyScheduleEndpoint(week: number) {
  return `${REPLAY_BASE_URL}/scores/json/gamesbyweek/${REPLAY_SEASON_KEY}/${week}`;
}

function gameLogForPlayer({
  stat,
  week,
  teamsById,
  gamesByWeek,
}: {
  stat: SportsDataPlayerStats;
  week: number;
  teamsById: Map<number, SportsDataTeam>;
  gamesByWeek: Map<number, SportsDataGame[]>;
}): FootballGameLog {
  const team = teamsById.get(stat.TeamID);
  const logWeek = stat.Week || week;
  const game = team
    ? gameInfoForTeam(gamesByWeek.get(logWeek) || [], team)
    : { opponent: "TBD", gameTime: "TBD" };

  return {
    id: `week-${logWeek}-${stat.PlayerID}`,
    week: `W${logWeek}`,
    opponent: stat.Opponent || game.opponent,
    statLine: toStatLine(stat),
  };
}

function buildReplayPlayers({
  teams,
  seasonStats,
  liveStats,
  teamSeasonStats,
  liveTeamStats,
  games,
  seasonGameStats,
  weeklyStats,
  gamesByWeek,
}: {
  teams: SportsDataTeam[];
  seasonStats: SportsDataPlayerStats[];
  liveStats: SportsDataPlayerStats[];
  teamSeasonStats: SportsDataTeamStats[];
  liveTeamStats: SportsDataTeamStats[];
  games: SportsDataGame[];
  seasonGameStats: SportsDataPlayerStats[];
  weeklyStats: { week: number; stats: SportsDataPlayerStats[] }[];
  gamesByWeek: Map<number, SportsDataGame[]>;
}) {
  const teamsById = new Map(teams.map((team) => [team.TeamID, team]));
  const liveStatsByPlayer = new Map(
    liveStats.map((stats) => [stats.PlayerID, stats])
  );
  const teamSeasonStatsByTeam = new Map(
    teamSeasonStats.map((stats) => [stats.TeamID, stats])
  );
  const liveTeamStatsByTeam = new Map(
    liveTeamStats.map((stats) => [stats.TeamID, stats])
  );
  const gameLogsByPlayer = new Map<number, FootballGameLog[]>();

  const gameLogStats = seasonGameStats.length
    ? seasonGameStats.map((stat) => ({ week: stat.Week || REPLAY_WEEK, stat }))
    : weeklyStats.flatMap(({ week, stats }) =>
        stats.map((stat) => ({ week, stat }))
      );

  gameLogStats.forEach(({ week, stat }) => {
    if (!fantasyPositions.has(stat.Position)) return;
    const logs = gameLogsByPlayer.get(stat.PlayerID) || [];
    logs.push(gameLogForPlayer({ stat, week, teamsById, gamesByWeek }));
    gameLogsByPlayer.set(stat.PlayerID, logs);
  });

  const normalizedPlayers: FootballPlayer[] = seasonStats
    .filter((stats) => fantasyPositions.has(stats.Position))
    .map((stats) => {
      const team = teamsById.get(stats.TeamID);
      const live = liveStatsByPlayer.get(stats.PlayerID);
      const game = team
        ? gameInfoForTeam(games, team)
        : { opponent: "TBD", gameTime: "TBD" };

      return {
        id: `sd-${stats.PlayerID}`,
        name: repairText(stats.Name),
        school: repairText(team?.School || stats.Team),
        conference: normalizeConference(team?.Conference),
        position: stats.Position as FootballPlayer["position"],
        rank: 9999,
        projected: stats.Games
          ? Number(((stats.FantasyPoints || 0) / Math.max(1, stats.Games)).toFixed(1))
          : 0,
        opponent: game.opponent,
        gameTime: game.gameTime,
        averageStats: toStatLine(stats, true),
        projectedStats: toStatLine(stats, true),
        liveStats: live ? toStatLine(live) : {},
        gameLogs: (gameLogsByPlayer.get(stats.PlayerID) || []).sort(
          (a, b) => a.week.localeCompare(b.week, undefined, { numeric: true })
        ),
      };
    })
    .filter((player) => player.name && player.school);

  const defenses: FootballPlayer[] = teams.map((team) => {
    const game = gameInfoForTeam(games, team);
    const seasonStatsForTeam = teamSeasonStatsByTeam.get(team.TeamID);
    const liveStatsForTeam = liveTeamStatsByTeam.get(team.TeamID);

    return {
      id: `sd-dst-${team.TeamID}`,
      name: `${team.School} D/ST`,
      school: team.School,
      conference: normalizeConference(team.Conference),
      position: "DST",
      rank: 9999,
      projected: seasonStatsForTeam?.FantasyPoints
        ? Number(
            (
              seasonStatsForTeam.FantasyPoints /
              Math.max(1, seasonStatsForTeam.Games || 0)
            ).toFixed(1)
          )
        : 0,
      opponent: game.opponent,
      gameTime: game.gameTime,
      averageStats: toDefenseStatLine(seasonStatsForTeam, true),
      projectedStats: toDefenseStatLine(seasonStatsForTeam, true),
      liveStats: toDefenseStatLine(liveStatsForTeam),
      gameLogs: [],
    };
  });

  return [...normalizedPlayers, ...defenses]
    .map((player, index) => ({ ...player, rank: index + 1 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type ReplayResponse = {
  mode: string;
  replay: {
    season: string;
    seasonType: string;
    week: number;
    metadata: any;
    endpoints: typeof replayEndpoints;
    hasReplayKey: boolean;
    error: string | null;
  };
  playerPool: {
    source: string;
    count: number;
    conferences: string[];
    players: FootballPlayer[];
  };
};

type ReplayCache = { expiresAt: number; response: ReplayResponse } | null;

const globalForReplay = globalThis as typeof globalThis & {
  __draftWithFriendsCfbReplayCache?: ReplayCache;
};

async function getReplayMetadata() {
  const key = process.env.SPORTS_DATA_CFB_REPLAY_KEY;
  if (!key) return null;

  try {
    const response = await fetch(`${replayEndpoints.metadata}?key=${key}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        error: `Replay metadata failed with ${response.status}`,
      };
    }

    return sanitizeMetadata(await response.json());
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Replay metadata failed",
    };
  }
}

export async function GET() {
  const key = process.env.SPORTS_DATA_CFB_REPLAY_KEY;
  if (
    globalForReplay.__draftWithFriendsCfbReplayCache &&
    globalForReplay.__draftWithFriendsCfbReplayCache.expiresAt > Date.now()
  ) {
    return NextResponse.json(
      globalForReplay.__draftWithFriendsCfbReplayCache.response
    );
  }

  const replayMetadata = await getReplayMetadata();
  let replayPlayers = footballPlayers;
  let source =
    "Static trial data. Add SPORTS_DATA_CFB_REPLAY_KEY to load SportsData replay players.";
  let sportsDataError: string | null = null;

  if (key) {
    try {
      const replayWeeks = Array.from({ length: REPLAY_WEEK }, (_, index) => index + 1);
      const [
        teams,
        seasonStats,
        seasonGameStats,
        liveStats,
        teamSeasonStats,
        liveTeamStats,
        games,
        weeklyStatsResults,
        weeklyScheduleResults,
      ] = await Promise.all([
        fetchSportsData<SportsDataTeam[]>(replayEndpoints.teams, key),
        fetchSportsData<SportsDataPlayerStats[]>(
          replayEndpoints.playerSeasonStats,
          key
        ),
        fetchSportsDataOrEmpty<SportsDataPlayerStats>(
          replayEndpoints.playerGameStatsBySeason,
          key
        ),
        fetchSportsData<SportsDataPlayerStats[]>(
          replayEndpoints.livePlayerStats,
          key
        ),
        fetchSportsDataOrEmpty<SportsDataTeamStats>(
          replayEndpoints.teamSeasonStats,
          key
        ),
        fetchSportsDataOrEmpty<SportsDataTeamStats>(
          replayEndpoints.liveTeamStats,
          key
        ),
        fetchSportsData<SportsDataGame[]>(replayEndpoints.schedule, key),
        Promise.all(
          replayWeeks.map(async (week) => ({
            week,
            stats: await fetchSportsDataOrEmpty<SportsDataPlayerStats>(
              weeklyPlayerStatsEndpoint(week),
              key
            ),
          }))
        ),
        Promise.all(
          replayWeeks.map(async (week) => ({
            week,
            games: await fetchSportsDataOrEmpty<SportsDataGame>(
              weeklyScheduleEndpoint(week),
              key
            ),
          }))
        ),
      ]);
      const gamesByWeek = new Map(
        weeklyScheduleResults.map((result) => [result.week, result.games])
      );

      replayPlayers = buildReplayPlayers({
        teams,
        seasonStats,
        seasonGameStats,
        liveStats,
        teamSeasonStats,
        liveTeamStats,
        games,
        weeklyStats: weeklyStatsResults,
        gamesByWeek,
      });
      source = "SportsData CFB replay";
    } catch (error) {
      sportsDataError =
        error instanceof Error ? error.message : "SportsData replay load failed";
    }
  }

  const response: ReplayResponse = {
    mode: key ? "sportsdata-replay" : process.env.CFB_DATA_MODE || "trial-static",
    replay: {
      season: REPLAY_SEASON,
      seasonType: REPLAY_SEASON_TYPE,
      week: REPLAY_WEEK,
      metadata: replayMetadata,
      endpoints: replayEndpoints,
      hasReplayKey: Boolean(key),
      error: sportsDataError,
    },
    playerPool: {
      source,
      count: replayPlayers.length,
      conferences: Array.from(
        new Set(replayPlayers.map((player) => player.conference))
      ).sort(),
      players: replayPlayers,
    },
  };

  globalForReplay.__draftWithFriendsCfbReplayCache = {
    expiresAt: Date.now() + CACHE_MS,
    response,
  };

  return NextResponse.json(response);
}
