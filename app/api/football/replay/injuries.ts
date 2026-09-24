import { getFootballInjuryAvailability } from "../../../football/lib/storage";
import { getCoversNcaafInjuries } from "./covers";

const opticOddsBaseUrl = "https://api.opticodds.com/api/v3";
const rotoWireCfbInjuriesUrl =
  "https://api.rotowire.com/Football/CFB/Injuries.php";
const injuryCacheDurationMs = 5 * 60 * 1000;

type OpticOddsPage<T> = { data?: T[]; has_more?: boolean };

export type OpticOddsInjury = {
  player?: { id?: string; name?: string; position?: string };
  team?: { id?: string; name?: string };
  status?: string | null;
  type?: string | null;
};

type RotoWireInjury = {
  Id?: string | number;
  FirstName?: string;
  LastName?: string;
  Position?: string;
  InjuryStatus?: string | null;
  InjuryType?: string | null;
  Injury?: {
    Status?: string | null;
    Type?: string | null;
  } | null;
  Team?: {
    Id?: string | number;
    Code?: string;
    Name?: string;
  } | null;
};

type RotoWireEnvelope = {
  Players?: RotoWireInjury[];
};

export type CollegeFootballInjury = {
  source: "Covers" | "OpticOdds" | "RotoWire";
  sourcePlayerId?: string;
  opticOddsPlayerId?: string;
  playerName: string;
  teamName?: string;
  teamAbbreviation?: string;
  position?: string;
  status: string;
  type?: string;
};

export type CollegeFootballInjuryFeed = {
  injuries: CollegeFootballInjury[];
  coversCount: number;
  opticOddsCount: number;
  rotoWireCount: number;
  providers: string[];
  warning?: string;
};

let opticOddsCache:
  | { expiresAt: number; injuries: OpticOddsInjury[] }
  | undefined;
let rotoWireCache:
  | { expiresAt: number; injuries: CollegeFootballInjury[] }
  | undefined;

async function fetchOpticOddsPage<T>(path: string, key: string): Promise<T> {
  const response = await fetch(`${opticOddsBaseUrl}${path}`, {
    headers: { "X-Api-Key": key },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`OpticOdds injuries failed with ${response.status}`);
  }
  return response.json();
}

export async function getOpticOddsNcaafInjuries(key: string) {
  if (opticOddsCache && opticOddsCache.expiresAt > Date.now()) {
    return opticOddsCache.injuries;
  }

  const injuries: OpticOddsInjury[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await fetchOpticOddsPage<OpticOddsPage<OpticOddsInjury>>(
      `/injuries?league=ncaaf&page=${page}`,
      key
    );
    injuries.push(...(result.data || []));
    if (!result.has_more) break;
  }

  opticOddsCache = {
    expiresAt: Date.now() + injuryCacheDurationMs,
    injuries,
  };
  return injuries;
}

export async function getRotoWireNcaafInjuries(key: string) {
  if (rotoWireCache && rotoWireCache.expiresAt > Date.now()) {
    return rotoWireCache.injuries;
  }

  const url = new URL(rotoWireCfbInjuriesUrl);
  url.searchParams.set("key", key);
  url.searchParams.set("format", "json");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`RotoWire injuries failed with ${response.status}`);
  }

  const payload = (await response.json()) as RotoWireEnvelope;
  const injuries = (payload.Players || []).flatMap((player) => {
    const playerName = [player.FirstName, player.LastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const status = (player.Injury?.Status || player.InjuryStatus || "").trim();
    if (!playerName || !status) return [];

    return [{
      source: "RotoWire" as const,
      sourcePlayerId: player.Id == null ? undefined : String(player.Id),
      playerName,
      teamName:
        player.Team?.Name || player.Team?.Code ||
        (player.Team?.Id == null ? undefined : String(player.Team.Id)),
      position: player.Position,
      status,
      type: player.Injury?.Type || player.InjuryType || undefined,
    }];
  });

  rotoWireCache = {
    expiresAt: Date.now() + injuryCacheDurationMs,
    injuries,
  };
  return injuries;
}

function injurySeverity(status: string) {
  const availability = getFootballInjuryAvailability({ injuryStatus: status });
  if (availability === "out") return 3;
  if (/doubtful|^d$/i.test(status.trim())) return 2;
  if (/questionable|^q$|game[- ]time decision|^gtd$/i.test(status.trim())) {
    return 1;
  }
  return availability === "warning" ? 1 : 0;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(jr|sr|ii|iii|iv)$/i, "");
}

function normalizeTeam(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const teamAliases: Record<string, string> = {
  centralflorida: "ucf",
  connecticut: "uconn",
  fiupanthers: "floridainternational",
  massachusetts: "umass",
  miamifl: "miamiflorida",
  miamioh: "miamiohio",
  mississippi: "olemiss",
  northcarolinastate: "ncstate",
  southerncalifornia: "usc",
  southernmethodist: "smu",
  texassanantonio: "utsa",
  texaselpaso: "utep",
};

function canonicalTeam(value: string) {
  const normalized = normalizeTeam(value);
  return teamAliases[normalized] || normalized;
}

function positionMatches(left?: string, right?: string) {
  if (!left || !right) return true;
  const normalizePosition = (value: string) =>
    value.toUpperCase() === "PK" ? "K" : value.toUpperCase();
  return normalizePosition(left) === normalizePosition(right);
}

function teamMatches(
  injury: CollegeFootballInjury,
  player: { school?: string; schoolAbbreviation?: string }
) {
  const playerTeams = [player.school, player.schoolAbbreviation]
    .filter((value): value is string => Boolean(value))
    .map(canonicalTeam);
  const injuryTeams = [injury.teamName, injury.teamAbbreviation]
    .filter((value): value is string => Boolean(value))
    .map(canonicalTeam);
  return playerTeams.some((team) => injuryTeams.includes(team));
}

function personNameParts(value: string) {
  const parts = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (/^(jr|sr|ii|iii|iv)$/.test(parts.at(-1) || "")) parts.pop();
  return parts;
}

function abbreviatedNameMatches(injuryName: string, playerName: string) {
  const injuryParts = personNameParts(injuryName);
  const playerParts = personNameParts(playerName);
  if (injuryParts.length < 2 || playerParts.length < 2) return false;
  const [injuryFirst, ...injuryLastParts] = injuryParts;
  const [playerFirst, ...playerLastParts] = playerParts;
  return (
    injuryFirst.length === 1 &&
    injuryFirst === playerFirst[0] &&
    injuryLastParts.join("") === playerLastParts.join("")
  );
}

function chooseMostRestrictive(
  injuries: CollegeFootballInjury[]
): CollegeFootballInjury | undefined {
  return [...injuries].sort(
    (a, b) => injurySeverity(b.status) - injurySeverity(a.status)
  )[0];
}

export async function getCollegeFootballInjuryFeed({
  opticOddsKey,
  rotoWireKey,
}: {
  opticOddsKey?: string;
  rotoWireKey?: string;
}): Promise<CollegeFootballInjuryFeed> {
  const [coversResult, opticOddsResult, rotoWireResult] = await Promise.allSettled([
    getCoversNcaafInjuries(),
    opticOddsKey ? getOpticOddsNcaafInjuries(opticOddsKey) : Promise.resolve([]),
    rotoWireKey ? getRotoWireNcaafInjuries(rotoWireKey) : Promise.resolve([]),
  ]);
  const coversInjuries =
    coversResult.status === "fulfilled" ? coversResult.value : [];
  const opticOddsInjuries =
    opticOddsResult.status === "fulfilled" ? opticOddsResult.value : [];
  const rotoWireInjuries =
    rotoWireResult.status === "fulfilled" ? rotoWireResult.value : [];
  const normalizedOpticOdds = opticOddsInjuries.flatMap((injury) => {
    const playerName = injury.player?.name?.trim() || "";
    const status = injury.status?.trim() || "";
    if (!playerName || !status) return [];
    return [{
      source: "OpticOdds" as const,
      sourcePlayerId: injury.player?.id,
      opticOddsPlayerId: injury.player?.id,
      playerName,
      teamName: injury.team?.name,
      position: injury.player?.position,
      status,
      type: injury.type || undefined,
    }];
  });
  const normalizedCovers: CollegeFootballInjury[] = coversInjuries.map(
    (injury) => ({ source: "Covers", ...injury })
  );
  const injuries = [
    ...normalizedCovers,
    ...normalizedOpticOdds,
    ...rotoWireInjuries,
  ];
  const providers = [
    ...(normalizedCovers.length ? ["Covers"] : []),
    ...(normalizedOpticOdds.length ? ["OpticOdds"] : []),
    ...(rotoWireInjuries.length ? ["RotoWire"] : []),
  ];
  const failures = [
    coversResult.status === "rejected" ? "Covers" : "",
    opticOddsResult.status === "rejected" ? "OpticOdds" : "",
    rotoWireKey && rotoWireResult.status === "rejected" ? "RotoWire" : "",
  ].filter(Boolean);

  return {
    injuries,
    coversCount: normalizedCovers.length,
    opticOddsCount: normalizedOpticOdds.length,
    rotoWireCount: rotoWireInjuries.length,
    providers,
    warning: failures.length
      ? `${failures.join(" and ")} injury data could not be refreshed.`
      : !injuries.length
        ? "No active college football injuries were returned by the configured providers."
        : undefined,
  };
}

export function findCollegeFootballInjury(
  injuries: CollegeFootballInjury[],
  player: {
    opticOddsPlayerId?: string;
    name: string;
    school?: string;
    schoolAbbreviation?: string;
    position?: string;
  }
) {
  const exactProviderMatches = player.opticOddsPlayerId
    ? injuries.filter(
        (injury) => injury.opticOddsPlayerId === player.opticOddsPlayerId
      )
    : [];
  if (exactProviderMatches.length) {
    return chooseMostRestrictive(exactProviderMatches);
  }

  const name = normalizeName(player.name);
  const nameMatches = injuries.filter(
    (injury) =>
      normalizeName(injury.playerName) === name &&
      positionMatches(injury.position, player.position)
  );
  const hasTeam = Boolean(player.school || player.schoolAbbreviation);
  const matchingTeams = hasTeam
    ? nameMatches.filter((injury) => teamMatches(injury, player))
    : [];
  if (matchingTeams.length) return chooseMostRestrictive(matchingTeams);

  const abbreviatedMatches = hasTeam
    ? injuries.filter(
        (injury) =>
          abbreviatedNameMatches(injury.playerName, player.name) &&
          positionMatches(injury.position, player.position) &&
          teamMatches(injury, player)
      )
    : [];
  if (abbreviatedMatches.length) {
    return chooseMostRestrictive(abbreviatedMatches);
  }

  if (!nameMatches.length) return undefined;

  // Name-only matching is safe only when the feed has one player with that
  // normalized name and position. This prevents one school's injury from
  // excluding a different player who happens to share the same name.
  return nameMatches.length === 1
    ? chooseMostRestrictive(nameMatches)
    : undefined;
}
