import { supabase } from "./supabase";

export type SupabasePool = {
  id: string;
  pool_name: string;
  golf_event: string;
  event_id?: string | null;
  number_of_teams: number;
  golfers_per_team: number;
  scores_to_count: number;
  team_names: string[];
  draft_order: string[];
  owner_id?: string | null;
  draft_locked?: boolean | null;
  archived?: boolean | null;
};

export type DraftPickRow = {
  pool_id: string;
  team: string;
  golfer_name: string;
  golfer_rank: number;
  pick_index: number;
};

export async function getCurrentOrganizerUser() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error(error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function savePool(pool: SupabasePool) {
  const { data, error } = await supabase.from("pools").insert([pool]);

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}

export async function getOrganizerPools(ownerId: string) {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("owner_id", ownerId)
    .order("archived", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getPool(poolId: string) {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

export async function getOwnedPool(poolId: string, ownerId: string) {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("id", poolId)
    .eq("owner_id", ownerId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

export async function getPoolsByIds(poolIds: string[]) {
  if (poolIds.length === 0) return [];

  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .in("id", poolIds);

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function updatePool(
  poolId: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("pools")
    .update(updates)
    .eq("id", poolId)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}

export async function updateOwnedPool(
  poolId: string,
  ownerId: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("pools")
    .update(updates)
    .eq("id", poolId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}

export async function deletePool(poolId: string) {
  const { error: picksError } = await supabase
    .from("draft_picks")
    .delete()
    .eq("pool_id", poolId);

  if (picksError) {
    console.error(picksError);
    throw picksError;
  }

  const { error } = await supabase.from("pools").delete().eq("id", poolId);

  if (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteOwnedPool(poolId: string, ownerId: string) {
  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("id")
    .eq("id", poolId)
    .eq("owner_id", ownerId)
    .single();

  if (poolError || !pool) {
    console.error(poolError);
    throw poolError || new Error("Pool not found for organizer.");
  }

  await deletePool(poolId);
}

export async function saveDraftPick(pick: DraftPickRow) {
  const { data, error } = await supabase.from("draft_picks").insert([pick]);

  if (error) {
    console.error("SAVE DRAFT PICK ERROR:", JSON.stringify(error, null, 2));
    alert(`Save draft pick failed: ${error.message}`);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteLastDraftPick(poolId: string, pickNumber: number) {
  const { error } = await supabase
    .from("draft_picks")
    .delete()
    .eq("pool_id", poolId)
    .eq("pick_index", pickNumber);

  if (error) {
    console.error(error);
    throw error;
  }
}

export async function getDraftPicks(poolId: string) {
  const { data, error } = await supabase
    .from("draft_picks")
    .select("*")
    .eq("pool_id", poolId)
    .order("pick_index", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function updateDraftPick(
  poolId: string,
  pickIndex: number,
  updates: Pick<DraftPickRow, "golfer_name" | "golfer_rank">
) {
  const { data, error } = await supabase
    .from("draft_picks")
    .update(updates)
    .eq("pool_id", poolId)
    .eq("pick_index", pickIndex)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
}

export async function loadGolfers(eventId: string) {
  const { data, error } = await supabase
    .from("golfers")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    console.error("LOAD GOLFERS ERROR:", error);
    return [];
  }

  return data || [];
}

export async function getGolferScores(eventId: string) {
  const { data, error } = await supabase
    .from("golfers")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}
