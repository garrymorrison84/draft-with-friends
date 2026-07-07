import { NextResponse } from "next/server";
import { footballPlayers } from "../../../football/lib/storage";

const REPLAY_BASE_URL =
  process.env.SPORTS_DATA_CFB_REPLAY_BASE_URL ||
  "https://replay.sportsdata.io/api/v3/cfb";

const replayEndpoints = {
  metadata: "https://replay.sportsdata.io/api/metadata",
  week: `${REPLAY_BASE_URL}/scores/json/currentweek`,
  schedule: `${REPLAY_BASE_URL}/scores/json/gamesbyweek/2023reg/3`,
  teams: `${REPLAY_BASE_URL}/scores/json/teams`,
  leagueHierarchy: `${REPLAY_BASE_URL}/scores/json/leaguehierarchy`,
  activePlayers: `${REPLAY_BASE_URL}/stats/json/players`,
  playerSeasonStats: `${REPLAY_BASE_URL}/stats/json/playerseasonstats/2023reg`,
  livePlayerStats: `${REPLAY_BASE_URL}/stats/json/playergamestatsbyweek/2023reg/3`,
  liveBoxScores: `${REPLAY_BASE_URL}/stats/json/boxscoresbyweek/2023reg/3`,
  liveBoxScoreDelta: `${REPLAY_BASE_URL}/stats/json/boxscoresbyweekdelta/2023reg/3/all`,
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

    return response.json();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Replay metadata failed",
    };
  }
}

export async function GET() {
  const replayMetadata = await getReplayMetadata();

  return NextResponse.json({
    mode: process.env.CFB_DATA_MODE || "trial-static",
    replay: {
      season: process.env.CFB_REPLAY_SEASON || "2023",
      seasonType: process.env.CFB_REPLAY_SEASON_TYPE || "reg",
      week: Number(process.env.CFB_REPLAY_WEEK || 3),
      metadata: replayMetadata,
      endpoints: replayEndpoints,
      hasReplayKey: Boolean(process.env.SPORTS_DATA_CFB_REPLAY_KEY),
    },
    playerPool: {
      source:
        "Static trial data now, SportsData replay player/team endpoints when key is configured.",
      count: footballPlayers.length,
      conferences: Array.from(
        new Set(footballPlayers.map((player) => player.conference))
      ).sort(),
      players: footballPlayers,
    },
  });
}
