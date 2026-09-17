import {
  getFootballInjuryAvailability,
  type FootballPlayer,
} from "../../../football/lib/storage";
import type { FootballStatLine } from "../../../football/lib/scoringEngine";
import {
  getCurrentCollegeFootballSeasonYear,
  getCurrentCollegeFootballWeek,
} from "../../../football/lib/collegeWeek";
import { getEspnFallbackGames } from "./espn";

const baseUrl = "https://api.opticodds.com/api/v3";
const fantasyPositions = new Set(["QB", "RB", "WR", "TE", "K", "PK"]);
const powerConferences = new Set(["ACC", "Big 10", "Big 12", "Pac-12", "SEC", "IndFBS"]);

type Page<T> = { data?: T[]; has_more?: boolean };
type Team = { id: string; name: string; abbreviation?: string; division?: string; conference?: string | null };
type Player = { id: string; name: string; position: string; team?: { id: string; name: string } };
type Competitor = { id: string; name: string };
type Fixture = {
  id: string; start_date: string; status: string; is_live: boolean;
  season_year?: string; season_week?: string;
  home_competitors: Competitor[]; away_competitors: Competitor[];
  result?: {
    scores?: {
      home?: { total?: number | null };
      away?: { total?: number | null };
    };
    in_play_data?: {
      period?: string | number | null;
      period_number?: string | number | null;
      clock?: string | null;
    };
  } | null;
};
type RawStats = Record<string, number | null | undefined>;
type PlayerResult = {
  player: { id: string }; team: { id: string };
  stats?: { period: string; stats: RawStats }[];
};
type ResultEnvelope = { fixture: Fixture; results?: PlayerResult[] };
type Odd = { player_id?: string | null; market_id?: string; points?: number | null; is_main?: boolean };
type OddsEnvelope = { odds?: Odd[] };
export type OpticOddsInjury = {
  player?: { id?: string; name?: string };
  team?: { id?: string; name?: string };
  status?: string | null;
  type?: string | null;
};

let ncaafInjuryCache:
  | { expiresAt: number; injuries: OpticOddsInjury[] }
  | undefined;

async function get<T>(path: string, key: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "X-Api-Key": key },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
  return response.json();
}

async function pages<T>(path: string, key: string, maxPages?: number) {
  const data: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await get<Page<T>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}`, key);
    data.push(...(result.data || []));
    if (!result.has_more || (maxPages != null && page >= maxPages)) break;
  }
  return data;
}

export async function getOpticOddsNcaafInjuries(key: string) {
  if (ncaafInjuryCache && ncaafInjuryCache.expiresAt > Date.now()) {
    return ncaafInjuryCache.injuries;
  }
  const injuries = await pages<OpticOddsInjury>("/injuries?league=ncaaf", key, 10);
  ncaafInjuryCache = {
    expiresAt: Date.now() + 5 * 60 * 1000,
    injuries,
  };
  return injuries;
}

function conferenceName(value?: string | null) {
  if (value === "Big 10") return "Big Ten";
  if (value === "IndFBS") return "Independents";
  return value || "Independent";
}

function statLine(stats: RawStats = {}): FootballStatLine {
  const n = (name: string) => Number(stats[name] || 0);
  const twoPointConversions = n("two_point_conversions") ||
    n("passing_two_point_conversions") +
      n("rushing_two_point_conversions") +
      n("receiving_two_point_conversions");
  return {
    passingAttempts: n("passing_attempts"), completions: n("passing_completions"),
    passingYards: n("passing_yards"), passingTds: n("passing_touchdowns"),
    interceptionsThrown: n("passing_interceptions"), rushingAttempts: n("rushing_attempts"),
    rushingYards: n("rushing_yards"), rushingTds: n("rushing_touchdowns"),
    receptions: n("receptions"), receivingTargets: n("receiving_targets"),
    receivingYards: n("receiving_yards"), receivingTds: n("receiving_touchdowns"),
    sacks: n("sacks"), defenseInterceptions: n("interceptions"),
    fumbleRecoveries: n("fumbles_recovered"), defenseTds: n("defensive_touchdowns"),
    safeties: n("safeties"), blockedKicks: n("blocked_kicks"),
    returnTds: n("kick_return_touchdowns") + n("punt_return_touchdowns"),
    extraPointsMade: n("extra_points_made"),
    extraPointsMissed: Math.max(0, n("extra_point_attempts") - n("extra_points_made")),
    fieldGoalsMade: n("field_goals_made"),
    fieldGoalsMissed: Math.max(0, n("field_goal_attempts") - n("field_goals_made")),
    fieldGoals50Plus: n("long_field_goal_made") >= 50 ? 1 : 0,
    fumblesLost: n("fumbles_lost"),
    twoPointConversions,
  } as FootballStatLine;
}

function addDefenseStats(total: FootballStatLine, stats: FootballStatLine) {
  total.sacks = (total.sacks || 0) + (stats.sacks || 0);
  total.defenseInterceptions =
    (total.defenseInterceptions || 0) + (stats.defenseInterceptions || 0);
  total.fumbleRecoveries =
    (total.fumbleRecoveries || 0) + (stats.fumbleRecoveries || 0);
  total.defenseTds = (total.defenseTds || 0) + (stats.defenseTds || 0);
  total.safeties = (total.safeties || 0) + (stats.safeties || 0);
  total.blockedKicks = (total.blockedKicks || 0) + (stats.blockedKicks || 0);
  total.returnTds = (total.returnTds || 0) + (stats.returnTds || 0);
  return total;
}

function averageGameStats(logs: { statLine: FootballStatLine }[]) {
  if (!logs.length) return {};
  const total = logs.reduce((sum, log) => {
    (Object.keys(log.statLine) as (keyof FootballStatLine)[]).forEach((key) => {
      sum[key] = (sum[key] || 0) + (log.statLine[key] || 0);
    });
    return sum;
  }, {} as FootballStatLine);
  (Object.keys(total) as (keyof FootballStatLine)[]).forEach((key) => {
    total[key] = Number(((total[key] || 0) / logs.length).toFixed(2));
  });
  return total;
}

function batchesOf<T>(items: T[], size: number) {
  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, index * size + size)
  );
}

function normalizeDefenseTouchdowns(stats: FootballStatLine) {
  const returnTds = stats.returnTds || 0;
  const providerDefensiveTds = stats.defenseTds || 0;

  return {
    ...stats,
    // OpticOdds' defensive_touchdowns is an umbrella value that also includes
    // kick and punt return scores. Return TDs have their own scoring category,
    // so remove that overlap before calculating D/ST fantasy points.
    defenseTds: Math.max(0, providerDefensiveTds - returnTds),
  };
}

function projectedPoints(stats: FootballStatLine) {
  return Number((
    (stats.passingYards || 0) / 25 + (stats.passingTds || 0) * 4 - (stats.interceptionsThrown || 0) * 2 +
    (stats.rushingYards || 0) / 10 + (stats.rushingTds || 0) * 6 +
    (stats.receptions || 0) + (stats.receivingYards || 0) / 10 + (stats.receivingTds || 0) * 6 +
    (stats.extraPointsMade || 0) + (stats.fieldGoalsMade || 0) * 3 -
    (stats.fumblesLost || 0) * 2 + (stats.sacks || 0) +
    (stats.defenseInterceptions || 0) * 2 + (stats.fumbleRecoveries || 0) * 2 +
    (stats.defenseTds || 0) * 6 + (stats.safeties || 0) * 2 +
    (stats.blockedKicks || 0) * 2 + (stats.returnTds || 0) * 6
  ).toFixed(1));
}

function schedule(fixtures: Fixture[], teamId: string) {
  const game = fixtures
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

function opponentForFixture(fixture: Fixture, teamId: string) {
  const home = fixture.home_competitors[0];
  const away = fixture.away_competitors[0];
  const atHome = home?.id === teamId;
  return `${atHome ? "vs" : "@"} ${atHome ? away?.name : home?.name}`;
}

function periodLabel(value: string | number | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Live";
  if (/^\d+$/.test(raw)) {
    const period = Number(raw);
    if (period <= 4) return `Q${period}`;
    return period === 5 ? "OT" : `${period - 4}OT`;
  }
  if (/^q\d+$/i.test(raw)) return raw.toUpperCase();
  if (/half/i.test(raw)) return "Halftime";
  if (/overtime|^ot$/i.test(raw)) return "OT";
  return raw;
}

function gameStatusForFixture(fixture: Fixture | undefined, teamId: string) {
  if (!fixture) return "";
  const homeScore = fixture.result?.scores?.home?.total;
  const awayScore = fixture.result?.scores?.away?.total;
  if (typeof homeScore !== "number" || typeof awayScore !== "number") return "";
  const isHomeTeam = fixture.home_competitors[0]?.id === teamId;
  const teamScore = isHomeTeam ? homeScore : awayScore;
  const opponentScore = isHomeTeam ? awayScore : homeScore;
  const score = `${teamScore}–${opponentScore}`;
  if (fixture.status === "completed") return `Final • ${score}`;
  if (fixture.is_live || fixture.status === "live") {
    const period = fixture.result?.in_play_data?.period_number ?? fixture.result?.in_play_data?.period;
    return `${periodLabel(period)} • ${score}`;
  }
  return "";
}

const propMap: Record<string, keyof FootballStatLine> = {
  player_passing_attempts: "passingAttempts", player_passing_completions: "completions",
  player_passing_yards: "passingYards", player_passing_touchdowns: "passingTds",
  player_interceptions: "interceptionsThrown", player_rushing_attempts: "rushingAttempts",
  player_rushing_yards: "rushingYards", player_rushing_touchdowns: "rushingTds",
  player_receptions: "receptions", player_receiving_targets: "receivingTargets",
  player_receiving_yards: "receivingYards", player_receiving_touchdowns: "receivingTds",
  player_extra_points_made: "extraPointsMade", player_field_goals_made: "fieldGoalsMade",
  player_two_point_conversions: "twoPointConversions",
};

export async function getOpticOddsFootball(
  key: string,
  options: { week?: number; seasonYear?: number } = {}
) {
  const selectedWeek = options.week || getCurrentCollegeFootballWeek();
  const selectedSeasonYear =
    options.seasonYear || getCurrentCollegeFootballSeasonYear();
  const fixtureWeeks = Array.from(
    { length: selectedWeek },
    (_, index) => index + 1
  );
  const teams = (await pages<Team>("/teams?league=ncaaf&division=FBS", key, 3))
    .filter((team) => powerConferences.has(team.conference || ""));
  const teamIds = new Set(teams.map((team) => team.id));
  const teamBatches = Array.from(
    { length: Math.ceil(teams.length / 10) },
    (_, index) => teams.slice(index * 10, index * 10 + 10)
  );
  const [playerBatches, fixtures, injuries] = await Promise.all([
    Promise.all(teamBatches.map((batch) => {
      const ids = batch.map((team) => `team_id=${encodeURIComponent(team.id)}`).join("&");
      // Player batches can exceed 1,000 records. Follow OpticOdds pagination
      // through its final page so late-page players are not silently omitted.
      return pages<Player>(`/players?league=ncaaf&${ids}`, key);
    })),
    Promise.all(
      fixtureWeeks.map((week) =>
        pages<Fixture>(
          `/fixtures?league=ncaaf&season_year=${selectedSeasonYear}&season_week=${week}`,
          key,
          5
        )
      )
    ).then((weekResults) => {
      const byId = new Map<string, Fixture>();
      weekResults.flat().forEach((fixture) => byId.set(fixture.id, fixture));
      return [...byId.values()];
    }),
    getOpticOddsNcaafInjuries(key).catch(() => []),
  ]);
  const players = playerBatches.flat();
  const injuriesByPlayer = new Map<string, OpticOddsInjury>();
  injuries.forEach((injury) => {
    const playerId = injury.player?.id;
    if (!playerId) return;
    const existing = injuriesByPlayer.get(playerId);
    if (
      !existing ||
      getFootballInjuryAvailability({ injuryStatus: injury.status || undefined }) === "out"
    ) {
      injuriesByPlayer.set(playerId, injury);
    }
  });
  const games = fixtures.filter((fixture) => {
    const home = fixture.home_competitors[0]?.id;
    const away = fixture.away_competitors[0]?.id;
    return teamIds.has(home) || teamIds.has(away);
  });
  const completed = games.filter((game) => game.status === "completed");
  const selectedWeekGames = games.filter(
    (game) => Number(game.season_week) === selectedWeek
  );
  const scoringGames = games.filter(
    (game) => game.status === "completed" || game.is_live
  );
  const upcoming = selectedWeekGames.filter((game) => game.status === "unplayed" || game.is_live);
  const scoringGameBatches = batchesOf(scoringGames, 20);
  const [resultCalls, oddsCalls] = await Promise.all([
    Promise.all(scoringGameBatches.map((batch) => {
      const fixtureIds = batch
        .map((game) => `fixture_id=${encodeURIComponent(game.id)}`)
        .join("&");
      return get<{ data?: ResultEnvelope[] }>(
        `/fixtures/player-results?${fixtureIds}`,
        key
      ).catch(() => ({ data: [] }));
    })),
    Promise.all(upcoming.map((game) => get<{ data?: OddsEnvelope[] }>(`/fixtures/odds?fixture_id=${game.id}&sportsbook=DraftKings&is_main=true`, key).catch(() => ({ data: [] })))),
  ]);
  const resultEnvelopes = resultCalls.flatMap((call) => call.data || []);
  const resultsByFixture = new Map<string, ResultEnvelope[]>();
  resultEnvelopes.forEach((envelope) => {
    const list = resultsByFixture.get(envelope.fixture.id) || [];
    list.push(envelope);
    resultsByFixture.set(envelope.fixture.id, list);
  });
  const missingResultGames = scoringGames.filter((game) => {
    const rows = (resultsByFixture.get(game.id) || []).flatMap(
      (envelope) => envelope.results || []
    );
    return [game.home_competitors[0]?.id, game.away_competitors[0]?.id]
      .filter((teamId) => teamId && teamIds.has(teamId))
      .some((teamId) => !rows.some((result) => result.team.id === teamId));
  });
  const fallbackGames = await getEspnFallbackGames(
    missingResultGames.flatMap((game) => {
      const home = game.home_competitors[0];
      const away = game.away_competitors[0];
      if (!home || !away) return [];
      const homeTeam = teams.find((team) => team.id === home.id);
      const awayTeam = teams.find((team) => team.id === away.id);
      return [{
        id: game.id,
        startDate: game.start_date,
        home: { ...home, abbreviation: homeTeam?.abbreviation },
        away: { ...away, abbreviation: awayTeam?.abbreviation },
      }];
    }),
    selectedSeasonYear
  );
  const results = new Map<string, { fixture: Fixture; statLine: FootballStatLine }[]>();
  const defenseResults = new Map<string, { fixture: Fixture; statLine: FootballStatLine }[]>();
  resultEnvelopes.forEach((envelope) => {
    (envelope.results || []).forEach((result) => {
      const list = results.get(result.player.id) || [];
      const allStats = statLine(
        result.stats?.find((row) => row.period === "all")?.stats
      );
      list.push({ fixture: envelope.fixture, statLine: allStats });
      results.set(result.player.id, list);

      if (!teamIds.has(result.team.id)) return;
      let teamGame = defenseResults
        .get(result.team.id)
        ?.find((entry) => entry.fixture.id === envelope.fixture.id);
      if (!teamGame) {
        teamGame = { fixture: envelope.fixture, statLine: {} };
        const teamGames = defenseResults.get(result.team.id) || [];
        teamGames.push(teamGame);
        defenseResults.set(result.team.id, teamGames);
      }
      addDefenseStats(teamGame.statLine, allStats);
    });
  });
  const playerNameKey = (name: string) => name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(jr|sr|ii|iii|iv)$/i, "");
  fallbackGames.forEach((fallbackGame) => {
    const fixture = scoringGames.find((game) => game.id === fallbackGame.fixtureId);
    if (!fixture) return;
    fallbackGame.teams.forEach((fallbackTeam) => {
      const teamPlayers = players.filter(
        (player) => player.team?.id === fallbackTeam.teamId
      );
      fallbackTeam.players.forEach((fallbackPlayer) => {
        const fallbackName = playerNameKey(fallbackPlayer.name);
        const player = teamPlayers.find(
          (candidate) => playerNameKey(candidate.name) === fallbackName
        );
        if (!player) return;
        const list = results.get(player.id) || [];
        if (!list.some((entry) => entry.fixture.id === fixture.id)) {
          list.push({ fixture, statLine: fallbackPlayer.statLine });
          results.set(player.id, list);
        }
      });
      const teamGames = defenseResults.get(fallbackTeam.teamId) || [];
      if (!teamGames.some((entry) => entry.fixture.id === fixture.id)) {
        teamGames.push({ fixture, statLine: fallbackTeam.defense });
        defenseResults.set(fallbackTeam.teamId, teamGames);
      }
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
      const logs = history.map(({ fixture, statLine: gameStats }) => ({
        id: `${fixture.id}-${player.id}`, week: `W${fixture.season_week || "-"}`,
        opponent: opponentForFixture(fixture, team.id),
        statLine: gameStats,
      }));
      const currentResult = history.find(
        ({ fixture }) => Number(fixture.season_week) === selectedWeek
      );
      const averageStats = averageGameStats(logs);
      const projectedStats = { ...averageStats, ...(props.get(player.id) || {}) };
      const selectedGame = schedule(selectedWeekGames, team.id);
      const selectedFixture = selectedWeekGames.find(
        (fixture) => fixture.home_competitors[0]?.id === team.id || fixture.away_competitors[0]?.id === team.id
      );
      const injury = injuriesByPlayer.get(player.id);
      return {
        id: `oo-${player.id}`, name: player.name, school: team.name,
        schoolAbbreviation: team.abbreviation || team.name,
        conference: conferenceName(team.conference),
        position: (player.position === "PK" ? "K" : player.position) as FootballPlayer["position"],
        rank: 9999, projected: projectedPoints(projectedStats),
        opponent: selectedGame.opponent, gameTime: selectedGame.gameTime,
        gameStartAt: selectedFixture?.start_date,
        gameStatus: gameStatusForFixture(selectedFixture, team.id),
        injuryStatus: injury?.status || undefined,
        injuryType: injury?.type || undefined,
        averageStats, projectedStats,
        liveStats: currentResult?.statLine,
        gameLogs: logs,
      };
    });
  const defenses: FootballPlayer[] = teams.map((team) => {
    const selectedGame = schedule(selectedWeekGames, team.id);
    const selectedFixture = selectedWeekGames.find(
      (fixture) => fixture.home_competitors[0]?.id === team.id || fixture.away_competitors[0]?.id === team.id
    );
    const teamResults = (defenseResults.get(team.id) || []).sort(
      (a, b) => Date.parse(a.fixture.start_date) - Date.parse(b.fixture.start_date)
    );
    const currentResult = teamResults.find(
      ({ fixture }) => Number(fixture.season_week) === selectedWeek
    );
    const logs = teamResults.map(({ fixture, statLine: gameStats }) => ({
        id: `${fixture.id}-dst-${team.id}`,
        week: `W${fixture.season_week || "-"}`,
        opponent: opponentForFixture(fixture, team.id),
        statLine: normalizeDefenseTouchdowns(gameStats),
      }));
    const averageStats = averageGameStats(logs);
    return {
      id: `oo-dst-${team.id}`, name: `${team.name} D/ST`, school: team.name,
      schoolAbbreviation: team.abbreviation || team.name,
      conference: conferenceName(team.conference), position: "DST", rank: 9999,
      projected: projectedPoints(averageStats), opponent: selectedGame.opponent, gameTime: selectedGame.gameTime,
      gameStartAt: selectedFixture?.start_date,
      gameStatus: gameStatusForFixture(selectedFixture, team.id),
      averageStats, projectedStats: averageStats,
      liveStats: currentResult
        ? normalizeDefenseTouchdowns(currentResult.statLine)
        : undefined,
      gameLogs: logs,
    };
  });
  const scheduledPlayers = [...normalized, ...defenses]
    .filter((player) => /^(vs|@)\s+\S+/.test(player.opponent));
  const eligible = scheduledPlayers
    .filter((player) => getFootballInjuryAvailability(player) !== "out")
    .sort((a, b) => b.projected - a.projected || a.name.localeCompare(b.name))
    .map((player, index) => ({ ...player, rank: index + 1 }));
  const unavailable = scheduledPlayers
    .filter((player) => getFootballInjuryAvailability(player) === "out")
    .sort((a, b) => a.name.localeCompare(b.name));
  const sample = selectedWeekGames[0] || games[0];
  return {
    mode: "live",
    replay: {
      season: sample?.season_year || String(new Date().getFullYear()), seasonType: "reg",
      week: selectedWeek, hasReplayKey: true, error: null,
      endpoints: { teams: `${baseUrl}/teams`, players: `${baseUrl}/players`, fixtures: `${baseUrl}/fixtures`, odds: `${baseUrl}/fixtures/odds`, playerResults: `${baseUrl}/fixtures/player-results` },
      metadata: { provider: "OpticOdds", teams: teams.length, fixtures: games.length, completedFixtures: completed.length, upcomingFixtures: upcoming.length, playersWithPropProjections: props.size, fallbackFixtures: fallbackGames.length, activeInjuries: injuries.length, excludedInjuries: unavailable.length },
    },
    playerPool: {
      source: "OpticOdds NCAAF live data", count: eligible.length,
      conferences: [...new Set(eligible.map((player) => player.conference))].sort(), players: eligible,
      unavailablePlayers: unavailable,
    },
  };
}
