import { supabase } from "./supabase";

export async function savePool(pool: any) {
  const { data, error } = await supabase.from("pools").insert([pool]);

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
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

export async function saveDraftPick(pick: any) {
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
