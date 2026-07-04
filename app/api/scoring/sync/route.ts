import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const MISSED_CUT_ROUND_PENALTY = 8;

type SupabaseGolfer = {
  id: number;
  event_id: string;
  name: string;
};

type PreparedPlayer = {
  supabaseGolfer: SupabaseGolfer;
  sportsDataName: string;
  sportsdata_total_score: number | null;
  tournament_score: number | null;
  round_1: number | null;
  round_2: number | null;
  round_3: number | null;
  round_4: number | null;
  completed_round_count: number;
  has_weekend_score: boolean;
};

function cleanName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactName(name: string) {
  return cleanName(name).replace(/\s+/g, "");
}

function nameKeys(name: string) {
  const cleaned = cleanName(name);
  const compact = cleaned.replace(/\s+/g, "");
  const parts = cleaned.split(" ").filter(Boolean);

  const keys = new Set<string>();
  keys.add(compact);

  // Handles "Sungjae Im" vs "Im Sung-jae"
  // Handles "Si Woo Kim" vs "Kim Si-woo"
  if (parts.length >= 2) {
    keys.add([...parts].reverse().join(""));
  }

  // Handles initials like "J T Poston" vs "JT Poston"
  if (parts.length >= 3 && parts[0].length === 1 && parts[1].length === 1) {
    keys.add(`${parts[0]}${parts[1]}${parts.slice(2).join("")}`);
  }

  return Array.from(keys);
}

function asNumber(value: any): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundScoreToPar(round: any): number | null {
  if (!round) return null;

  const score = asNumber(round.Score);
  const par = asNumber(round.Par);

  if (score === 0 && par === 0) {
    return null;
  }

  if (score !== null && par !== null && score > 0 && par > 0) {
    return score - par;
  }

  const holes = Array.isArray(round.Holes) ? round.Holes : [];

  if (holes.length > 0) {
    const holePars = holes
      .map((hole: any) => asNumber(hole.ToPar))
      .filter((value: number | null): value is number => value !== null);

    if (holePars.length > 0) {
      return holePars.reduce((sum: number, value: number) => sum + value, 0);
    }
  }

  return null;
}

function completedRoundCount(rounds: any[]) {
  return rounds.filter((round: any) => roundScoreToPar(round) !== null).length;
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

  const { data: activeEvent, error: activeEventError } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("is_active", true)
    .single();

  if (activeEventError || !activeEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "No active golf event found in Supabase.",
        details: activeEventError,
      },
      { status: 500 }
    );
  }

  const eventId = activeEvent.id;
  const tournamentId = activeEvent.sportsdata_tournament_id;

  const { data: dbGolfers, error: golfersError } = await supabaseAdmin
    .from("golfers")
    .select("id,event_id,name")
    .eq("event_id", eventId);

  if (golfersError || !dbGolfers) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not load golfers from Supabase.",
        details: golfersError,
      },
      { status: 500 }
    );
  }

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
      { status: 500 }
    );
  }

  const data = await response.json();
  const players = Array.isArray(data.Players) ? data.Players : [];

  const golferByKey = new Map<string, SupabaseGolfer>();

  for (const golfer of dbGolfers as SupabaseGolfer[]) {
    for (const key of nameKeys(golfer.name)) {
      golferByKey.set(key, golfer);
    }
  }

  const preparedPlayers: PreparedPlayer[] = [];
  const unmatchedSportsDataPlayers: any[] = [];

  for (const player of players) {
    const sportsDataName = player.Name;

    if (!sportsDataName) continue;

    let matchedGolfer: SupabaseGolfer | undefined;

    for (const key of nameKeys(sportsDataName)) {
      matchedGolfer = golferByKey.get(key);
      if (matchedGolfer) break;
    }

    if (!matchedGolfer) {
      unmatchedSportsDataPlayers.push({
        sportsdata_name: sportsDataName,
        keys: nameKeys(sportsDataName),
      });
      continue;
    }

    const rounds = Array.isArray(player.Rounds) ? player.Rounds : [];

    const round1 = roundScoreToPar(rounds.find((r: any) => r.Number === 1));
    const round2 = roundScoreToPar(rounds.find((r: any) => r.Number === 2));
    const round3 = roundScoreToPar(rounds.find((r: any) => r.Number === 3));
    const round4 = roundScoreToPar(rounds.find((r: any) => r.Number === 4));

    const completed = completedRoundCount(rounds);
    const calculatedTotal =
      (round1 ?? 0) + (round2 ?? 0) + (round3 ?? 0) + (round4 ?? 0);

    const sportsDataTotal = asNumber(player.TotalScore);

    const hasAnyScore =
      sportsDataTotal !== null ||
      round1 !== null ||
      round2 !== null ||
      round3 !== null ||
      round4 !== null;

    preparedPlayers.push({
      supabaseGolfer: matchedGolfer,
      sportsDataName,
      sportsdata_total_score: sportsDataTotal,
      tournament_score: hasAnyScore
        ? sportsDataTotal ?? calculatedTotal
        : null,
      round_1: round1,
      round_2: round2,
      round_3: round3,
      round_4: round4,
      completed_round_count: completed,
      has_weekend_score: round3 !== null || round4 !== null,
    });
  }

  const round3ScoringHasStarted = preparedPlayers.some(
    (player) => player.round_3 !== null
  );
  const round4ScoringHasStarted = preparedPlayers.some(
    (player) => player.round_4 !== null
  );
  const weekendScoringHasStarted = round3ScoringHasStarted || round4ScoringHasStarted;

  const finalPlayers = preparedPlayers.map((player) => {
    const shouldApplyCutPenalty =
      weekendScoringHasStarted &&
      player.completed_round_count >= 2 &&
      !player.has_weekend_score &&
      player.tournament_score !== null;

    const round3 = shouldApplyCutPenalty && round3ScoringHasStarted
      ? player.round_3 ?? MISSED_CUT_ROUND_PENALTY
      : player.round_3;
    const round4 = shouldApplyCutPenalty && round4ScoringHasStarted
      ? player.round_4 ?? MISSED_CUT_ROUND_PENALTY
      : player.round_4;
    const tournamentScore = shouldApplyCutPenalty
      ? (player.round_1 ?? 0) + (player.round_2 ?? 0) + (round3 ?? 0) + (round4 ?? 0)
      : player.tournament_score;

    return {
      ...player,
      tournament_score: tournamentScore,
      round_3: round3,
      round_4: round4,
    };
  });

  const updates = [];
  const errors: any[] = [];
  const skippedPlayers: any[] = [];

  for (const player of finalPlayers) {
    if (player.tournament_score === null) {
      skippedPlayers.push({
        name: player.supabaseGolfer.name,
        sportsdata_name: player.sportsDataName,
        reason: "No usable score returned yet from SportsData",
        round_1: player.round_1,
        round_2: player.round_2,
        round_3: player.round_3,
        round_4: player.round_4,
      });
      continue;
    }

    const { error } = await supabaseAdmin
      .from("golfers")
      .update({
        tournament_score: player.tournament_score,
        round_1: player.round_1,
        round_2: player.round_2,
        round_3: player.round_3,
        round_4: player.round_4,
      })
      .eq("id", player.supabaseGolfer.id);

    if (error) {
      errors.push({
        name: player.supabaseGolfer.name,
        sportsdata_name: player.sportsDataName,
        error: error.message,
      });
    } else {
      updates.push(player);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    scoringVersion: "active-event-normalized-name-sync-v5-round-aware-cut-penalty",
    tournament: data.Tournament?.Name,
    appEventName: activeEvent.name,
    tournamentId,
    eventId,
    sportsDataPlayerCount: players.length,
    appGolferCount: dbGolfers.length,
    updatedCount: updates.length,
    skippedCount: skippedPlayers.length,
    skippedPlayers: skippedPlayers.slice(0, 30),
    unmatchedSportsDataCount: unmatchedSportsDataPlayers.length,
    unmatchedSportsDataPlayers: unmatchedSportsDataPlayers.slice(0, 30),
    missedCutRoundPenalty: MISSED_CUT_ROUND_PENALTY,
    weekendScoringHasStarted,
    round3ScoringHasStarted,
    round4ScoringHasStarted,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
    watchedPlayers: finalPlayers
      .filter((player) =>
        [
          "J.T. Poston",
          "JT Poston",
          "Sungjae Im",
          "Si Woo Kim",
          "Nico Echavarria",
          "Ben James",
          "Alex Noren",
        ].includes(player.supabaseGolfer.name)
      )
      .map((player) => ({
        name: player.supabaseGolfer.name,
        sportsdata_name: player.sportsDataName,
        sportsdata_total_score: player.sportsdata_total_score,
        tournament_score: player.tournament_score,
        round_1: player.round_1,
        round_2: player.round_2,
        round_3: player.round_3,
        round_4: player.round_4,
        completed_round_count: player.completed_round_count,
        has_weekend_score: player.has_weekend_score,
      })),
    updatedAt: new Date().toISOString(),
  });
}
