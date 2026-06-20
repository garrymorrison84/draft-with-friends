import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

const TOURNAMENT_ID = 690;
const EVENT_ID = "USOPEN2026";

function isValidToPar(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= -20 &&
    value <= 30
  );
}

function getRoundScoreToPar(
  player: any,
  roundNumber: number
): number | null {
  const round = player.Rounds?.find(
    (item: any) => Number(item.Number) === roundNumber
  );

  if (!round) return null;

  // SportsDataIO round.Score is gross strokes.
  // Subtract the round's par to get score relative to par.
  if (
    typeof round.Score === "number" &&
    typeof round.Par === "number" &&
    round.Score > 0 &&
    round.Par > 0
  ) {
    const scoreToPar = round.Score - round.Par;

    return isValidToPar(scoreToPar) ? scoreToPar : null;
  }

  // Fallback: calculate from completed holes.
  if (Array.isArray(round.Holes) && round.Holes.length > 0) {
    const validHoleScores = round.Holes
      .map((hole: any) => hole.ToPar)
      .filter(
        (value: unknown): value is number =>
          typeof value === "number" &&
          Number.isFinite(value) &&
          value >= -5 &&
          value <= 10
      );

    if (validHoleScores.length === 0) return null;

    const scoreToPar = validHoleScores.reduce(
      (total: number, score: number) => total + score,
      0
    );

    return isValidToPar(scoreToPar) ? scoreToPar : null;
  }

  return null;
}

function getTournamentScore(
  player: any,
  rounds: Array<number | null>
): number | null {
  // SportsDataIO TotalScore should be relative to par.
  if (isValidToPar(player.TotalScore)) {
    return player.TotalScore;
  }

  const completedRounds = rounds.filter(
    (score): score is number => score !== null
  );

  if (completedRounds.length === 0) return null;

  const calculatedTotal = completedRounds.reduce(
    (total, score) => total + score,
    0
  );

  return isValidToPar(calculatedTotal) ? calculatedTotal : null;
}

function getPlayerStatus(player: any): string {
  if (player.IsWithdrawn === true) return "withdrawn";
  if (player.IsDisqualified === true) return "disqualified";
  if (player.MadeCut === false || player.MadeCut === 0) return "cut";

  return "active";
}

export async function GET(request: Request) {
  try {
    const apiKey = process.env.SPORTSDATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing SPORTSDATA_API_KEY" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.sportsdata.io/golf/v2/json/Leaderboard/${TOURNAMENT_ID}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const responseBody = await response.text();

      console.error("SportsDataIO request failed:", {
        status: response.status,
        body: responseBody,
      });

      return NextResponse.json(
        {
          error: "SportsDataIO request failed",
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const players = Array.isArray(data?.Players) ? data.Players : [];

    if (players.length === 0) {
      return NextResponse.json(
        { error: "SportsDataIO returned no players" },
        { status: 502 }
      );
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ player: string; error: string }> = [];

    for (const player of players) {
      if (!player?.Name) {
        skippedCount++;
        continue;
      }

      const rounds = [
        getRoundScoreToPar(player, 1),
        getRoundScoreToPar(player, 2),
        getRoundScoreToPar(player, 3),
        getRoundScoreToPar(player, 4),
      ];

      const tournamentScore = getTournamentScore(player, rounds);

      /*
       * Skip a player if the API provides no usable score.
       * This preserves the existing database value instead of
       * replacing it with a misleading zero.
       */
      if (
        tournamentScore === null &&
        rounds.every((score) => score === null)
      ) {
        skippedCount++;
        continue;
      }

      const { data: updatedRows, error } = await supabase
        .from("golfers")
        .update({
          tournament_score: tournamentScore,
          round_1: rounds[0],
          round_2: rounds[1],
          round_3: rounds[2],
          round_4: rounds[3],
          status: getPlayerStatus(player),
        })
        .eq("event_id", EVENT_ID)
        .eq("name", player.Name)
        .select("id");

      if (error) {
        console.error(`Failed to update ${player.Name}:`, error);

        errors.push({
          player: player.Name,
          error: error.message,
        });

        continue;
      }

      if (!updatedRows || updatedRows.length === 0) {
        skippedCount++;
        continue;
      }

      updatedCount += updatedRows.length;
    }

    return NextResponse.json({
      success: errors.length === 0,
      tournament: data?.Tournament?.Name ?? null,
      tournamentId: TOURNAMENT_ID,
      eventId: EVENT_ID,
      playerCount: players.length,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.slice(0, 20),
      warning:
        "SportsDataIO trial data may be scrambled. Production scoring access is required for reliable live scores.",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Score synchronization failed:", error);

    return NextResponse.json(
      {
        error: "Score synchronization failed",
        message:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
