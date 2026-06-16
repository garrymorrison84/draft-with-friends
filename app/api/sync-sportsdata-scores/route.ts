import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const tournamentId = 690;

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournamentId}?key=${apiKey}`
  );

  const data = await response.json();
  const players = data.Players || [];

  const updates = await Promise.all(
    players.map(async (player: any) => {
      const rounds = player.Rounds || [];

      const round1 = rounds.find((round: any) => round.Number === 1);
      const round2 = rounds.find((round: any) => round.Number === 2);
      const round3 = rounds.find((round: any) => round.Number === 3);
      const round4 = rounds.find((round: any) => round.Number === 4);

      return supabase
        .from("golfers")
        .update({
          tournament_score: player.TotalScore ?? 0,
          round_1: round1?.Score ?? 0,
          round_2: round2?.Score ?? 0,
          round_3: round3?.Score ?? 0,
          round_4: round4?.Score ?? 0,
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
