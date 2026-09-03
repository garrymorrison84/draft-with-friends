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
  const response = await fetch(`/api/football/pools?id=${encodeURIComponent(poolId)}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = await response.json();
  const poolRow = data.pool as PlatformPoolRow | undefined;
  const pickRows = data.picks as PlatformPickRow[] | undefined;
  if (!poolRow) return null;

  const pool = restorePool(poolRow as PlatformPoolRow);
  if (!pool) return null;

  const picks = (pickRows || [])
    .map(restorePick)
    .filter((pick): pick is FootballDraftPick => pick !== null);

  return { pool, picks };
}

export async function persistFootballHistory(
  pool: FootballPool,
  picks: FootballDraftPick[]
) {
  const response = await fetch("/api/football/pools", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pool, picks }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Could not save shared football pool.");
  }
}
