import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Missing SPORTSDATA_API_KEY" },
      { status: 500 }
    );
  }

  const { data: activeEvent, error: eventError } = await supabase
    .from("events")
    .select("id, name, sportsdata_tournament_id")
    .eq("is_active", true)
    .single();

  if (eventError || !activeEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "No active golf event found in Supabase.",
        details: eventError,
      },
      { status: 500 }
    );
  }

  const tournamentId = activeEvent.sportsdata_tournament_id;
  const eventId = activeEvent.id;

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournamentId}?key=${apiKey}`,
    { cache: "no-store" }
  );

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

  const golfersToUpsert = players
    .filter((player: any) => player.Name)
    .map((player: any) => ({
      event_id: eventId,
      name: player.Name,
      world_rank:
        typeof player.WorldGolfRank === "number"
          ? player.WorldGolfRank
          : null,
      tournament_score: null,
      round_1: null,
      round_2: null,
      round_3: null,
      round_4: null,
    }));

  const { data: upsertedGolfers, error: upsertError } = await supabase
    .from("golfers")
    .upsert(golfersToUpsert, {
      onConflict: "event_id,name",
    })
    .select("id, event_id, name");

  if (upsertError) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import golfers into Supabase.",
        details: upsertError,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    route: "import-field",
    tournament: data.Tournament?.Name,
    appEventName: activeEvent.name,
    tournamentId,
    eventId,
    playerCount: players.length,
    importedCount: upsertedGolfers?.length || 0,
    sampleGolfers: upsertedGolfers?.slice(0, 10) || [],
    updatedAt: new Date().toISOString(),
  });
}
