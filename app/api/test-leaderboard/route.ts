import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const tournamentId = 690;

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournamentId}?key=${apiKey}`
  );

  const data = await response.json();

  const players = data.Players?.slice(0, 5).map((player: any) => ({
    Name: player.Name,
    Rank: player.Rank,
    TotalScore: player.TotalScore,
    TotalStrokes: player.TotalStrokes,
    TotalThrough: player.TotalThrough,
    TournamentStatus: player.TournamentStatus,
    Rounds: player.Rounds,
  }));

  return NextResponse.json({
    status: response.status,
    ok: response.ok,
    tournament: data.Tournament?.Name,
    playerCount: data.Players?.length,
    players,
  });
}
