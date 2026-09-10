import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

async function authenticatedUserId(request: NextRequest, client: NonNullable<ReturnType<typeof getSupabaseAdmin>["client"]>) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data } = await client.auth.getUser(token);
  return data.user?.id || null;
}

function teamForPick(draftOrder: string[], pickIndex: number) {
  const round = Math.floor(pickIndex / draftOrder.length);
  const slot = pickIndex % draftOrder.length;
  return draftOrder[round % 2 === 0 ? slot : draftOrder.length - 1 - slot];
}

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
  const userId = await authenticatedUserId(request, client);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Sign in before creating a pool." },
      { status: 401 }
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
    owner_id: userId,
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

export async function PUT(request: NextRequest) {
  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: adminError }, { status: 500 });
  const body = await request.json();
  const poolId = String(body.pool_id || "").trim();
  const team = String(body.team || "").trim();
  const pickIndex = Number(body.pick_index);
  if (!poolId || !team || !Number.isInteger(pickIndex)) return NextResponse.json({ error: "Invalid pick." }, { status: 400 });

  const [{ data: pool, error: poolError }, { data: picks, error: picksError }] = await Promise.all([
    client.from("pools").select("owner_id,draft_order,draft_locked").eq("id", poolId).maybeSingle(),
    client.from("draft_picks").select("pick_index,golfer_name").eq("pool_id", poolId).order("pick_index"),
  ]);
  if (poolError || picksError) return NextResponse.json({ error: poolError?.message || picksError?.message }, { status: 500 });
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if (pool.draft_locked) return NextResponse.json({ error: "Draft is locked." }, { status: 409 });
  if ((picks || []).length !== pickIndex) return NextResponse.json({ error: "Draft board changed. Refreshing the latest pick." }, { status: 409 });
  const draftOrder = getStringArray(pool.draft_order);
  const expectedTeam = draftOrder.length ? teamForPick(draftOrder, pickIndex) : "";
  if (!expectedTeam || expectedTeam !== team) return NextResponse.json({ error: "It is not that team's turn." }, { status: 403 });
  const userId = await authenticatedUserId(request, client);
  if (!userId) {
    return NextResponse.json({ error: "Sign in before drafting for your team." }, { status: 401 });
  }
  if (userId !== pool.owner_id) {
    const { data: claimRow } = await client.from("platform_pools").select("settings").eq("id", `TEAM_CLAIMS_${poolId}`).maybeSingle();
    const settings = claimRow?.settings && typeof claimRow.settings === "object" ? claimRow.settings as Record<string, unknown> : {};
    const claims = settings.claims && typeof settings.claims === "object" ? settings.claims as Record<string, unknown> : {};
    if (claims[expectedTeam] !== userId) return NextResponse.json({ error: "You can only draft for your claimed team when it is on the clock." }, { status: 403 });
  }
  if ((picks || []).some((pick) => pick.golfer_name === String(body.golfer_name))) return NextResponse.json({ error: "That golfer was already drafted." }, { status: 409 });
  const { data, error } = await client.from("draft_picks").insert({
    pool_id: poolId,
    team,
    golfer_name: String(body.golfer_name || "").trim(),
    golfer_rank: Number(body.golfer_rank) || 999999,
    pick_index: pickIndex,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ success: true, pick: data });
}
