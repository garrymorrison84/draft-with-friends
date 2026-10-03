import type { NflDraftPick, NflPlayer, NflPool } from "./storage";
import { supabase } from "../../lib/supabase";

type PlatformPoolRow = {
  id: string;
  owner_id?: string | null;
  settings: unknown;
};

type PlatformPickRow = {
  pick_index: number;
  selection_id: string;
  selection_snapshot: unknown;
  created_at?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function restorePool(row: PlatformPoolRow): NflPool | null {
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
    ...(settings as Partial<NflPool>),
    id: row.id,
    ownerId:
      typeof row.owner_id === "string"
        ? row.owner_id
        : typeof settings.ownerId === "string"
          ? settings.ownerId
          : undefined,
    poolName:
      typeof settings.poolName === "string"
        ? settings.poolName
        : "NFL Pool",
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

function restorePick(row: PlatformPickRow): NflDraftPick | null {
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

  const playerSnapshot = isRecord(snapshot.playerSnapshot)
    ? snapshot.playerSnapshot as unknown as import("./storage").NflPlayer
    : undefined;
  return { playerId, team, pickNumber, pickedAt: row.created_at, playerSnapshot };
}

export async function loadPersistedNflHistory(poolId: string) {
  const response = await fetch(`/api/nfl/pools?id=${encodeURIComponent(poolId)}`, {
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
    .filter((pick): pick is NflDraftPick => pick !== null);

  return {
    pool,
    picks,
    serverNow: typeof data.serverNow === "string" ? data.serverNow : undefined,
  };
}

export async function persistNflHistory(
  pool: NflPool,
  picks: NflDraftPick[]
) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ pool, picks }),
    keepalive: true,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Could not save shared NFL pool.");
  }
}

export async function updatePersistedNflScoring(
  pool: NflPool,
  scoring: NonNullable<NflPool["scoring"]>
) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      action: "update-scoring",
      poolId: pool.id,
      pool,
      scoring,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Could not update this pool's scoring.");
  }
  return data.pool as NflPool;
}

export async function updateCommissionerNflTeamNames({
  poolId,
  teamNames,
}: {
  poolId: string;
  teamNames: string[];
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      action: "commissioner-update-team-names",
      poolId,
      teamNames,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Could not update the shared team names.");
  }
  return data.pool as NflPool;
}

export async function updateCommissionerNflDraftPick({
  poolId,
  pickNumber,
  player,
}: {
  poolId: string;
  pickNumber: number;
  player: NflPlayer;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      action: "commissioner-update-draft-pick",
      poolId,
      pickNumber,
      playerId: player.id,
      playerSnapshot: player,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Could not update the shared draft pick.");
  }
  return data;
}

export async function updateCommissionerNflDraftTime({
  poolId,
  scheduledDraftAt,
  timeZone,
}: {
  poolId: string;
  scheduledDraftAt: string;
  timeZone: import("../../lib/draftTiming").DraftTimeZone;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      action: "commissioner-update-draft-time",
      poolId,
      scheduledDraftAt,
      timeZone,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Could not update the shared draft time.");
  }
  return data.pool as NflPool;
}

export async function submitNflPick({
  poolId,
  playerId,
  team,
  expectedPickIndex,
  playerSnapshot,
  automatic = false,
}: {
  poolId: string;
  playerId: string;
  team: string;
  expectedPickIndex: number;
  playerSnapshot: import("./storage").NflPlayer;
  automatic?: boolean;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      poolId,
      playerId,
      team,
      expectedPickIndex,
      playerSnapshot,
      automatic,
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || "Could not save this draft pick.") as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function setNflDraftPause({
  poolId,
  paused,
  remaining,
}: {
  poolId: string;
  paused: boolean;
  remaining: number;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ action: "set-draft-pause", poolId, paused, remaining }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Could not update the shared draft clock.");
  return data.pool as NflPool;
}

export async function undoLastNflPick(poolId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const response = await fetch("/api/nfl/pools", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ action: "undo-last-pick", poolId }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Could not undo the last pick.");
  return data;
}
