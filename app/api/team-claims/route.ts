import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>["client"]>;

async function authenticatedUserId(request: NextRequest, client: AdminClient) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user?.id || null;
}

function publicClaims(claims: Record<string, string>, userId: string | null) {
  return Object.fromEntries(
    Object.entries(claims).map(([team, claimant]) => [
      team,
      userId && claimant === userId ? "mine" : "claimed",
    ])
  );
}

function claimRowId(poolId: string) {
  return `TEAM_CLAIMS_${poolId}`;
}

function readClaims(settings: unknown): Record<string, string> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const claims = (settings as Record<string, unknown>).claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return {};
  return Object.fromEntries(Object.entries(claims).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function readFootballClaims(settings: unknown): Record<string, string> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const claims = (settings as Record<string, unknown>).teamClaims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return {};
  return Object.fromEntries(Object.entries(claims).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export async function GET(request: NextRequest) {
  const poolId = request.nextUrl.searchParams.get("poolId")?.trim();
  if (!poolId) return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
  const { client, error } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error }, { status: 500 });
  const [{ data: footballPool }, { data: claimRow }] = await Promise.all([
    client.from("platform_pools").select("settings").eq("id", poolId).eq("pool_type", "college_fantasy").maybeSingle(),
    client.from("platform_pools").select("settings").eq("id", claimRowId(poolId)).maybeSingle(),
  ]);
  const userId = await authenticatedUserId(request, client);
  const claims = footballPool ? readFootballClaims(footballPool.settings) : readClaims(claimRow?.settings);
  return NextResponse.json({
    claims: publicClaims(claims, userId),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const poolId = String(body.poolId || "").trim();
  const teamName = String(body.teamName || "").trim();
  const legacyParticipantId = String(body.legacyParticipantId || "").trim();
  if (!poolId || !teamName) return NextResponse.json({ error: "Incomplete team claim." }, { status: 400 });
  const { client, error } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error }, { status: 500 });
  const userId = await authenticatedUserId(request, client);
  if (!userId) {
    return NextResponse.json({ error: "Sign in before choosing your team." }, { status: 401 });
  }
  const id = claimRowId(poolId);
  const { data: footballPool, error: footballError } = await client.from("platform_pools").select("settings").eq("id", poolId).eq("pool_type", "college_fantasy").maybeSingle();
  if (footballError) return NextResponse.json({ error: footballError.message }, { status: 500 });
  const { data: golfPool, error: golfError } = footballPool
    ? { data: null, error: null }
    : await client.from("pools").select("owner_id,team_names").eq("id", poolId).maybeSingle();
  if (golfError) return NextResponse.json({ error: golfError.message }, { status: 500 });
  if (!footballPool && !golfPool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  const teamNames = footballPool && footballPool.settings && typeof footballPool.settings === "object" && !Array.isArray(footballPool.settings)
    ? (footballPool.settings as Record<string, unknown>).teamNames
    : golfPool?.team_names;
  if (!Array.isArray(teamNames) || !teamNames.includes(teamName)) {
    return NextResponse.json({ error: "That team is not available in this pool." }, { status: 409 });
  }
  const { data: existing } = footballPool
    ? { data: null }
    : await client.from("platform_pools").select("settings").eq("id", id).maybeSingle();
  const claims = footballPool ? readFootballClaims(footballPool.settings) : readClaims(existing?.settings);
  const currentClaim = claims[teamName];
  if (currentClaim && currentClaim !== userId && currentClaim !== legacyParticipantId) {
    return NextResponse.json({ error: "That team has already been claimed.", claims: publicClaims(claims, userId) }, { status: 409 });
  }
  for (const [claimedTeam, claimant] of Object.entries(claims)) {
    if ((claimant === userId || claimant === legacyParticipantId) && claimedTeam !== teamName) delete claims[claimedTeam];
  }
  claims[teamName] = userId;
  if (footballPool) {
    const settings = footballPool.settings && typeof footballPool.settings === "object" && !Array.isArray(footballPool.settings)
      ? footballPool.settings as Record<string, unknown>
      : {};
    const { error: updateError } = await client.from("platform_pools").update({
      settings: { ...settings, teamClaims: claims },
    }).eq("id", poolId).eq("pool_type", "college_fantasy");
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true, claims: publicClaims(claims, userId) });
  }
  const ownerId = golfPool?.owner_id || null;
  const { error: upsertError } = await client.from("platform_pools").upsert({
    id,
    owner_id: ownerId,
    name: `Team claims for ${poolId}`,
    pool_type: "team_claims",
    settings: { claims },
  }, { onConflict: "id" });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  return NextResponse.json({ success: true, claims: publicClaims(claims, userId) });
}
