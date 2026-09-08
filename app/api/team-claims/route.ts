import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

function claimRowId(poolId: string) {
  return `TEAM_CLAIMS_${poolId}`;
}

function readClaims(settings: unknown): Record<string, string> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const claims = (settings as Record<string, unknown>).claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return {};
  return Object.fromEntries(Object.entries(claims).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export async function GET(request: NextRequest) {
  const poolId = request.nextUrl.searchParams.get("poolId")?.trim();
  if (!poolId) return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
  const { client, error } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error }, { status: 500 });
  const { data } = await client.from("platform_pools").select("settings").eq("id", claimRowId(poolId)).maybeSingle();
  return NextResponse.json({ claims: readClaims(data?.settings) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const poolId = String(body.poolId || "").trim();
  const teamName = String(body.teamName || "").trim();
  const participantId = String(body.participantId || "").trim();
  if (!poolId || !teamName || !participantId) return NextResponse.json({ error: "Incomplete team claim." }, { status: 400 });
  const { client, error } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error }, { status: 500 });
  const id = claimRowId(poolId);
  const { data: existing } = await client.from("platform_pools").select("settings").eq("id", id).maybeSingle();
  const claims = readClaims(existing?.settings);
  if (claims[teamName] && claims[teamName] !== participantId) {
    return NextResponse.json({ error: "That team has already been claimed.", claims }, { status: 409 });
  }
  for (const [claimedTeam, claimant] of Object.entries(claims)) {
    if (claimant === participantId && claimedTeam !== teamName) delete claims[claimedTeam];
  }
  claims[teamName] = participantId;
  const [{ data: footballPool }, { data: golfPool }] = await Promise.all([
    client.from("platform_pools").select("owner_id").eq("id", poolId).maybeSingle(),
    client.from("pools").select("owner_id").eq("id", poolId).maybeSingle(),
  ]);
  const ownerId = footballPool?.owner_id || golfPool?.owner_id || null;
  const { error: upsertError } = await client.from("platform_pools").upsert({
    id,
    owner_id: ownerId,
    name: `Team claims for ${poolId}`,
    pool_type: "team_claims",
    settings: { claims },
  }, { onConflict: "id" });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  return NextResponse.json({ success: true, claims });
}
