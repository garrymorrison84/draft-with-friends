import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const tournamentId = 690;
  const eventId = "USOPEN2026";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing SPORTSDATA_API_KEY" },
      { status: 500 }
    );
  }

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournamentId}?key=${apiKey}`,
    { cache: "no-store" }
  );

  const data = await response.json();
  const players = data.Players || [];

  function getRoundScoreToPar(player: any, roundNumber: number) {
    const round = player.Rounds?.find((r: any) => r.Number === roundNumber);

    if (!round) return 0;

    if (
      typeof round.Score === "number" &&
      typeof round.Par === "number" &&
      round.Score > 0 &&
      round.Par > 0
    ) {
      return round.Score - round.Par;
    }

    const holes = round.Holes || [];

    return holes.reduce((sum: number, hole: any) => {
      return sum + (typeof hole.ToPar === "number" ? hole.ToPar : 0);
    }, 0);
  }

  const updates = await Promise.all(
    players.map(async (player: any) => {
      const round1 = getRoundScoreToPar(player, 1);
      const round2 = getRoundScoreToPar(player, 2);
      const round3 = getRoundScoreToPar(player, 3);
      const round4 = getRoundScoreToPar(player, 4);

      const calculatedTotal = round1 + round2 + round3 + round4;

      const total =
        typeof player.TotalScore === "number"
          ? player.TotalScore
          : calculatedTotal;

      return supabase
        .from("golfers")
        .update({
          tournament_score: total,
          round_1: round1,
          round_2: round2,
          round_3: round3,
          round_4: round4,
        })
        .eq("event_id", eventId)
        .eq("name", player.Name);
    })
  );

  await supabase
    .from("golfers")
    .update({
      tournament_score: 2,
      round_1: 2,
      round_2: 0,
      round_3: 0,
      round_4: 0,
    })
    .eq("event_id", eventId)
    .eq("name", "Sungjae Im");

  return NextResponse.json({
    tournament: data.Tournament?.Name,
    playerCount: players.length,
    updatedCount: updates.length,
  });
}
