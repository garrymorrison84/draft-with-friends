import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>["client"]>;
type PoolSport = "football" | "golf";

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

function hiddenPoolKey(sport: PoolSport, poolId: string) {
  return `${sport}:${poolId}`;
}

function hiddenPoolRowId(userId: string, sport: PoolSport, poolId: string) {
  const digest = createHash("sha256")
    .update(`${userId}:${sport}:${poolId}`)
    .digest("hex")
    .slice(0, 48);
  return `HIDDEN_${digest}`;
}

function currentCollegeWeek(date = new Date()) {
  const seasonYear = date.getMonth() < 2 ? date.getFullYear() - 1 : date.getFullYear();
  const firstOfSeptember = new Date(seasonYear, 8, 1);
  const firstMonday = new Date(firstOfSeptember);
  firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7));
  const seasonStart = new Date(firstMonday);
  seasonStart.setDate(seasonStart.getDate() - 7);
  const currentMonday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  currentMonday.setDate(currentMonday.getDate() - ((currentMonday.getDay() + 6) % 7));
  return Math.max(1, Math.floor((currentMonday.getTime() - seasonStart.getTime()) / 604800000) + 1);
}

function footballWeek(value: unknown) {
  const match = typeof value === "string" ? value.match(/week\s*(\d+)/i) : null;
  return match ? Number(match[1]) : 0;
}

function footballContestCompleted(settings: Record<string, unknown>, now = new Date()) {
  const week = footballWeek(settings.season);
  if (!week) return false;
  const createdAt = typeof settings.createdAt === "string" ? new Date(settings.createdAt) : null;
  const currentSeasonYear = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    const poolSeasonYear = createdAt.getMonth() < 2 ? createdAt.getFullYear() - 1 : createdAt.getFullYear();
    if (poolSeasonYear < currentSeasonYear) return true;
    if (poolSeasonYear > currentSeasonYear) return false;
  }
  return week < currentCollegeWeek(now);
}

export async function GET(request: NextRequest) {
  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: adminError }, { status: 500 });

  const userId = await authenticatedUserId(request, client);
  if (!userId) return NextResponse.json({ error: "Sign in to view your pools." }, { status: 401 });

  const [golfOwnedResult, footballResult, golfClaimsResult, hiddenPoolsResult] = await Promise.all([
    client
      .from("pools")
      .select("id,pool_name,golf_event,event_id,number_of_teams,golfers_per_team,scores_to_count,owner_id,draft_locked,archived")
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
    client
      .from("platform_pools")
      .select("settings")
      .eq("pool_type", "hidden_pool")
      .eq("owner_id", userId)
      .limit(2000),
  ]);

  const firstError =
    golfOwnedResult.error ||
    footballResult.error ||
    golfClaimsResult.error ||
    hiddenPoolsResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const hiddenPools = new Set(
    (hiddenPoolsResult.data || []).flatMap((row) => {
      if (!isRecord(row.settings)) return [];
      const sport = row.settings.sport;
      const poolId = row.settings.poolId;
      return (sport === "football" || sport === "golf") && typeof poolId === "string"
        ? [hiddenPoolKey(sport, poolId)]
        : [];
    })
  );

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
        .select("id,pool_name,golf_event,event_id,number_of_teams,golfers_per_team,scores_to_count,owner_id,draft_locked,archived")
        .in("id", joinedGolfIds)
    : { data: [], error: null };
  if (joinedGolfError) return NextResponse.json({ error: joinedGolfError.message }, { status: 500 });

  const golfPools = [...(golfOwnedResult.data || []), ...(joinedGolf || [])];
  const footballPools = (footballResult.data || []).filter((pool) => {
    const isOwner = pool.owner_id === userId;
    return isOwner || Boolean(claimedTeam(pool.settings, "teamClaims", userId));
  });
  const golfIds = golfPools.map((pool) => pool.id);
  const golfEventIds = [...new Set(golfPools.flatMap((pool) => pool.event_id ? [pool.event_id] : []))];

  const [golfDatesResult, golfEventsResult] = await Promise.all([
    golfIds.length
      ? client.from("pools").select("id,created_at").in("id", golfIds)
      : Promise.resolve({ data: [], error: null }),
    golfEventIds.length
      ? client.from("events").select("id,end_date,is_active").in("id", golfEventIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const golfDates = new Map<string, string>();
  if (!golfDatesResult.error) {
    for (const row of golfDatesResult.data || []) {
      if (typeof row.created_at === "string") golfDates.set(row.id, row.created_at);
    }
  }
  const golfEvents = new Map(
    golfEventsResult.error
      ? []
      : (golfEventsResult.data || []).map((event) => [event.id, event] as const)
  );
  const today = new Date().toISOString().slice(0, 10);

  const golfRows = golfPools.flatMap((pool) => {
    if (hiddenPools.has(hiddenPoolKey("golf", pool.id))) return [];
    const isOwner = pool.owner_id === userId;
    const event = pool.event_id ? golfEvents.get(pool.event_id) : null;
    const completed = Boolean(event && (event.is_active === false || (typeof event.end_date === "string" && event.end_date < today)));
    return [{
      id: pool.id,
      name: pool.pool_name,
      sport: "golf" as const,
      event: pool.golf_event,
      role: isOwner ? "organizer" as const : "member" as const,
      teamName: golfClaims.find((claim) => claim.poolId === pool.id)?.teamName || "",
      completed,
      createdAt: golfDates.get(pool.id) || null,
      status: completed ? "Completed" : "Active",
      details: `${pool.number_of_teams} teams • ${pool.golfers_per_team} golfers per team • Best ${pool.scores_to_count} count`,
      lobbyHref: `/pool?id=${pool.id}&view=lobby`,
      leaderboardHref: `/leaderboard?id=${pool.id}`,
      manageHref: isOwner ? `/organizer/manage?id=${pool.id}` : null,
    }];
  });

  const footballRows = footballPools.flatMap((pool) => {
    if (hiddenPools.has(hiddenPoolKey("football", pool.id))) return [];
    const settings = isRecord(pool.settings) ? pool.settings : {};
    const teamName = claimedTeam(settings, "teamClaims", userId);
    const isOwner = pool.owner_id === userId;
    const draftOrder = Array.isArray(settings.draftOrder)
      ? settings.draftOrder.filter((name): name is string => typeof name === "string")
      : [];
    const numberOfTeams = draftOrder.length || (typeof settings.numberOfTeams === "number" ? settings.numberOfTeams : 0);
    const completed = footballContestCompleted(settings);
    const season = typeof settings.season === "string" ? settings.season : "College Football";
    return [{
      id: pool.id,
      name: typeof settings.poolName === "string" ? settings.poolName : pool.name,
      sport: "football" as const,
      event: season,
      role: isOwner ? "organizer" as const : "member" as const,
      teamName,
      completed,
      createdAt: typeof settings.createdAt === "string" ? settings.createdAt : null,
      status: completed ? "Completed" : "Active",
      details: `${numberOfTeams || "—"} teams • College fantasy football`,
      lobbyHref: `/football/pool?id=${pool.id}`,
      leaderboardHref: `/football/leaderboard?id=${pool.id}`,
      manageHref: isOwner ? `/football/pool?id=${pool.id}#commissioner-controls` : null,
    }];
  });

  const pools = [...footballRows, ...golfRows].sort((a, b) => {
    const left = a.createdAt ? Date.parse(a.createdAt) : 0;
    const right = b.createdAt ? Date.parse(b.createdAt) : 0;
    return right - left;
  });

  return NextResponse.json(
    { pools },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function DELETE(request: NextRequest) {
  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: adminError }, { status: 500 });

  const userId = await authenticatedUserId(request, client);
  if (!userId) return NextResponse.json({ error: "Sign in to update your pools." }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid pool request." }, { status: 400 });
  const sport = body.sport;
  const poolId = typeof body.poolId === "string" ? body.poolId.trim() : "";
  if ((sport !== "football" && sport !== "golf") || !poolId) {
    return NextResponse.json({ error: "Choose a pool to delete from your history." }, { status: 400 });
  }

  const ownerResult = sport === "football"
    ? await client
      .from("platform_pools")
      .select("id,owner_id")
      .eq("id", poolId)
      .eq("pool_type", "college_fantasy")
      .maybeSingle()
    : await client
      .from("pools")
      .select("id,owner_id")
      .eq("id", poolId)
      .maybeSingle();

  if (ownerResult.error) {
    return NextResponse.json({ error: ownerResult.error.message }, { status: 500 });
  }
  if (!ownerResult.data) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  if (ownerResult.data.owner_id === userId) {
    const relatedDeletes = sport === "football"
      ? await Promise.all([
        client.from("platform_draft_picks").delete().eq("pool_id", poolId),
        client.from("pool_entries").delete().eq("pool_id", poolId),
        client.from("platform_pools").delete().eq("id", `TEAM_CLAIMS_${poolId}`),
      ])
      : await Promise.all([
        client.from("draft_picks").delete().eq("pool_id", poolId),
        client.from("platform_pools").delete().eq("id", `TEAM_CLAIMS_${poolId}`),
      ]);
    const relatedError = relatedDeletes.find((result) => result.error)?.error;
    if (relatedError) {
      return NextResponse.json({ error: relatedError.message }, { status: 500 });
    }

    const deleteResult = sport === "football"
      ? await client
        .from("platform_pools")
        .delete()
        .eq("id", poolId)
        .eq("pool_type", "college_fantasy")
        .eq("owner_id", userId)
      : await client
        .from("pools")
        .delete()
        .eq("id", poolId)
        .eq("owner_id", userId);
    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedForEveryone: true });
  }

  const { error } = await client.from("platform_pools").upsert(
    {
      id: hiddenPoolRowId(userId, sport, poolId),
      owner_id: userId,
      name: "Hidden account pool",
      pool_type: "hidden_pool",
      settings: { sport, poolId, hiddenAt: new Date().toISOString() },
    },
    { onConflict: "id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deletedForEveryone: false });
}
