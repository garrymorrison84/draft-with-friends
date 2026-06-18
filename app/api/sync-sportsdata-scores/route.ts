import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const tournamentId = 690;

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournamentId}?key=${apiKey}`,
    { cache: "no-store" }
  );

  const data = await response.json();
  const players = data.Players || [];

  const samplePlayers = players
    .filter((player: any) =>
      ["Jon Rahm", "Tommy Fleetwood", "Aaron Rai", "Scottie Scheffler"].includes(
        player.Name
      )
    )
    .map((player: any) => ({
      Name: player.Name,
      TotalScore: player.TotalScore,
      TotalStrokes: player.TotalStrokes,
      TotalThrough: player.TotalThrough,
      TournamentStatus: player.TournamentStatus,
      Score: player.Score,
      Round: player.Round,
      Rounds: player.Rounds,
    }));

  return NextResponse.json({
    tournament: data.Tournament?.Name,
    samplePlayers,
  });
}