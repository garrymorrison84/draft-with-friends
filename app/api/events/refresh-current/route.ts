import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SportsDataTournament = {
  TournamentID: number;
  Name: string;
  StartDate?: string;
  EndDate?: string;
  IsOver?: boolean;
  IsInProgress?: boolean;
};

function toDateOnly(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function daysFromToday(value?: string) {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return Number.POSITIVE_INFINITY;

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  const eventDate = new Date(
    dateOnly + "T00:00:00.000Z"
  ).getTime();

  return Math.round((eventDate - todayUtc) / 86400000);
}

function eventIdForTournament(tournament: SportsDataTournament) {
  const year =
    toDateOnly(tournament.StartDate)?.slice(0, 4) ||
    String(new Date().getUTCFullYear());
  const slug = tournament.Name.toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return slug + "_" + year;
}

function pickCurrentTournament(tournaments: SportsDataTournament[]) {
  const candidates = tournaments
    .filter((tournament) => tournament.Name && !tournament.IsOver)
    .map((tournament) => ({
      tournament,
      startsIn: daysFromToday(tournament.StartDate),
      endsIn: daysFromToday(tournament.EndDate),
    }))
    .filter(({ startsIn, endsIn }) => startsIn <= 7 && endsIn >= -1)
    .sort((a, b) => {
      const aActive = a.startsIn <= 0 && a.endsIn >= 0 ? 0 : 1;
      const bActive = b.startsIn <= 0 && b.endsIn >= 0 ? 0 : 1;
      return aActive - bActive || Math.abs(a.startsIn) - Math.abs(b.startsIn);
    });

  return candidates[0]?.tournament || null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace("+", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asInteger(value: unknown) {
  const number = asNumber(value);

  return number === null ? null : Math.round(number);
}

function getPlayerOdds(player: any) {
  return (
    asNumber(player.OddsToWin) ??
    asNumber(player.Odds) ??
    asNumber(player.BettingOdds) ??
    asNumber(player.DraftKingsOdds) ??
    asNumber(player.FanDuelOdds) ??
    asNumber(player.VegasOdds)
  );
}

async function importField(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>["client"]>,
  apiKey: string,
  eventId: string,
  tournamentId: number
) {
  const response = await fetch(
    "https://api.sportsdata.io/golf/v2/json/Leaderboard/" +
      tournamentId +
      "?key=" +
      apiKey,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(
      "SportsDataIO leaderboard request failed: " + response.status
    );
  }

  const data = await response.json();
  const players = Array.isArray(data.Players) ? data.Players : [];

  const golfersToUpsert = players
    .filter((player: any) => player.Name)
    .map((player: any) => {
      const odds = getPlayerOdds(player);

      return {
        event_id: eventId,
        name: player.Name,
        world_rank: asInteger(player.WorldGolfRank),
        odds,
        odds_sort: odds,
        vegas_odds: odds === null ? null : "+" + odds,
        tournament_score: null,
        round_1: null,
        round_2: null,
        round_3: null,
        round_4: null,
      };
    });

  if (golfersToUpsert.length === 0) {
    return { importedCount: 0, playerCount: players.length };
  }

  const { data: upsertedGolfers, error } = await supabaseAdmin
    .from("golfers")
    .upsert(golfersToUpsert, { onConflict: "event_id,name" })
    .select("id,event_id,name");

  if (error) {
    throw new Error("Failed to import golfers: " + error.message);
  }

  return {
    importedCount: upsertedGolfers?.length || 0,
    playerCount: players.length,
  };
}

export async function GET() {
  const { client: supabaseAdmin, error: adminError } = getSupabaseAdmin();

  if (adminError || !supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: adminError || "Missing Supabase admin client" },
      { status: 500 }
    );
  }
  const apiKey = process.env.SPORTSDATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Missing SPORTSDATA_API_KEY" },
      { status: 500 }
    );
  }

  const response = await fetch(
    "https://api.sportsdata.io/golf/v2/json/Tournaments?key=" + apiKey,
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

  const tournaments = (await response.json()) as SportsDataTournament[];
  const tournament = pickCurrentTournament(tournaments);

  if (!tournament) {
    return NextResponse.json(
      { success: false, error: "No current tournament found for this week." },
      { status: 404 }
    );
  }

  const eventId = eventIdForTournament(tournament);
  const startDate = toDateOnly(tournament.StartDate);
  const endDate = toDateOnly(tournament.EndDate);

  const { error: deactivateError } = await supabaseAdmin
    .from("events")
    .update({ is_active: false })
    .neq("id", eventId);

  if (deactivateError) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to deactivate old events.",
        details: deactivateError,
      },
      { status: 500 }
    );
  }

  const { data: activeEvent, error: upsertError } = await supabaseAdmin
    .from("events")
    .upsert(
      {
        id: eventId,
        name: tournament.Name,
        sportsdata_tournament_id: tournament.TournamentID,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      },
      { onConflict: "id" }
    )
    .select("id,name,sportsdata_tournament_id,start_date,end_date,is_active")
    .single();

  if (upsertError || !activeEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upsert active event.",
        details: upsertError,
      },
      { status: 500 }
    );
  }

  try {
    const fieldImport = await importField(
      supabaseAdmin,
      apiKey,
      eventId,
      tournament.TournamentID
    );

    return NextResponse.json({
      success: true,
      activeEvent,
      fieldImport,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        activeEvent,
        error: error instanceof Error ? error.message : "Field import failed.",
      },
      { status: 500 }
    );
  }
}
