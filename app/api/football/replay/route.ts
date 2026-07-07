import { NextResponse } from "next/server";
import { footballPlayers } from "../../../football/lib/storage";
import type { FootballPlayer } from "../../../football/lib/storage";
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
  livePlayerStats: `${REPLAY_BASE_URL}/stats/json/playergamestatsbyweek/${REPLAY_SEASON_KEY}/${REPLAY_WEEK}`,
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
  Name: string;
  TeamID: number;
  Team: string;
  Position: string;
  Games?: number;
  FantasyPoints?: number;
  PassingCompletions?: number;
  PassingYards?: number;
  PassingTouchdowns?: number;
  PassingInterceptions?: number;
  RushingAttempts?: number;
  RushingYards?: number;
  RushingTouchdowns?: number;
  Receptions?: number;
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
  Sacks?: number;
  FumblesRecovered?: number;
  FumbleReturnTouchdowns?: number;
  FumblesLost?: number;
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
    passingYards: value(stats.PassingYards),
    passingTds: value(stats.PassingTouchdowns),
    completions: value(stats.PassingCompletions),
    interceptionsThrown: value(stats.PassingInterceptions),
    rushingYards: value(stats.RushingYards),
    rushingTds: value(stats.RushingTouchdowns),
    rushingAttempts: value(stats.RushingAttempts),
    receptions: value(stats.Receptions),
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
    sacks: value(stats.Sacks),
    fumbleRecoveries: value(stats.FumblesRecovered),
    fumblesLost: value(stats.FumblesLost),
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

function buildReplayPlayers({
  teams,
  seasonStats,
  liveStats,
  games,
}: {
  teams: SportsDataTeam[];
  seasonStats: SportsDataPlayerStats[];
  liveStats: SportsDataPlayerStats[];
  games: SportsDataGame[];
}) {
  const teamsById = new Map(teams.map((team) => [team.TeamID, team]));
  const liveStatsByPlayer = new Map(
    liveStats.map((stats) => [stats.PlayerID, stats])
  );

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
        name: stats.Name,
        school: team?.School || stats.Team,
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
      };
    })
    .filter((player) => player.name && player.school);

  const defenses: FootballPlayer[] = teams.map((team) => {
    const game = gameInfoForTeam(games, team);

    return {
      id: `sd-dst-${team.TeamID}`,
      name: `${team.School} D/ST`,
      school: team.School,
      conference: normalizeConference(team.Conference),
      position: "DST",
      rank: 9999,
      projected: 0,
      opponent: game.opponent,
      gameTime: game.gameTime,
      averageStats: {},
      projectedStats: {},
      liveStats: {},
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
      const [teams, seasonStats, liveStats, games] = await Promise.all([
        fetchSportsData<SportsDataTeam[]>(replayEndpoints.teams, key),
        fetchSportsData<SportsDataPlayerStats[]>(
          replayEndpoints.playerSeasonStats,
          key
        ),
        fetchSportsData<SportsDataPlayerStats[]>(
          replayEndpoints.livePlayerStats,
          key
        ),
        fetchSportsData<SportsDataGame[]>(replayEndpoints.schedule, key),
      ]);

      replayPlayers = buildReplayPlayers({
        teams,
        seasonStats,
        liveStats,
        games,
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
