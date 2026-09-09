import { NextResponse } from "next/server";
import { footballPlayers } from "../../../football/lib/storage";
import { getOpticOddsFootball } from "./optic";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const opticOddsKey = process.env.OPTICODDS_API_KEY;

  if (!opticOddsKey) {
    return NextResponse.json(
      {
        mode: "unavailable",
        replay: {
          season: String(new Date().getFullYear()),
          seasonType: "reg",
          week: 0,
          metadata: { provider: "OpticOdds" },
          endpoints: {},
          hasReplayKey: false,
          error: "OpticOdds API key is not configured.",
        },
        playerPool: {
          source: "OpticOdds unavailable",
          count: 0,
          conferences: [],
          players: [],
        },
      },
      { status: 503 }
    );
  }

  try {
    return NextResponse.json(await getOpticOddsFootball(opticOddsKey));
  } catch (error) {
    return NextResponse.json(
      {
        mode: "fallback",
        replay: {
          season: String(new Date().getFullYear()),
          seasonType: "reg",
          week: 0,
          metadata: { provider: "OpticOdds" },
          endpoints: {},
          hasReplayKey: true,
          error:
            error instanceof Error ? error.message : "OpticOdds request failed.",
        },
        playerPool: {
          source: "Static fallback data",
          count: footballPlayers.length,
          conferences: [
            ...new Set(footballPlayers.map((player) => player.conference)),
          ],
          players: footballPlayers,
        },
      },
      { status: 502 }
    );
  }
}
