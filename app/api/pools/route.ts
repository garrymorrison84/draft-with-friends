import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
  const { client, error: adminError } = getSupabaseAdmin();

  if (!client) {
    return NextResponse.json(
      { success: false, error: adminError },
      { status: 500 }
    );
  }

  const body = await request.json();
  const id = String(body.id || "").trim();
  const teamNames = getStringArray(body.team_names);
  const draftOrder = getStringArray(body.draft_order);

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Missing pool id" },
      { status: 400 }
    );
  }

  if (teamNames.length === 0 || draftOrder.length === 0) {
    return NextResponse.json(
      { success: false, error: "Missing team names or draft order" },
      { status: 400 }
    );
  }

  const basePool = {
    id,
    pool_name: String(body.pool_name || "Untitled Golf Pool").trim(),
    golf_event: String(body.golf_event || "Golf Event").trim(),
    event_id: body.event_id ? String(body.event_id) : null,
    number_of_teams: Number(body.number_of_teams) || teamNames.length,
    golfers_per_team: Number(body.golfers_per_team) || 1,
    scores_to_count: Number(body.scores_to_count) || 1,
    team_names: teamNames,
    draft_order: draftOrder,
    owner_id: body.owner_id ? String(body.owner_id) : null,
    draft_locked: Boolean(body.draft_locked),
    archived: Boolean(body.archived),
  };
  const isScheduled = body.draft_type === "scheduled";
  const poolWithTiming = {
    ...basePool,
    draft_type: isScheduled ? "scheduled" : "unscheduled",
    scheduled_draft_at: body.scheduled_draft_at
      ? String(body.scheduled_draft_at)
      : null,
    time_zone: body.time_zone ? String(body.time_zone) : "America/New_York",
    pick_clock_seconds: isScheduled
      ? Math.max(30, Number(body.pick_clock_seconds) || 0)
      : 0,
    auto_pick_on_timeout: isScheduled,
  };

  let { data, error } = await client
    .from("pools")
    .insert([poolWithTiming])
    .select()
    .single();

  if (
    error &&
    /draft_type|scheduled_draft_at|time_zone|pick_clock_seconds|auto_pick_on_timeout/i.test(
      error.message || ""
    )
  ) {
    const fallbackResult = await client
      .from("pools")
      .insert([basePool])
      .select()
      .single();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, pool: data });
}

export async function PATCH(request: NextRequest) {
  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json({ success: false, error: adminError }, { status: 500 });
  }

  const body = await request.json();
  const poolId = String(body.poolId || "").trim();
  const currentName = String(body.currentName || "").trim();
  const newName = String(body.newName || "").trim().slice(0, 40);
  if (!poolId || !currentName || !newName) {
    return NextResponse.json({ success: false, error: "Choose a team and enter a name." }, { status: 400 });
  }

  const [{ data: pool, error: poolError }, { count: pickCount, error: picksError }] =
    await Promise.all([
      client.from("pools").select("team_names,draft_order,draft_locked").eq("id", poolId).maybeSingle(),
      client.from("draft_picks").select("pool_id", { count: "exact", head: true }).eq("pool_id", poolId),
    ]);
  if (poolError || picksError) {
    return NextResponse.json({ success: false, error: poolError?.message || picksError?.message }, { status: 500 });
  }
  if (!pool) return NextResponse.json({ success: false, error: "Pool not found." }, { status: 404 });
  if (pool.draft_locked || (pickCount || 0) > 0) {
    return NextResponse.json({ success: false, error: "Team names lock when the draft begins." }, { status: 409 });
  }

  const teamNames = getStringArray(pool.team_names);
  if (!teamNames.includes(currentName)) {
    return NextResponse.json({ success: false, error: "That team is no longer available." }, { status: 409 });
  }
  if (teamNames.some((name) => name !== currentName && name.toLowerCase() === newName.toLowerCase())) {
    return NextResponse.json({ success: false, error: "That team name is already in use." }, { status: 409 });
  }
  const rename = (name: string) => (name === currentName ? newName : name);
  const { data, error } = await client.from("pools").update({
    team_names: teamNames.map(rename),
    draft_order: getStringArray(pool.draft_order).map(rename),
  }).eq("id", poolId).select().single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, pool: data });
}
