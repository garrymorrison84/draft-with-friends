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

  const scoreToPar = (round: any) => {
    if (!round) return 0;

    const score = Number(round.Score ?? 0);
    const par = Number(round.Par ?? 0);

    if (!score || !par) return 0;

    return score - par;
  };

  const updates = await Promise.all(
    players.map(async (player: any) => {
      const rounds = player.Rounds || [];

      const round1 = rounds.find((round: any) => round.Number === 1);
      const round2 = rounds.find((round: any) => round.Number === 2);
      const round3 = rounds.find((round: any) => round.Number === 3);
      const round4 = rounds.find((round: any) => round.Number === 4);

      const round1Score = scoreToPar(round1);
      const round2Score = scoreToPar(round2);
      const round3Score = scoreToPar(round3);
      const round4Score = scoreToPar(round4);

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