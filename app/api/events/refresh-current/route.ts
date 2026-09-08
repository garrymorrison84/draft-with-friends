import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type SportsDataTournament = {
  TournamentID: number | null;
  Name: string;
  StartDate?: string;
  EndDate?: string;
  IsOver?: boolean;
  IsInProgress?: boolean;
};

// Official PGA TOUR fall events that fit the app's individual stroke-play format.
// Team and match-play events are intentionally excluded from automatic rotation.
const officialFallSchedule: SportsDataTournament[] = [
  { TournamentID: -401850914, Name: "Biltmore Championship Asheville", StartDate: "2026-09-17", EndDate: "2026-09-20" },
  { TournamentID: -401850915, Name: "Bank of Utah Championship", StartDate: "2026-10-01", EndDate: "2026-10-04" },
  { TournamentID: -401850916, Name: "Baycurrent Classic", StartDate: "2026-10-08", EndDate: "2026-10-11" },
  { TournamentID: -401850917, Name: "Butterfield Bermuda Championship", StartDate: "2026-10-22", EndDate: "2026-10-25" },
  { TournamentID: -401850978, Name: "VidantaWorld Mexico Open", StartDate: "2026-10-29", EndDate: "2026-11-01" },
  { TournamentID: -401850979, Name: "World Wide Technology Championship", StartDate: "2026-11-05", EndDate: "2026-11-08" },
  { TournamentID: -401850980, Name: "Good Good Championship", StartDate: "2026-11-12", EndDate: "2026-11-15" },
  { TournamentID: -401850981, Name: "The RSM Classic", StartDate: "2026-11-19", EndDate: "2026-11-22" },
  { TournamentID: -401850982, Name: "Hero World Challenge", StartDate: "2026-12-03", EndDate: "2026-12-06" },
];

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

function pickOfficialFallback() {
  return officialFallSchedule
    .map((tournament) => ({
      tournament,
      startsIn: daysFromToday(tournament.StartDate),
      endsIn: daysFromToday(tournament.EndDate),
    }))
    .filter(({ startsIn, endsIn }) => startsIn <= 14 && endsIn >= -1)
    .sort((a, b) => {
      const aActive = a.startsIn <= 0 && a.endsIn >= 0 ? 0 : 1;
      const bActive = b.startsIn <= 0 && b.endsIn >= 0 ? 0 : 1;
      return aActive - bActive || Math.abs(a.startsIn) - Math.abs(b.startsIn);
    })[0]?.tournament || null;
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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

function asAmericanOdds(value: unknown) {
  const odds = asNumber(value);

  if (odds === null) return null;
  if (odds > 0 && odds <= 1000) return Math.round(odds * 100);

  return Math.round(odds);
}

function getPlayerOdds(player: any) {
  return player.OddsToWin;
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
      const odds = asAmericanOdds(getPlayerOdds(player));

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

  let tournaments: SportsDataTournament[] = [];
  let providerError: string | null = null;

  if (apiKey) {
    try {
      const response = await fetch(
        "https://api.sportsdata.io/golf/v2/json/Tournaments?key=" + apiKey,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error("SportsDataIO tournaments request failed: " + response.status);
      }
      tournaments = (await response.json()) as SportsDataTournament[];
    } catch (error) {
      providerError = error instanceof Error ? error.message : "Tournament provider unavailable.";
    }
  } else {
    providerError = "Missing SPORTSDATA_API_KEY";
  }

  let tournament = pickCurrentTournament(tournaments);
  if (!tournament) {
    const officialEvent = pickOfficialFallback();
    if (officialEvent) {
      const providerMatch = tournaments.find(
        (candidate) => normalizedName(candidate.Name) === normalizedName(officialEvent.Name)
      );
      tournament = providerMatch
        ? { ...officialEvent, ...providerMatch }
        : officialEvent;
    }
  }

  if (!tournament) {
    return NextResponse.json(
      { success: false, error: "No supported PGA TOUR event found within the next 14 days." },
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

  if (!apiKey || tournament.TournamentID === null || tournament.TournamentID < 0) {
    return NextResponse.json({
      success: true,
      activeEvent,
      fieldImport: {
        importedCount: 0,
        playerCount: 0,
        pendingProviderField: true,
      },
      providerError,
      updatedAt: new Date().toISOString(),
    });
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
