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

  const updates = await Promise.all(
    players.map(async (player: any) => {
      const totalScore =
        typeof player.TotalScore === "number" ? player.TotalScore : 0;

      return supabase
        .from("golfers")
        .update({
          tournament_score: totalScore,
          round_1: totalScore,
          round_2: 0,
          round_3: 0,
          round_4: 0,
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