import type { FootballPlayer } from "../../../football/lib/storage";
import type { FootballStatLine } from "../../../football/lib/scoringEngine";

const baseUrl = "https://api.opticodds.com/api/v3";
const fantasyPositions = new Set(["QB", "RB", "WR", "TE", "K", "PK"]);
const powerConferences = new Set(["ACC", "Big 10", "Big 12", "Pac-12", "SEC", "IndFBS"]);

type Page<T> = { data?: T[]; has_more?: boolean };
type Team = { id: string; name: string; division?: string; conference?: string | null };
type Player = { id: string; name: string; position: string; team?: { id: string; name: string } };
type Competitor = { id: string; name: string };
type Fixture = {
  id: string; start_date: string; status: string; is_live: boolean;
  season_year?: string; season_week?: string;
  home_competitors: Competitor[]; away_competitors: Competitor[];
};
type RawStats = Record<string, number | null | undefined>;
type PlayerResult = {
  player: { id: string }; team: { id: string };
  stats?: { period: string; stats: RawStats }[];
};
type ResultEnvelope = { fixture: Fixture; results?: PlayerResult[] };
type Odd = { player_id?: string | null; market_id?: string; points?: number | null; is_main?: boolean };
type OddsEnvelope = { odds?: Odd[] };

async function get<T>(path: string, key: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "X-Api-Key": key },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
  return response.json();
}

async function pages<T>(path: string, key: string, maxPages = 20) {
  const data: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await get<Page<T>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}`, key);
    data.push(...(result.data || []));
    if (!result.has_more) break;
  }
  return data;
}

function conferenceName(value?: string | null) {
  if (value === "Big 10") return "Big Ten";
  if (value === "IndFBS") return "Independents";
  return value || "Independent";
}

function statLine(stats: RawStats = {}): FootballStatLine {
  const n = (name: string) => Number(stats[name] || 0);
  return {
    passingAttempts: n("passing_attempts"), completions: n("passing_completions"),
    passingYards: n("passing_yards"), passingTds: n("passing_touchdowns"),
    interceptionsThrown: n("passing_interceptions"), rushingAttempts: n("rushing_attempts"),
    rushingYards: n("rushing_yards"), rushingTds: n("rushing_touchdowns"),
    receptions: n("receptions"), receivingTargets: n("receiving_targets"),
    receivingYards: n("receiving_yards"), receivingTds: n("receiving_touchdowns"),
    sacks: n("sacks"), defenseInterceptions: n("interceptions"),
    fumbleRecoveries: n("fumbles_recovered"), defenseTds: n("defensive_touchdowns"),
    returnTds: n("kick_return_touchdowns") + n("punt_return_touchdowns"),
    extraPointsMade: n("extra_points_made"),
    extraPointsMissed: Math.max(0, n("extra_point_attempts") - n("extra_points_made")),
    fieldGoalsMade: n("field_goals_made"),
    fieldGoalsMissed: Math.max(0, n("field_goal_attempts") - n("field_goals_made")),
    fieldGoals50Plus: n("long_field_goal_made") >= 50 ? 1 : 0,
    fumblesLost: n("fumbles_lost"),
  } as FootballStatLine;
}

function projectedPoints(stats: FootballStatLine) {
  return Number((
    (stats.passingYards || 0) / 25 + (stats.passingTds || 0) * 4 - (stats.interceptionsThrown || 0) * 2 +
    (stats.rushingYards || 0) / 10 + (stats.rushingTds || 0) * 6 +
    (stats.receptions || 0) + (stats.receivingYards || 0) / 10 + (stats.receivingTds || 0) * 6 +
    (stats.extraPointsMade || 0) + (stats.fieldGoalsMade || 0) * 3 -
    (stats.fumblesLost || 0) * 2
  ).toFixed(1));
}

function schedule(fixtures: Fixture[], teamId: string) {
  const game = fixtures
    .filter((fixture) => fixture.status === "unplayed" || fixture.is_live)
    .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date))
    .find((fixture) => fixture.home_competitors[0]?.id === teamId || fixture.away_competitors[0]?.id === teamId);
  if (!game) return { opponent: "No scheduled game", gameTime: "TBD" };
  const home = game.home_competitors[0];
  const away = game.away_competitors[0];
  const atHome = home.id === teamId;
  return {
    opponent: `${atHome ? "vs" : "@"} ${atHome ? away.name : home.name}`,
    gameTime: new Intl.DateTimeFormat("en-US", {
      weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
    }).format(new Date(game.start_date)),
  };
}

const propMap: Record<string, keyof FootballStatLine> = {
  player_passing_attempts: "passingAttempts", player_passing_completions: "completions",
  player_passing_yards: "passingYards", player_passing_touchdowns: "passingTds",
  player_interceptions: "interceptionsThrown", player_rushing_attempts: "rushingAttempts",
  player_rushing_yards: "rushingYards", player_rushing_touchdowns: "rushingTds",
  player_receptions: "receptions", player_receiving_targets: "receivingTargets",
  player_receiving_yards: "receivingYards", player_receiving_touchdowns: "receivingTds",
  player_extra_points_made: "extraPointsMade", player_field_goals_made: "fieldGoalsMade",
};

export async function getOpticOddsFootball(key: string) {
  const teams = (await pages<Team>("/teams?league=ncaaf&division=FBS", key, 3))
    .filter((team) => powerConferences.has(team.conference || ""));
  const teamIds = new Set(teams.map((team) => team.id));
  const teamBatches = Array.from(
    { length: Math.ceil(teams.length / 10) },
    (_, index) => teams.slice(index * 10, index * 10 + 10)
  );
  const now = Date.now();
  const from = encodeURIComponent(new Date(now - 9 * 86400000).toISOString());
  const to = encodeURIComponent(new Date(now + 9 * 86400000).toISOString());
  const [playerBatches, fixtures] = await Promise.all([
    Promise.all(teamBatches.map((batch) => {
      const ids = batch.map((team) => `team_id=${encodeURIComponent(team.id)}`).join("&");
      return pages<Player>(`/players?league=ncaaf&${ids}`, key, 10);
    })),
    pages<Fixture>(`/fixtures?league=ncaaf&start_date_after=${from}&start_date_before=${to}`, key, 5),
  ]);
  const players = playerBatches.flat();
  const games = fixtures.filter((fixture) => {
    const home = fixture.home_competitors[0]?.id;
    const away = fixture.away_competitors[0]?.id;
    return teamIds.has(home) || teamIds.has(away);
  });
  const completed = games.filter((game) => game.status === "completed");
  const upcoming = games.filter((game) => game.status === "unplayed" || game.is_live);
  const [resultCalls, oddsCalls] = await Promise.all([
    Promise.all(completed.map((game) => get<{ data?: ResultEnvelope[] }>(`/fixtures/player-results?fixture_id=${game.id}`, key).catch(() => ({ data: [] })))),
    Promise.all(upcoming.map((game) => get<{ data?: OddsEnvelope[] }>(`/fixtures/odds?fixture_id=${game.id}&sportsbook=DraftKings&is_main=true`, key).catch(() => ({ data: [] })))),
  ]);
  const results = new Map<string, { fixture: Fixture; result: PlayerResult }[]>();
  resultCalls.flatMap((call) => call.data || []).forEach((envelope) => {
    (envelope.results || []).forEach((result) => {
      const list = results.get(result.player.id) || [];
      list.push({ fixture: envelope.fixture, result });
      results.set(result.player.id, list);
    });
  });
  const props = new Map<string, FootballStatLine>();
  oddsCalls.flatMap((call) => call.data || []).flatMap((item) => item.odds || []).forEach((odd) => {
    const field = odd.market_id ? propMap[odd.market_id] : undefined;
    if (!odd.player_id || !field || odd.points == null || odd.is_main === false) return;
    const projection = props.get(odd.player_id) || {};
    if (projection[field] == null) projection[field] = odd.points;
    props.set(odd.player_id, projection);
  });
  const normalized: FootballPlayer[] = players
    .filter((player) => fantasyPositions.has(player.position) && player.team && teamIds.has(player.team.id))
    .map((player) => {
      const team = teams.find((candidate) => candidate.id === player.team!.id)!;
      const history = (results.get(player.id) || []).sort((a, b) => Date.parse(a.fixture.start_date) - Date.parse(b.fixture.start_date));
      const logs = history.map(({ fixture, result }) => ({
        id: `${fixture.id}-${player.id}`, week: `W${fixture.season_week || "-"}`,
        opponent: schedule([fixture], team.id).opponent,
        statLine: statLine(result.stats?.find((row) => row.period === "all")?.stats),
      }));
      const recent = logs.at(-1)?.statLine || {};
      const projectedStats = { ...recent, ...(props.get(player.id) || {}) };
      const next = schedule(upcoming, team.id);
      return {
        id: `oo-${player.id}`, name: player.name, school: team.name,
        conference: conferenceName(team.conference),
        position: (player.position === "PK" ? "K" : player.position) as FootballPlayer["position"],
        rank: 9999, projected: projectedPoints(projectedStats),
        opponent: next.opponent, gameTime: next.gameTime,
        averageStats: recent, projectedStats, gameLogs: logs,
      };
    });
  const defenses: FootballPlayer[] = teams.map((team) => {
    const next = schedule(upcoming, team.id);
    return {
      id: `oo-dst-${team.id}`, name: `${team.name} D/ST`, school: team.name,
      conference: conferenceName(team.conference), position: "DST", rank: 9999,
      projected: 0, opponent: next.opponent, gameTime: next.gameTime,
      averageStats: {}, projectedStats: {}, gameLogs: [],
    };
  });
  const eligible = [...normalized, ...defenses]
    .filter((player) => /^(vs|@)\s+\S+/.test(player.opponent))
    .sort((a, b) => b.projected - a.projected || a.name.localeCompare(b.name))
    .map((player, index) => ({ ...player, rank: index + 1 }));
  const sample = games[0];
  return {
    mode: "live",
    replay: {
      season: sample?.season_year || String(new Date().getFullYear()), seasonType: "reg",
      week: Number(sample?.season_week || 0), hasReplayKey: true, error: null,
      endpoints: { teams: `${baseUrl}/teams`, players: `${baseUrl}/players`, fixtures: `${baseUrl}/fixtures`, odds: `${baseUrl}/fixtures/odds`, playerResults: `${baseUrl}/fixtures/player-results` },
      metadata: { provider: "OpticOdds", teams: teams.length, fixtures: games.length, completedFixtures: completed.length, upcomingFixtures: upcoming.length, playersWithPropProjections: props.size },
    },
    playerPool: {
      source: "OpticOdds NCAAF live data", count: eligible.length,
      conferences: [...new Set(eligible.map((player) => player.conference))].sort(), players: eligible,
    },
  };
}
