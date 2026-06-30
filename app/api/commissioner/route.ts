import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const { client, error: adminError } = getSupabaseAdmin();

  if (!client) {
    return NextResponse.json(
      { success: false, error: adminError },
      { status: 500 }
    );
  }

  const body = await request.json();
  const poolId = String(body.poolId || "").trim();

  if (!poolId) {
    return NextResponse.json(
      { success: false, error: "Missing poolId" },
      { status: 400 }
    );
  }

  if (body.type === "settings") {
    const updates = body.updates || {};

    const { data, error } = await client
      .from("pools")
      .update({
        pool_name: String(updates.pool_name || "Untitled Golf Pool").trim(),
        team_names: Array.isArray(updates.team_names) ? updates.team_names : [],
        draft_order: Array.isArray(updates.draft_order)
          ? updates.draft_order
          : [],
        scores_to_count: Number(updates.scores_to_count) || 1,
      })
      .eq("id", poolId)
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

  if (body.type === "pick") {
    const pickIndex = Number(body.pickIndex);
    const golferName = String(body.golferName || "").trim();
    const golferRank = Number(body.golferRank) || 999999;

    if (!Number.isInteger(pickIndex) || !golferName) {
      return NextResponse.json(
        { success: false, error: "Missing pick details" },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from("draft_picks")
      .update({
        golfer_name: golferName,
        golfer_rank: golferRank,
      })
      .eq("pool_id", poolId)
      .eq("pick_index", pickIndex)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, pick: data });
  }

  return NextResponse.json(
    { success: false, error: "Unknown commissioner action" },
    { status: 400 }
  );
}
