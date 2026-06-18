import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const tournamentId = 690;

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

  const getRoundToPar = (roundNumber: number, player: any) => {
    const round = player.Rounds?.find((r: any) => r.Number === roundNumber);
    const holes = round?.Holes || [];

    return holes.reduce((sum: number, hole: any) => {
      return sum + (typeof hole.ToPar === "number" ? hole.ToPar : 0);
    }, 0);
  };

  const updates = await Promise.all(
    players.map(async (player: any) => {
      const round1Score = getRoundToPar(1, player);
      const round2Score = getRoundToPar(2, player);
      const round3Score = getRoundToPar(3, player);
      const round4Score = getRoundToPar(4, player);

      const totalScore =
        round1Score + round2Score + round3Score + round4Score;

      return supabase
        .from("golfers")
        .update({
          tournament_score: totalScore,
          round_1: round1Score,
          round_2: round2Score,
          round_3: round3Score,
          round_4: round4Score,
        })
        .eq("event_id", "USOPEN2026")
        .eq("name", player.Name);
    })
  );

  return NextResponse.json({
    tournament: data.Tournament?.Name,
    playerCount: players.length,
    updatedCount: updates.length,
  });
}
