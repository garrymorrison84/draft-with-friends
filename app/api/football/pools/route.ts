import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>["client"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function teamForPick(draftOrder: string[], pickIndex: number) {
  const round = Math.floor(pickIndex / draftOrder.length);
  const slot = pickIndex % draftOrder.length;
  return draftOrder[round % 2 === 0 ? slot : draftOrder.length - 1 - slot];
}

async function getAuthenticatedOrganizerId(
  request: NextRequest,
  client: AdminClient
) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user.id;
}

async function ensureDraftEntry({
  client,
  poolId,
  team,
  seatNumber,
  organizerId,
  participantId,
}: {
  client: AdminClient;
  poolId: string;
  team: string;
  seatNumber: number;
  organizerId: string | null;
  participantId: string;
}) {
  const { data: seatEntry, error: seatError } = await client
    .from("pool_entries")
    .select("id,team_name,revoked_at")
    .eq("pool_id", poolId)
    .eq("seat_number", seatNumber)
    .limit(1)
    .maybeSingle();
  if (seatError) throw seatError;
  if (seatEntry) {
    if (seatEntry.team_name !== team || seatEntry.revoked_at) {
      const { error: updateError } = await client
        .from("pool_entries")
        .update({ team_name: team, revoked_at: null })
        .eq("id", seatEntry.id);
      if (updateError) throw updateError;
    }
    return seatEntry.id as string;
  }

  if (organizerId) {
    const { data: existing, error } = await client
      .from("pool_entries")
      .select("id")
      .eq("pool_id", poolId)
      .eq("user_id", organizerId)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (existing) return existing.id as string;

    const { data, error: insertError } = await client.from("pool_entries").insert({
      pool_id: poolId,
      user_id: organizerId,
      team_name: team,
      seat_number: seatNumber,
      role: "commissioner",
      claimed_at: new Date().toISOString(),
    }).select("id").single();
    if (insertError) throw insertError;
    return data.id as string;
  }

  const guestTokenHash = createHash("sha256").update(`${poolId}:${participantId}`).digest("hex");
  const { data: existing, error } = await client
    .from("pool_entries")
    .select("id")
    .eq("pool_id", poolId)
    .eq("guest_token_hash", guestTokenHash)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing.id as string;

  const { data, error: insertError } = await client.from("pool_entries").insert({
    pool_id: poolId,
    team_name: team,
    seat_number: seatNumber,
    role: "participant",
    guest_token_hash: guestTokenHash,
    claimed_at: new Date().toISOString(),
  }).select("id").single();
  if (insertError) throw insertError;
  return data.id as string;
}

export async function GET(request: NextRequest) {
  const poolId = request.nextUrl.searchParams.get("id")?.trim();
  if (!poolId) {
    return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
  }

  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json({ error: adminError }, { status: 500 });
  }

  const [{ data: pool, error: poolError }, { data: picks, error: picksError }] =
    await Promise.all([
      client
        .from("platform_pools")
        .select("id,settings")
        .eq("id", poolId)
        .eq("pool_type", "college_fantasy")
        .maybeSingle(),
      client
        .from("platform_draft_picks")
        .select("pick_index,selection_id,selection_snapshot,created_at")
        .eq("pool_id", poolId)
        .order("pick_index", { ascending: true }),
    ]);

  if (poolError || picksError) {
    return NextResponse.json(
      { error: poolError?.message || picksError?.message },
      { status: 500 }
    );
  }

  if (!pool) {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }

  return NextResponse.json({ pool, picks: picks || [], serverNow: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid draft pick payload." }, { status: 400 });
  }

  const poolId = typeof body.poolId === "string" ? body.poolId.trim() : "";
  const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
  const team = typeof body.team === "string" ? body.team.trim() : "";
  const participantId = typeof body.participantId === "string" ? body.participantId.trim() : "";
  const playerSnapshot = isRecord(body.playerSnapshot) ? body.playerSnapshot : null;
  const expectedPickIndex = Number(body.expectedPickIndex);
  if (!poolId || !playerId || !team || !Number.isInteger(expectedPickIndex) || expectedPickIndex < 0) {
    return NextResponse.json({ error: "Incomplete draft pick payload." }, { status: 400 });
  }

  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: adminError }, { status: 500 });

  const [{ data: pool, error: poolError }, { data: currentPicks, error: picksError }] =
    await Promise.all([
      client.from("platform_pools").select("id,owner_id,settings").eq("id", poolId).eq("pool_type", "college_fantasy").maybeSingle(),
      client.from("platform_draft_picks")
        .select("pick_index,selection_id,selection_snapshot,created_at")
        .eq("pool_id", poolId)
        .order("pick_index", { ascending: true }),
    ]);

  if (poolError || picksError) {
    return NextResponse.json({ error: poolError?.message || picksError?.message }, { status: 500 });
  }
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });

  const picks = currentPicks || [];
  if (picks.length !== expectedPickIndex || picks.some((pick) => pick.selection_id === playerId)) {
    return NextResponse.json({ error: "Draft board changed. Syncing the latest pick.", picks }, { status: 409 });
  }

  if (!isRecord(pool.settings)) return NextResponse.json({ error: "Invalid pool settings." }, { status: 500 });
  if (pool.settings.draftPaused === true) {
    return NextResponse.json({ error: "The commissioner has paused the draft." }, { status: 409 });
  }
  const draftOrder = Array.isArray(pool.settings.draftOrder)
    ? pool.settings.draftOrder.filter((name): name is string => typeof name === "string")
    : [];
  const expectedTeam = draftOrder.length ? teamForPick(draftOrder, expectedPickIndex) : "";
  if (!expectedTeam || team !== expectedTeam) {
    return NextResponse.json({ error: "It is not that team's turn." }, { status: 403 });
  }
  const organizerId = await getAuthenticatedOrganizerId(request, client);
  const isCommissioner = Boolean(organizerId && organizerId === pool.owner_id);
  if (!isCommissioner) {
    const claims = isRecord(pool.settings.teamClaims) ? { ...pool.settings.teamClaims } : {};
    if (!participantId || (claims[expectedTeam] && claims[expectedTeam] !== participantId)) {
      return NextResponse.json({ error: "You can only draft for your claimed team when it is on the clock." }, { status: 403 });
    }
    if (!claims[expectedTeam]) {
      for (const [claimedTeam, claimant] of Object.entries(claims)) {
        if (claimant === participantId && claimedTeam !== expectedTeam) delete claims[claimedTeam];
      }
      claims[expectedTeam] = participantId;
      const { error: claimError } = await client.from("platform_pools").update({
        settings: { ...pool.settings, teamClaims: claims },
      }).eq("id", poolId).eq("pool_type", "college_fantasy");
      if (claimError) return NextResponse.json({ error: "Could not verify your team before saving the pick." }, { status: 500 });
    }
  }
  if (!participantId && !organizerId) {
    return NextResponse.json({ error: "Your draft identity could not be verified." }, { status: 403 });
  }
  let entryId: string;
  try {
    entryId = await ensureDraftEntry({
      client,
      poolId,
      team,
      seatNumber: Math.max(0, draftOrder.indexOf(team)),
      organizerId: isCommissioner ? organizerId : null,
      participantId,
    });
  } catch (entryError) {
    console.error("Football draft entry resolution failed", entryError);
    return NextResponse.json({ error: "Your pool entry could not be saved." }, { status: 500 });
  }

  const { data: insertedPick, error: insertError } = await client.from("platform_draft_picks").insert({
    pool_id: poolId,
    entry_id: entryId,
    pick_index: expectedPickIndex,
    selection_type: "college_player",
    selection_id: playerId,
    selection_name:
      playerSnapshot && typeof playerSnapshot.name === "string"
        ? playerSnapshot.name
        : playerId,
    selection_snapshot: { playerId, team, pickNumber: expectedPickIndex + 1, playerSnapshot },
  }).select("created_at").single();

  if (insertError) {
    console.error("Football pick insert failed", {
      poolId,
      expectedPickIndex,
      code: insertError.code,
      message: insertError.message,
    });
    const { data: latestPicks } = await client.from("platform_draft_picks")
      .select("pick_index,selection_id,selection_snapshot,created_at")
      .eq("pool_id", poolId)
      .order("pick_index", { ascending: true });
    return NextResponse.json(
      {
        error: insertError.code === "23505"
          ? "Another device submitted this pick first. Syncing the draft."
          : "The pick could not be saved. Please try again.",
        picks: latestPicks || picks,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, pickIndex: expectedPickIndex, pickedAt: insertedPick?.created_at });
}

export async function PATCH(request: NextRequest) {
  const body: unknown = await request.json();
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid team update." }, { status: 400 });
  const poolId = typeof body.poolId === "string" ? body.poolId.trim() : "";
  if (body.action === "update-scoring") {
    if (!poolId || !isRecord(body.scoring)) {
      return NextResponse.json({ error: "Invalid football scoring settings." }, { status: 400 });
    }
    const { client, error: adminError } = getSupabaseAdmin();
    if (!client) return NextResponse.json({ error: adminError }, { status: 500 });
    const organizerId = await getAuthenticatedOrganizerId(request, client);
    if (!organizerId) {
      return NextResponse.json(
        { error: "Organizer sign-in is required to save scoring." },
        { status: 401 }
      );
    }
    const { data: row, error: poolError } = await client
      .from("platform_pools")
      .select("owner_id,pool_type,settings")
      .eq("id", poolId)
      .maybeSingle();
    if (poolError) return NextResponse.json({ error: poolError.message }, { status: 500 });
    if (row && row.pool_type !== "college_fantasy") {
      return NextResponse.json({ error: "That pool id belongs to another pool type." }, { status: 409 });
    }
    if (row && organizerId !== row.owner_id) {
      return NextResponse.json(
        { error: "Only the commissioner can update scoring." },
        { status: 403 }
      );
    }
    if (row && !isRecord(row.settings)) {
      return NextResponse.json({ error: "Invalid pool settings." }, { status: 500 });
    }

    let nextSettings: Record<string, unknown>;
    if (row) {
      nextSettings = { ...row.settings, scoring: body.scoring };
    } else {
      if (!isRecord(body.pool)) {
        return NextResponse.json({ error: "Pool setup could not be restored." }, { status: 400 });
      }
      const submittedPool = body.pool;
      const teamNames = Array.isArray(submittedPool.teamNames)
        ? submittedPool.teamNames.filter((name): name is string => typeof name === "string")
        : [];
      const draftOrder = Array.isArray(submittedPool.draftOrder)
        ? submittedPool.draftOrder.filter((name): name is string => typeof name === "string")
        : [];
      if (teamNames.length === 0 || draftOrder.length === 0) {
        return NextResponse.json({ error: "Incomplete football pool." }, { status: 400 });
      }
      const isScheduled = submittedPool.draftType === "scheduled";
      nextSettings = {
        ...submittedPool,
        id: poolId,
        teamNames,
        draftOrder,
        scoring: body.scoring,
        pickClockSeconds: isScheduled
          ? Math.max(30, Number(submittedPool.pickClockSeconds) || 60)
          : 0,
        autoPickOnTimeout: isScheduled,
      };
    }

    const poolName =
      typeof nextSettings.poolName === "string" && nextSettings.poolName.trim()
        ? nextSettings.poolName.trim()
        : "College Football Pool";
    const { error: updateError } = await client.from("platform_pools").upsert(
      {
        id: poolId,
        owner_id: organizerId,
        name: poolName,
        pool_type: "college_fantasy",
        settings: nextSettings,
      },
      { onConflict: "id" }
    );
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, pool: nextSettings });
  }
  if (body.action === "commissioner-update-team-names") {
    const submittedNames = Array.isArray(body.teamNames)
      ? body.teamNames.map((name) =>
          typeof name === "string" ? name.trim().slice(0, 40) : ""
        )
      : [];
    if (!poolId || submittedNames.length === 0 || submittedNames.some((name) => !name)) {
      return NextResponse.json({ error: "Every team needs a name." }, { status: 400 });
    }
    if (new Set(submittedNames.map((name) => name.toLowerCase())).size !== submittedNames.length) {
      return NextResponse.json({ error: "Every team name must be unique." }, { status: 409 });
    }

    const { client, error: adminError } = getSupabaseAdmin();
    if (!client) return NextResponse.json({ error: adminError }, { status: 500 });
    const organizerId = await getAuthenticatedOrganizerId(request, client);
    if (!organizerId) {
      return NextResponse.json(
        { error: "Organizer sign-in is required to update team names." },
        { status: 401 }
      );
    }

    const { data: row, error: poolError } = await client
      .from("platform_pools")
      .select("owner_id,settings")
      .eq("id", poolId)
      .eq("pool_type", "college_fantasy")
      .maybeSingle();
    if (poolError) return NextResponse.json({ error: poolError.message }, { status: 500 });
    if (!row || !isRecord(row.settings)) {
      return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    }
    if (organizerId !== row.owner_id) {
      return NextResponse.json(
        { error: "Only the commissioner can update team names." },
        { status: 403 }
      );
    }

    const previousNames = Array.isArray(row.settings.teamNames)
      ? row.settings.teamNames.filter((name): name is string => typeof name === "string")
      : [];
    if (previousNames.length === 0 || submittedNames.length !== previousNames.length) {
      return NextResponse.json(
        { error: "The number of teams cannot be changed here." },
        { status: 400 }
      );
    }

    const renameByName = new Map(
      previousNames.map((name, index) => [name, submittedNames[index]])
    );
    const rename = (name: string) => renameByName.get(name) || name;
    const draftOrder = Array.isArray(row.settings.draftOrder)
      ? row.settings.draftOrder.filter((name): name is string => typeof name === "string")
      : previousNames;
    const previousClaims = isRecord(row.settings.teamClaims) ? row.settings.teamClaims : {};
    const nextClaims = Object.fromEntries(
      Object.entries(previousClaims).map(([name, claimant]) => [rename(name), claimant])
    );
    const nextSettings = {
      ...row.settings,
      teamNames: submittedNames,
      draftOrder: draftOrder.map(rename),
      teamClaims: nextClaims,
    };

    const [picksResult, entriesResult] = await Promise.all([
      client
        .from("platform_draft_picks")
        .select("pick_index,selection_snapshot")
        .eq("pool_id", poolId),
      client
        .from("pool_entries")
        .select("id,team_name")
        .eq("pool_id", poolId),
    ]);
    if (picksResult.error || entriesResult.error) {
      return NextResponse.json(
        { error: picksResult.error?.message || entriesResult.error?.message },
        { status: 500 }
      );
    }

    const pickUpdates = (picksResult.data || []).flatMap((pick) => {
      if (!isRecord(pick.selection_snapshot)) return [];
      const previousTeam =
        typeof pick.selection_snapshot.team === "string"
          ? pick.selection_snapshot.team
          : "";
      const nextTeam = rename(previousTeam);
      if (!previousTeam || nextTeam === previousTeam) return [];
      return [
        client
          .from("platform_draft_picks")
          .update({
            selection_snapshot: { ...pick.selection_snapshot, team: nextTeam },
          })
          .eq("pool_id", poolId)
          .eq("pick_index", pick.pick_index),
      ];
    });
    const entryUpdates = (entriesResult.data || []).flatMap((entry) => {
      const previousTeam = typeof entry.team_name === "string" ? entry.team_name : "";
      const nextTeam = rename(previousTeam);
      if (!previousTeam || nextTeam === previousTeam) return [];
      return [
        client.from("pool_entries").update({ team_name: nextTeam }).eq("id", entry.id),
      ];
    });
    const relatedUpdates = await Promise.all([...pickUpdates, ...entryUpdates]);
    const relatedError = relatedUpdates.find((result) => result.error)?.error;
    if (relatedError) {
      return NextResponse.json({ error: relatedError.message }, { status: 500 });
    }

    const { error: updateError } = await client
      .from("platform_pools")
      .update({ settings: nextSettings })
      .eq("id", poolId)
      .eq("owner_id", organizerId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pool: nextSettings });
  }
  if (body.action === "commissioner-update-draft-pick") {
    const pickNumber = Number(body.pickNumber);
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
    const playerSnapshot = isRecord(body.playerSnapshot) ? body.playerSnapshot : null;
    if (
      !poolId ||
      !Number.isInteger(pickNumber) ||
      pickNumber < 1 ||
      !playerId ||
      !playerSnapshot ||
      playerSnapshot.id !== playerId
    ) {
      return NextResponse.json({ error: "Invalid replacement player." }, { status: 400 });
    }

    const { client, error: adminError } = getSupabaseAdmin();
    if (!client) return NextResponse.json({ error: adminError }, { status: 500 });
    const organizerId = await getAuthenticatedOrganizerId(request, client);
    if (!organizerId) {
      return NextResponse.json(
        { error: "Organizer sign-in is required to update a draft pick." },
        { status: 401 }
      );
    }

    const pickIndex = pickNumber - 1;
    const [poolResult, pickResult, duplicateResult] = await Promise.all([
      client
        .from("platform_pools")
        .select("owner_id")
        .eq("id", poolId)
        .eq("pool_type", "college_fantasy")
        .maybeSingle(),
      client
        .from("platform_draft_picks")
        .select("pick_index,selection_snapshot")
        .eq("pool_id", poolId)
        .eq("pick_index", pickIndex)
        .maybeSingle(),
      client
        .from("platform_draft_picks")
        .select("pick_index")
        .eq("pool_id", poolId)
        .eq("selection_id", playerId)
        .neq("pick_index", pickIndex)
        .limit(1)
        .maybeSingle(),
    ]);
    if (poolResult.error || pickResult.error || duplicateResult.error) {
      return NextResponse.json(
        {
          error:
            poolResult.error?.message ||
            pickResult.error?.message ||
            duplicateResult.error?.message,
        },
        { status: 500 }
      );
    }
    if (!poolResult.data) {
      return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    }
    if (organizerId !== poolResult.data.owner_id) {
      return NextResponse.json(
        { error: "Only the commissioner can update a draft pick." },
        { status: 403 }
      );
    }
    if (!pickResult.data || !isRecord(pickResult.data.selection_snapshot)) {
      return NextResponse.json({ error: "Draft pick not found." }, { status: 404 });
    }
    if (duplicateResult.data) {
      return NextResponse.json(
        { error: "That player is already drafted by another team." },
        { status: 409 }
      );
    }

    const currentSnapshot = pickResult.data.selection_snapshot;
    const nextSnapshot = {
      ...currentSnapshot,
      playerId,
      pickNumber,
      playerSnapshot,
    };
    const selectionName =
      typeof playerSnapshot.name === "string" && playerSnapshot.name.trim()
        ? playerSnapshot.name.trim()
        : playerId;
    const { data: updatedPick, error: updateError } = await client
      .from("platform_draft_picks")
      .update({
        selection_id: playerId,
        selection_name: selectionName,
        selection_snapshot: nextSnapshot,
      })
      .eq("pool_id", poolId)
      .eq("pick_index", pickIndex)
      .select("pick_index,selection_id,selection_snapshot,created_at")
      .single();
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pick: updatedPick });
  }
  if (body.action === "undo-last-pick") {
    if (!poolId) return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
    const { client, error: adminError } = getSupabaseAdmin();
    if (!client) return NextResponse.json({ error: adminError }, { status: 500 });
    const { data: row, error: poolError } = await client
      .from("platform_pools")
      .select("owner_id,settings")
      .eq("id", poolId)
      .eq("pool_type", "college_fantasy")
      .maybeSingle();
    if (poolError) return NextResponse.json({ error: poolError.message }, { status: 500 });
    if (!row || !isRecord(row.settings)) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    const organizerId = await getAuthenticatedOrganizerId(request, client);
    if (!organizerId || organizerId !== row.owner_id) {
      return NextResponse.json({ error: "Only the commissioner can undo a pick." }, { status: 403 });
    }
    const { data: latestPick, error: latestError } = await client
      .from("platform_draft_picks")
      .select("pick_index")
      .eq("pool_id", poolId)
      .order("pick_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) return NextResponse.json({ error: latestError.message }, { status: 500 });
    if (!latestPick) return NextResponse.json({ error: "There is no pick to undo." }, { status: 409 });
    const { error: deleteError } = await client
      .from("platform_draft_picks")
      .delete()
      .eq("pool_id", poolId)
      .eq("pick_index", latestPick.pick_index);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    const resumedAt = new Date().toISOString();
    const nextSettings = {
      ...row.settings,
      draftPaused: false,
      draftPausedRemaining: null,
      draftTimerStartedAt: resumedAt,
    };
    const { error: updateError } = await client.from("platform_pools").update({ settings: nextSettings }).eq("id", poolId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true, removedPickIndex: latestPick.pick_index, pool: nextSettings, serverNow: resumedAt });
  }
  if (body.action === "set-draft-pause") {
    if (!poolId) return NextResponse.json({ error: "Missing pool id." }, { status: 400 });
    const { client, error: adminError } = getSupabaseAdmin();
    if (!client) return NextResponse.json({ error: adminError }, { status: 500 });
    const { data: row, error: poolError } = await client
      .from("platform_pools")
      .select("owner_id,settings")
      .eq("id", poolId)
      .eq("pool_type", "college_fantasy")
      .maybeSingle();
    if (poolError) return NextResponse.json({ error: poolError.message }, { status: 500 });
    if (!row || !isRecord(row.settings)) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
    const organizerId = await getAuthenticatedOrganizerId(request, client);
    if (!organizerId || organizerId !== row.owner_id) {
      return NextResponse.json({ error: "Only the commissioner can pause the draft." }, { status: 403 });
    }
    const paused = body.paused === true;
    const pickClockSeconds = Math.max(0, Number(row.settings.pickClockSeconds) || 0);
    const remaining = Math.max(0, Math.min(pickClockSeconds, Number(body.remaining) || 0));
    const now = new Date();
    const nextSettings = {
      ...row.settings,
      draftPaused: paused,
      draftPausedRemaining: paused ? remaining : null,
      draftTimerStartedAt: paused
        ? row.settings.draftTimerStartedAt || null
        : new Date(now.getTime() - (pickClockSeconds - remaining) * 1000).toISOString(),
    };
    const { error: updateError } = await client.from("platform_pools").update({ settings: nextSettings }).eq("id", poolId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true, pool: nextSettings });
  }
  const currentName = typeof body.currentName === "string" ? body.currentName.trim() : "";
  const newName = typeof body.newName === "string" ? body.newName.trim().slice(0, 40) : "";
  const participantId = typeof body.participantId === "string" ? body.participantId.trim() : "";
  if (!poolId || !currentName || !newName || !participantId) {
    return NextResponse.json({ error: "Choose a team and enter a name." }, { status: 400 });
  }

  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: adminError }, { status: 500 });
  const [{ data: row, error: poolError }, { count: pickCount, error: picksError }] = await Promise.all([
    client.from("platform_pools").select("settings").eq("id", poolId).eq("pool_type", "college_fantasy").maybeSingle(),
    client.from("platform_draft_picks").select("pool_id", { count: "exact", head: true }).eq("pool_id", poolId),
  ]);
  if (poolError || picksError) return NextResponse.json({ error: poolError?.message || picksError?.message }, { status: 500 });
  if (!row || !isRecord(row.settings)) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if ((pickCount || 0) > 0) return NextResponse.json({ error: "Team names lock when the draft begins." }, { status: 409 });

  const settings = row.settings;
  const teamNames = Array.isArray(settings.teamNames)
    ? settings.teamNames.filter((name): name is string => typeof name === "string")
    : [];
  const draftOrder = Array.isArray(settings.draftOrder)
    ? settings.draftOrder.filter((name): name is string => typeof name === "string")
    : [];
  const teamClaims = isRecord(settings.teamClaims) ? { ...settings.teamClaims } : {};
  if (!teamNames.includes(currentName)) return NextResponse.json({ error: "That team is no longer available." }, { status: 409 });
  if (teamClaims[currentName] !== participantId) {
    return NextResponse.json({ error: "You can only rename the team you claimed." }, { status: 403 });
  }
  if (teamNames.some((name) => name !== currentName && name.toLowerCase() === newName.toLowerCase())) {
    return NextResponse.json({ error: "That team name is already in use." }, { status: 409 });
  }
  const rename = (name: string) => (name === currentName ? newName : name);
  delete teamClaims[currentName];
  teamClaims[newName] = participantId;
  const nextSettings = {
    ...settings,
    teamNames: teamNames.map(rename),
    draftOrder: draftOrder.map(rename),
    teamClaims,
  };
  const { error } = await client.from("platform_pools").update({ settings: nextSettings }).eq("id", poolId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { error: entryError } = await client
    .from("pool_entries")
    .update({ team_name: newName })
    .eq("pool_id", poolId)
    .eq("team_name", currentName)
    .is("revoked_at", null);
  if (entryError) console.error("Football pool entry rename failed", entryError);
  return NextResponse.json({ success: true, pool: nextSettings, claims: teamClaims });
}

export async function PUT(request: NextRequest) {
  const body: unknown = await request.json();
  if (!isRecord(body) || !isRecord(body.pool) || !Array.isArray(body.picks)) {
    return NextResponse.json({ error: "Invalid football pool payload." }, { status: 400 });
  }

  const pool = body.pool;
  const poolId = typeof pool.id === "string" ? pool.id.trim() : "";
  const teamNames = Array.isArray(pool.teamNames) ? pool.teamNames : [];
  const draftOrder = Array.isArray(pool.draftOrder) ? pool.draftOrder : [];

  if (!poolId || teamNames.length === 0 || draftOrder.length === 0) {
    return NextResponse.json({ error: "Incomplete football pool." }, { status: 400 });
  }

  const rawPicks = body.picks.filter(isRecord);
  const picks = rawPicks.map((pick, index) => ({
    pool_id: poolId,
    entry_id: "",
    pick_index: index,
    selection_type: "college_player",
    selection_id: String(pick.playerId || ""),
    selection_name:
      isRecord(pick.playerSnapshot) && typeof pick.playerSnapshot.name === "string"
        ? pick.playerSnapshot.name
        : String(pick.playerId || ""),
    selection_snapshot: {
      playerId: String(pick.playerId || ""),
      team: String(pick.team || ""),
      pickNumber: Number(pick.pickNumber) || index + 1,
      playerSnapshot: isRecord(pick.playerSnapshot) ? pick.playerSnapshot : null,
    },
    ...(typeof pick.pickedAt === "string" ? { created_at: pick.pickedAt } : {}),
  }));

  if (picks.some((pick) => !pick.selection_id || !pick.selection_snapshot.team)) {
    return NextResponse.json({ error: "Invalid football draft picks." }, { status: 400 });
  }

  const { client, error: adminError } = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json({ error: adminError }, { status: 500 });
  }

  const { data: existingPool, error: ownerLookupError } = await client
    .from("platform_pools")
    .select("owner_id")
    .eq("id", poolId)
    .maybeSingle();

  if (ownerLookupError) {
    return NextResponse.json({ error: ownerLookupError.message }, { status: 500 });
  }

  const organizerId = await getAuthenticatedOrganizerId(request, client);
  let ownerId = existingPool?.owner_id;
  if (!ownerId && !organizerId) {
    return NextResponse.json(
      { error: "Organizer sign-in is required to create a football pool." },
      { status: 401 }
    );
  }
  ownerId ||= organizerId;
  const isScheduled = pool.draftType === "scheduled";
  const normalizedPool = {
    ...pool,
    pickClockSeconds: isScheduled
      ? Math.max(30, Number(pool.pickClockSeconds) || 60)
      : 0,
    autoPickOnTimeout: isScheduled,
  };
  const { error: poolError } = await client.from("platform_pools").upsert(
    {
      id: poolId,
      owner_id: ownerId,
      name:
        typeof pool.poolName === "string" && pool.poolName.trim()
          ? pool.poolName.trim()
          : "College Football Pool",
      pool_type: "college_fantasy",
      settings: normalizedPool,
    },
    { onConflict: "id" }
  );

  if (poolError) {
    return NextResponse.json({ error: poolError.message }, { status: 500 });
  }

  if (picks.length > 0) {
    if (!organizerId || organizerId !== ownerId) {
      return NextResponse.json({ error: "Only the commissioner can replace saved draft picks." }, { status: 403 });
    }
    let commissionerEntryId: string;
    try {
      commissionerEntryId = await ensureDraftEntry({
        client,
        poolId,
        team: String(picks[0].selection_snapshot.team),
        seatNumber: Math.max(0, draftOrder.indexOf(picks[0].selection_snapshot.team)),
        organizerId,
        participantId: "",
      });
    } catch (entryError) {
      console.error("Football commissioner entry resolution failed", entryError);
      return NextResponse.json({ error: "The commissioner pool entry could not be saved." }, { status: 500 });
    }
    for (const pick of picks) pick.entry_id = commissionerEntryId;
  }

  if (picks.length > 0) {
    const { error: picksError } = await client
      .from("platform_draft_picks")
      .upsert(picks, { onConflict: "pool_id,pick_index" });

    if (picksError) {
      return NextResponse.json({ error: picksError.message }, { status: 500 });
    }
  }

  const stalePicks = client
    .from("platform_draft_picks")
    .delete()
    .eq("pool_id", poolId);
  const { error: deleteError } =
    picks.length === 0
      ? await stalePicks
      : await stalePicks.gte("pick_index", picks.length);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
