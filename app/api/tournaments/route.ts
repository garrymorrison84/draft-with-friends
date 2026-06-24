import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.SPORTSDATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Missing SPORTSDATA_API_KEY" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase() || "";

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${apiKey}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "SportsDataIO tournaments request failed",
        status: response.status,
        statusText: response.statusText,
      },
      { status: 502 }
    );
  }

  const data = await response.json();

  const filtered = query
    ? data.filter((t: any) => t.Name?.toLowerCase().includes(query))
    : data;

  return NextResponse.json({
    success: true,
    query,
    count: filtered.length,
    tournaments: filtered.map((t: any) => ({
      tournamentId: t.TournamentID,
      name: t.Name,
      startDate: t.StartDate,
      endDate: t.EndDate,
      isOver: t.IsOver,
      isInProgress: t.IsInProgress,
      venue: t.Venue,
      location: t.Location,
    })),
  });
}