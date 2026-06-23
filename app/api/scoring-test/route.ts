import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const tournamentId = 690;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing SPORTSDATA_API_KEY",
      },
      { status: 500 }
    );
  }

  const sportsDataUrl = `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournamentId}?key=${apiKey}`;

  const response = await fetch(sportsDataUrl, {
    cache: "no-store",
  });

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

  const samplePlayers = players.slice(0, 15).map((player: any) => ({
    sportsDataPlayerId: player.PlayerID,
    name: player.Name,
    totalScore: player.TotalScore,
    position: player.Position,
    status: player.Status,
    rounds: player.Rounds?.map((round: any) => ({
      number: round.Number,
      score: round.Score,
      par: round.Par,
      holesPlayed: round.Holes?.length || 0,
    })),
  }));

  const suspiciousPlayers = samplePlayers.filter((player: any) => {
    const score = player.totalScore;

    return (
      typeof score === "number" &&
      (!Number.isInteger(score) || score < -40 || score > 40)
    );
  });

  return NextResponse.json({
    success: true,
    mode: "READ_ONLY_NO_DATABASE_WRITES",
    tournament: data.Tournament?.Name,
    tournamentId,
    playerCount: players.length,
    suspiciousCount: suspiciousPlayers.length,
    suspiciousPlayers,
    samplePlayers,
  });
}
