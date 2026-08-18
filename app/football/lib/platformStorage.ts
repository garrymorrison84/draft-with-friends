import { supabase } from "../../lib/supabase";
import type { FootballDraftPick, FootballPool } from "./storage";

type PlatformPoolRow = {
  id: string;
  settings: unknown;
};

type PlatformPickRow = {
  pick_index: number;
  selection_id: string;
  selection_snapshot: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function restorePool(row: PlatformPoolRow): FootballPool | null {
  if (!isRecord(row.settings)) return null;

  const settings = row.settings;
  const teamNames = Array.isArray(settings.teamNames)
    ? settings.teamNames.filter((name): name is string => typeof name === "string")
    : [];
  const draftOrder = Array.isArray(settings.draftOrder)
    ? settings.draftOrder.filter((name): name is string => typeof name === "string")
    : teamNames;

  if (teamNames.length === 0 || draftOrder.length === 0) return null;

  return {
    ...(settings as Partial<FootballPool>),
    id: row.id,
    poolName:
      typeof settings.poolName === "string"
        ? settings.poolName
        : "College Football Pool",
    season: typeof settings.season === "string" ? settings.season : "",
    numberOfTeams:
      typeof settings.numberOfTeams === "number"
        ? settings.numberOfTeams
        : teamNames.length,
    teamNames,
    draftOrder,
    createdAt:
      typeof settings.createdAt === "string" ? settings.createdAt : "",
  };
}

function restorePick(row: PlatformPickRow): FootballDraftPick | null {
  const snapshot = isRecord(row.selection_snapshot)
    ? row.selection_snapshot
    : {};
  const playerId =
    typeof snapshot.playerId === "string"
      ? snapshot.playerId
      : row.selection_id;
  const team = typeof snapshot.team === "string" ? snapshot.team : "";
  const pickNumber =
    typeof snapshot.pickNumber === "number"
      ? snapshot.pickNumber
      : row.pick_index + 1;

  if (!playerId || !team) return null;

  return { playerId, team, pickNumber };
}

export async function loadPersistedFootballHistory(poolId: string) {
  const [{ data: poolRow, error: poolError }, { data: pickRows, error: picksError }] =
    await Promise.all([
      supabase
        .from("platform_pools")
        .select("id,settings")
        .eq("id", poolId)
        .eq("pool_type", "college_fantasy")
        .maybeSingle(),
      supabase
        .from("platform_draft_picks")
        .select("pick_index,selection_id,selection_snapshot")
        .eq("pool_id", poolId)
        .order("pick_index", { ascending: true }),
    ]);

  if (poolError || picksError || !poolRow) {
    if (poolError) console.error(poolError);
    if (picksError) console.error(picksError);
    return null;
  }

  const pool = restorePool(poolRow as PlatformPoolRow);
  if (!pool) return null;

  const picks = ((pickRows || []) as PlatformPickRow[])
    .map(restorePick)
    .filter((pick): pick is FootballDraftPick => pick !== null);

  return { pool, picks };
}
