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

  function roundToPar(player: any, roundNumber: number) {
    const round = player.Rounds?.find((r: any) => r.Number === roundNumber);
    const holes = round?.Holes || [];

    return holes.reduce((sum: number, hole: any) => {
      return sum + (typeof hole.ToPar === "number" ? hole.ToPar : 0);
    }, 0);
  }

  const updates = await Promise.all(
    players.map(async (player: any) => {
      const round1 = roundToPar(player, 1);
      const round2 = roundToPar(player, 2);
      const round3 = roundToPar(player, 3);
      const round4 = roundToPar(player, 4);

      const total = round1 + round2 + round3 + round4;

      return supabase
        .from("golfers")
        .update({
          tournament_score: total,
          round_1: round1,
          round_2: round2,
          round_3: round3,
          round_4: round4,
        })
        .eq("event_id", "USOPEN2026")
        .ilike("name", player.Name);
    })
  );

  return NextResponse.json({
    tournament: data.Tournament?.Name,
    playerCount: players.length,
    updatedCount: updates.length,
  });
}
