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

function isValidScore(score: number | null) {
  if (score === null) return false;
  return Number.isInteger(score) && score >= -40 && score <= 80;
}

function hasWeekendScore(round3: number | null, round4: number | null) {
  return typeof round3 === "number" || typeof round4 === "number";
}

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Missing SPORTSDATA_API_KEY" },
      { status: 500 }
    );
  }

  const { data: activeEvent, error: eventError } = await supabase
    .from("events")
    .select("id, name, sportsdata_tournament_id")
    .eq("is_active", true)
    .single();

  if (eventError || !activeEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "No active golf event found in Supabase.",
        details: eventError,
      },
      { status: 500 }
    );
  }

  const tournamentId = activeEvent.sportsdata_tournament_id;
  const eventId = activeEvent.id;

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

    const rawTotal =
      completedRoundScores.length > 0
        ? completedRoundScores.reduce((sum, score) => sum + score, 0)
        : null;

    return {
      name: player.Name,
      sportsdata_total_score: player.TotalScore,
      raw_total_score: rawTotal,
      tournament_score: rawTotal,
      round_1: round1,
      round_2: round2,
      round_3: round3,
      round_4: round4,
      completed_round_count: completedRoundScores.length,
      has_weekend_score: hasWeekendScore(round3, round4),
    };
  });

  const playersWithScores = preparedPlayers.filter(
    (player: any) => player.completed_round_count > 0
  );

  const skippedPlayers = preparedPlayers.filter(
    (player: any) => player.completed_round_count === 0
  );

  const weekendHasStarted = playersWithScores.some(
    (player: any) => player.has_weekend_score
  );

  let worstMadeCutScore: number | null = null;
  let cutPenaltyScore: number | null = null;

  const scoredPlayers = playersWithScores.map((player: any) => {
    return {
      ...player,
      made_cut: weekendHasStarted ? player.has_weekend_score : true,
    };
  });

  if (weekendHasStarted) {
    const madeCutPlayers = scoredPlayers.filter(
      (player: any) =>
        player.made_cut && typeof player.raw_total_score === "number"
    );

    if (madeCutPlayers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          scoringVersion: "active-event-cut-penalty-v2",
          error: "Weekend scoring started, but no made-cut players were found.",
        },
        { status: 422 }
      );
    }

    worstMadeCutScore = Math.max(
      ...madeCutPlayers.map((player: any) => player.raw_total_score)
    );

    cutPenaltyScore = worstMadeCutScore + 1;
  }

  const finalPlayers = scoredPlayers.map((player: any) => {
    if (weekendHasStarted && !player.made_cut && cutPenaltyScore !== null) {
      return {
        ...player,
        tournament_score: cutPenaltyScore,
      };
    }

    return player;
  });

  const invalidPlayers = finalPlayers.filter((player: any) => {
    return !isValidScore(player.tournament_score);
  });

  if (invalidPlayers.length > 0) {
    return NextResponse.json(
      {
        success: false,
        scoringVersion: "active-event-cut-penalty-v2",
        error: "Validation failed. No database updates were made.",
        invalidCount: invalidPlayers.length,
        invalidPlayers: invalidPlayers.slice(0, 25),
      },
      { status: 422 }
    );
  }

  const updates = await Promise.all(
    finalPlayers.map(async (player: any) => {
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
        raw_total_score: player.raw_total_score,
        made_cut: player.made_cut,
        error,
      };
    })
  );

  const errors = updates.filter((update: any) => update.error);

  return NextResponse.json({
    success: errors.length === 0,
    scoringVersion: "active-event-cut-penalty-v2",
    tournament: data.Tournament?.Name,
    appEventName: activeEvent.name,
    tournamentId,
    eventId,
    playerCount: players.length,
    updatedCount: updates.length - errors.length,
    skippedCount: skippedPlayers.length,
    skippedPlayers: skippedPlayers.slice(0, 20),
    weekendHasStarted,
    worstMadeCutScore,
    cutPenaltyScore,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
    updatedAt: new Date().toISOString(),
  });
}
