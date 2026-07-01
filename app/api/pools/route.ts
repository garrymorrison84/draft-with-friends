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

  const { data, error } = await client
    .from("pools")
    .insert([
      {
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
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, pool: data });
}
