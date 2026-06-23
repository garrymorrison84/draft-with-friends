import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const tournamentId = 690;

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

  const data = await response.json();

  const samplePlayers = (data.Players || []).slice(0, 8).map((player: any) => ({
    name: player.Name,
    totalScore: player.TotalScore,
    score: player.Score,
    position: player.Position,
    status: player.Status,
    rounds: player.Rounds?.map((round: any) => ({
      number: round.Number,
      score: round.Score,
      par: round.Par,
      holes: round.Holes?.length,
    })),
  }));

  return NextResponse.json({
    success: true,
    tournament: data.Tournament?.Name,
    tournamentId,
    playerCount: data.Players?.length || 0,
    samplePlayers,
  });
}
