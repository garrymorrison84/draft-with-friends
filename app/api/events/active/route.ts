import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { client: supabaseAdmin, error: adminError } = getSupabaseAdmin();

  if (adminError || !supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: adminError || "Missing Supabase admin client" },
      { status: 500 }
    );
  }
  const { data: activeEvent, error } = await supabaseAdmin
    .from("events")
    .select("id,name,sportsdata_tournament_id,start_date,end_date,is_active")
    .eq("is_active", true)
    .single();

  if (error || !activeEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "No active golf event found. Run /api/events/refresh-current.",
        details: error,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, activeEvent });
}
