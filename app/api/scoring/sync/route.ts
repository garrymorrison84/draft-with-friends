import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

function roundScoreToPar(round: any) {
  if (
    typeof round?.Score === "number" &&
    typeof round?.Par === "number" &&
    round.Score > 0 &&
    round.Par > 0
  ) {
    return round.Score - round.Par;
  }

  return null;
}

function isValidGolfScore(score: number | null) {
  if (score === null) return true;
  return Number.isInteger(score) && score >= -40 && score <= 40;
}

export async function GET(request: Request) {  const apiKey = process.env.SPORTSDATA_API_KEY;
      const syncSecret = process.env.SCORING_SYNC_SECRET;
  const providedSecret = new URL(request.url).searchParams.get("secret");

  if (!syncSecret || providedSecret !== syncSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }
  const tournamentId = 690;
  const eventId = "USOPEN2026";

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Missing SPORTSDATA_API_KEY" },
      { status: 500 }
    );
  }

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournamentId}?key=${apiKey}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "SportsDataIO request failed",
        status: response.status,
        statusText: response.statusText,
      },
      { status: 502 }
    );
  }

  const data = await response.json();
  const players = data.Players || [];

  const preparedPlayers = players.map((player: any) => {
    const rounds = player.Rounds || [];

    const round1 = roundScoreToPar(rounds.find((r: any) => r.Number === 1));
    const round2 = roundScoreToPar(rounds.find((r: any) => r.Number === 2));
    const round3 = roundScoreToPar(rounds.find((r: any) => r.Number === 3));
    const round4 = roundScoreToPar(rounds.find((r: any) => r.Number === 4));

        const roundScores = [round1, round2, round3, round4].filter(
      (score): score is number => typeof score === "number"
    );

    const calculatedTotal =
      roundScores.length > 0
        ? roundScores.reduce((sum, score) => sum + score, 0)
        : typeof player.TotalScore === "number"
          ? player.TotalScore
          : null;

    return {
      name: player.Name,
      tournament_score: calculatedTotal,
      round_1: round1,
      round_2: round2,
      round_3: round3,
      round_4: round4,
    };

  const invalidPlayers = preparedPlayers.filter((player: any) => {
    return (
      !isValidGolfScore(player.tournament_score) ||
      !isValidGolfScore(player.round_1) ||
      !isValidGolfScore(player.round_2) ||
      !isValidGolfScore(player.round_3) ||
      !isValidGolfScore(player.round_4)
    );
  });

  if (invalidPlayers.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed. No database updates were made.",
        invalidCount: invalidPlayers.length,
        invalidPlayers: invalidPlayers.slice(0, 20),
      },
      { status: 422 }
    );
  }

  const updates = await Promise.all(
    preparedPlayers.map(async (player: any) => {
      const { error } = await supabase
        .from("golfers")
        .update({
          tournament_score: player.tournament_score,
          round_1: player.round_1,
          round_2: player.round_2,
          round_3: player.round_3,
          round_4: player.round_4,
        })
        .eq("event_id", eventId)
        .eq("name", player.name);

      return {
        name: player.name,
        error,
      };
    })
  );

  const errors = updates.filter((update: any) => update.error);

  return NextResponse.json({
    success: errors.length === 0,
    tournament: data.Tournament?.Name,
    tournamentId,
    eventId,
    playerCount: players.length,
    updatedCount: updates.length - errors.length,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
    updatedAt: new Date().toISOString(),
  });
}
