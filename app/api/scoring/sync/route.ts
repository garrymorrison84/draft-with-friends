import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

function roundScoreToPar(round: any): number | null {
  if (!round) return null;

  if (
    typeof round.Score === "number" &&
    typeof round.Par === "number" &&
    round.Score > 0 &&
    round.Par > 0
  ) {
    return round.Score - round.Par;
  }

  return null;
}

function isValidTotalScore(score: number | null) {
  if (score === null) return false;
  return Number.isInteger(score) && score >= -40 && score <= 40;
}

function isValidRoundScore(score: number | null) {
  if (score === null) return true;
  return Number.isInteger(score) && score >= -20 && score <= 20;
}

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
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

    const completedRoundScores = [round1, round2, round3, round4].filter(
      (score): score is number => typeof score === "number"
    );

    const calculatedTotal =
      completedRoundScores.length > 0
        ? completedRoundScores.reduce((sum, score) => sum + score, 0)
        : null;

    return {
      name: player.Name,
      sportsdata_total_score: player.TotalScore,
      tournament_score: calculatedTotal,
      round_1: round1,
      round_2: round2,
      round_3: round3,
      round_4: round4,
      completed_round_count: completedRoundScores.length,
    };
  });

  const invalidPlayers = preparedPlayers.filter((player: any) => {
    return (
      !isValidTotalScore(player.tournament_score) ||
      !isValidRoundScore(player.round_1) ||
      !isValidRoundScore(player.round_2) ||
      !isValidRoundScore(player.round_3) ||
      !isValidRoundScore(player.round_4)
    );
  });

  if (invalidPlayers.length > 0) {
    return NextResponse.json(
      {
        success: false,
        scoringVersion: "round-sum-v2",
        error: "Validation failed. No database updates were made.",
        invalidCount: invalidPlayers.length,
        invalidPlayers: invalidPlayers.slice(0, 25),
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
        tournament_score: player.tournament_score,
        round_1: player.round_1,
        round_2: player.round_2,
        round_3: player.round_3,
        round_4: player.round_4,
        error,
      };
    })
  );

  const errors = updates.filter((update: any) => update.error);

  const watchedNames = [
    "Sungjae Im",
    "Ryan Gerard",
    "Bryson DeChambeau",
    "Rickie Fowler",
    "Gary Woodland",
    "Charley Hoffman",
    "Charlie Hoffman",
  ];

  const watchedPlayers = preparedPlayers.filter((player: any) =>
    watchedNames.includes(player.name)
  );

  return NextResponse.json({
    success: errors.length === 0,
    scoringVersion: "round-sum-v2",
    tournament: data.Tournament?.Name,
    tournamentId,
    eventId,
    playerCount: players.length,
    updatedCount: updates.length - errors.length,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
    watchedPlayers,
    updatedAt: new Date().toISOString(),
  });
}
