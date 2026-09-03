import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const poolId = request.nextUrl.searchParams.get("id")?.trim();
  if (!poolId) {
    return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
  }

  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json({ error: adminError }, { status: 500 });
  }

  const [{ data: pool, error: poolError }, { data: picks, error: picksError }] =
    await Promise.all([
      client
        .from("platform_pools")
        .select("id,settings")
        .eq("id", poolId)
        .eq("pool_type", "college_fantasy")
        .maybeSingle(),
      client
        .from("platform_draft_picks")
        .select("pick_index,selection_id,selection_snapshot")
        .eq("pool_id", poolId)
        .order("pick_index", { ascending: true }),
    ]);

  if (poolError || picksError) {
    return NextResponse.json(
      { error: poolError?.message || picksError?.message },
      { status: 500 }
    );
  }

  if (!pool) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  return NextResponse.json({ pool, picks: picks || [] });
}

export async function PUT(request: NextRequest) {
  const body: unknown = await request.json();
  if (!isRecord(body) || !isRecord(body.pool) || !Array.isArray(body.picks)) {
    return NextResponse.json({ error: "Invalid football pool payload." }, { status: 400 });
  }

  const pool = body.pool;
  const poolId = typeof pool.id === "string" ? pool.id.trim() : "";
  const teamNames = Array.isArray(pool.teamNames) ? pool.teamNames : [];
  const draftOrder = Array.isArray(pool.draftOrder) ? pool.draftOrder : [];

  if (!poolId || teamNames.length === 0 || draftOrder.length === 0) {
    return NextResponse.json({ error: "Incomplete football pool." }, { status: 400 });
  }

  const picks = body.picks.filter(isRecord).map((pick, index) => ({
    pool_id: poolId,
    pick_index: index,
    selection_id: String(pick.playerId || ""),
    selection_snapshot: {
      playerId: String(pick.playerId || ""),
      team: String(pick.team || ""),
      pickNumber: Number(pick.pickNumber) || index + 1,
    },
  }));

  if (picks.some((pick) => !pick.selection_id || !pick.selection_snapshot.team)) {
    return NextResponse.json({ error: "Invalid football draft picks." }, { status: 400 });
  }

  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json({ error: adminError }, { status: 500 });
  }

  const { data: existingPool, error: ownerLookupError } = await client
    .from("platform_pools")
    .select("owner_id")
    .eq("id", poolId)
    .maybeSingle();

  if (ownerLookupError) {
    return NextResponse.json({ error: ownerLookupError.message }, { status: 500 });
  }

  const ownerId = existingPool?.owner_id || crypto.randomUUID();
  const { error: poolError } = await client.from("platform_pools").upsert(
    {
      id: poolId,
      owner_id: ownerId,
      pool_type: "college_fantasy",
      settings: pool,
    },
    { onConflict: "id" }
  );

  if (poolError) {
    return NextResponse.json({ error: poolError.message }, { status: 500 });
  }

  if (picks.length > 0) {
    const { error: picksError } = await client
      .from("platform_draft_picks")
      .upsert(picks, { onConflict: "pool_id,pick_index" });

    if (picksError) {
      return NextResponse.json({ error: picksError.message }, { status: 500 });
    }
  }

  const stalePicks = client
    .from("platform_draft_picks")
    .delete()
    .eq("pool_id", poolId);
  const { error: deleteError } =
    picks.length === 0
      ? await stalePicks
      : await stalePicks.gte("pick_index", picks.length);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
