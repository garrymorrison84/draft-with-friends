import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>["client"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function authenticatedUserId(request: NextRequest, client: AdminClient) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user?.id || null;
}

function claimedTeam(settings: unknown, key: "teamClaims" | "claims", userId: string) {
  if (!isRecord(settings) || !isRecord(settings[key])) return "";
  return Object.entries(settings[key]).find(([, claimant]) => claimant === userId)?.[0] || "";
}

export async function GET(request: NextRequest) {
  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: adminError }, { status: 500 });

  const userId = await authenticatedUserId(request, client);
  if (!userId) return NextResponse.json({ error: "Sign in to view your pools." }, { status: 401 });

  const [golfOwnedResult, footballResult, golfClaimsResult] = await Promise.all([
    client
      .from("pools")
      .select("id,pool_name,golf_event,number_of_teams,golfers_per_team,scores_to_count,owner_id,draft_locked,archived")
      .eq("owner_id", userId),
    client
      .from("platform_pools")
      .select("id,name,owner_id,settings")
      .eq("pool_type", "college_fantasy")
      .limit(2000),
    client
      .from("platform_pools")
      .select("id,settings")
      .eq("pool_type", "team_claims")
      .limit(2000),
  ]);

  const firstError = golfOwnedResult.error || footballResult.error || golfClaimsResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const golfClaims = (golfClaimsResult.data || []).flatMap((row) => {
    const teamName = claimedTeam(row.settings, "claims", userId);
    const poolId = row.id.startsWith("TEAM_CLAIMS_") ? row.id.slice("TEAM_CLAIMS_".length) : "";
    return teamName && poolId ? [{ poolId, teamName }] : [];
  });
  const ownedGolfIds = new Set((golfOwnedResult.data || []).map((pool) => pool.id));
  const joinedGolfIds = golfClaims.map((claim) => claim.poolId).filter((id) => !ownedGolfIds.has(id));
  const { data: joinedGolf, error: joinedGolfError } = joinedGolfIds.length
    ? await client
        .from("pools")
        .select("id,pool_name,golf_event,number_of_teams,golfers_per_team,scores_to_count,owner_id,draft_locked,archived")
        .in("id", joinedGolfIds)
    : { data: [], error: null };
  if (joinedGolfError) return NextResponse.json({ error: joinedGolfError.message }, { status: 500 });

  const golfRows = [...(golfOwnedResult.data || []), ...(joinedGolf || [])].map((pool) => {
    const isOwner = pool.owner_id === userId;
    return {
      id: pool.id,
      name: pool.pool_name,
      sport: "golf" as const,
      event: pool.golf_event,
      role: isOwner ? "organizer" as const : "member" as const,
      teamName: golfClaims.find((claim) => claim.poolId === pool.id)?.teamName || "",
      archived: Boolean(pool.archived),
      status: pool.archived ? "Archived" : pool.draft_locked ? "Draft Locked" : "Draft Open",
      details: `${pool.number_of_teams} teams • ${pool.golfers_per_team} golfers per team • Best ${pool.scores_to_count} count`,
      lobbyHref: `/pool?id=${pool.id}&view=lobby`,
      leaderboardHref: `/leaderboard?id=${pool.id}`,
      manageHref: isOwner ? `/organizer/manage?id=${pool.id}` : null,
    };
  });

  const footballRows = (footballResult.data || []).flatMap((pool) => {
    const teamName = claimedTeam(pool.settings, "teamClaims", userId);
    const isOwner = pool.owner_id === userId;
    if (!isOwner && !teamName) return [];
    const settings = isRecord(pool.settings) ? pool.settings : {};
    const numberOfTeams = typeof settings.numberOfTeams === "number" ? settings.numberOfTeams : 0;
    const season = typeof settings.season === "string" ? settings.season : "College Football";
    const archived = settings.archived === true;
    return [{
      id: pool.id,
      name: typeof settings.poolName === "string" ? settings.poolName : pool.name,
      sport: "football" as const,
      event: season,
      role: isOwner ? "organizer" as const : "member" as const,
      teamName,
      archived,
      status: archived ? "Archived" : "Active",
      details: `${numberOfTeams || "—"} teams • College fantasy football`,
      lobbyHref: `/football/pool?id=${pool.id}`,
      leaderboardHref: `/football/leaderboard?id=${pool.id}`,
      manageHref: isOwner ? `/football/pool?id=${pool.id}#commissioner-controls` : null,
    }];
  });

  return NextResponse.json(
    { pools: [...footballRows, ...golfRows] },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
