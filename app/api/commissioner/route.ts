import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

function getTeamIndexForPick(pickNumber: number, teamCount: number) {
  const roundIndex = Math.floor(pickNumber / teamCount);
  const pickInRound = pickNumber % teamCount;
  const isSnakeRound = roundIndex % 2 === 1;

  return isSnakeRound ? teamCount - 1 - pickInRound : pickInRound;
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
  const poolId = String(body.poolId || "").trim();

  if (!poolId) {
    return NextResponse.json(
      { success: false, error: "Missing poolId" },
      { status: 400 }
    );
  }

  if (body.type === "settings") {
    const updates = body.updates || {};
    const teamNames = Array.isArray(updates.team_names) ? updates.team_names : [];
    const draftOrder = Array.isArray(updates.draft_order)
      ? updates.draft_order
      : [];

    const { data, error } = await client
      .from("pools")
      .update({
        pool_name: String(updates.pool_name || "Untitled Golf Pool").trim(),
        team_names: teamNames,
        draft_order: draftOrder,
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

    const { data: picks, error: picksError } = await client
      .from("draft_picks")
      .select("*")
      .eq("pool_id", poolId)
      .order("pick_index", { ascending: true });

    if (picksError) {
      return NextResponse.json(
        { success: false, error: picksError.message },
        { status: 500 }
      );
    }

    const reorderedPicks = await Promise.all(
      (picks || []).map(async (pick) => {
        const teamIndex = getTeamIndexForPick(
          Number(pick.pick_index),
          draftOrder.length
        );
        const nextTeam = draftOrder[teamIndex] || pick.team;

        if (pick.team === nextTeam) {
          return pick;
        }

        const { data: updatedPicks, error: updatePickError } = await client
          .from("draft_picks")
          .update({ team: nextTeam })
          .eq("pool_id", poolId)
          .eq("pick_index", pick.pick_index)
          .select();

        if (updatePickError) {
          throw updatePickError;
        }

        return updatedPicks?.[0] || { ...pick, team: nextTeam };
      })
    ).catch((teamUpdateError) => {
      const message =
        teamUpdateError instanceof Error
          ? teamUpdateError.message
          : "Could not update drafted team names.";

      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    });

    if (reorderedPicks instanceof NextResponse) {
      return reorderedPicks;
    }

    return NextResponse.json({
      success: true,
      pool: data,
      picks: reorderedPicks,
    });
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
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "No draft pick found for that slot." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, pick: data[0] });
  }

  return NextResponse.json(
    { success: false, error: "Unknown commissioner action" },
    { status: 400 }
  );
}
