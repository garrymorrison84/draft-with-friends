import type { FootballStatLine } from "../../../football/lib/scoringEngine";

const espnBase =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football";

export type EspnFallbackFixture = {
  id: string;
  startDate: string;
  home: { id: string; name: string; abbreviation?: string };
  away: { id: string; name: string; abbreviation?: string };
};

export type EspnFallbackTeam = {
  teamId: string;
  players: { name: string; statLine: FootballStatLine }[];
  defense: FootballStatLine;
};

export type EspnFallbackGame = {
  fixtureId: string;
  teams: EspnFallbackTeam[];
};

type EspnTeam = {
  id: string;
  abbreviation?: string;
  location?: string;
  displayName?: string;
  shortDisplayName?: string;
  slug?: string;
};

type EspnAthleteRow = {
  athlete?: { displayName?: string };
  stats?: string[];
};

type EspnStatGroup = {
  name?: string;
  labels?: string[];
  athletes?: EspnAthleteRow[];
};

type EspnSummaryTeam = {
  team?: EspnTeam;
  statistics?: EspnStatGroup[];
};

type EspnSummary = {
  header?: {
    competitions?: {
      competitors?: { homeAway?: "home" | "away"; team?: EspnTeam }[];
    }[];
  };
  boxscore?: {
    players?: EspnSummaryTeam[];
    teams?: {
      team?: EspnTeam;
      statistics?: { name?: string; displayValue?: string }[];
    }[];
  };
};

type EspnSchedule = {
  events?: { id?: string; date?: string }[];
};

function normalized(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function normalizedPlayer(value?: string) {
  return normalized(value).replace(/(jr|sr|ii|iii|iv)$/i, "");
}

async function espnGet<T>(path: string): Promise<T> {
  const response = await fetch(`${espnBase}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`ESPN fallback ${path} failed with ${response.status}`);
  }
  return response.json();
}

function teamMatchScore(
  source: { name: string; abbreviation?: string },
  candidate: EspnTeam
) {
  const sourceName = normalized(source.name);
  const candidateNames = [
    candidate.location,
    candidate.displayName,
    candidate.shortDisplayName,
    candidate.slug,
  ].map(normalized);

  if (candidateNames.includes(sourceName)) return 100;
  if (
    source.abbreviation &&
    normalized(source.abbreviation) === normalized(candidate.abbreviation)
  ) {
    return 90;
  }
  if (candidateNames.some((name) => name.startsWith(sourceName))) return 70;
  return 0;
}

function findEspnTeam(
  teams: EspnTeam[],
  source: { name: string; abbreviation?: string }
) {
  return teams
    .map((team) => ({ team, score: teamMatchScore(source, team) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0]?.team;
}

function statIndex(group: EspnStatGroup | undefined, label: string) {
  return (group?.labels || []).findIndex(
    (candidate) => candidate.toUpperCase() === label.toUpperCase()
  );
}

function valueAt(row: EspnAthleteRow, index: number) {
  if (index < 0) return 0;
  const value = Number(row.stats?.[index]);
  return Number.isFinite(value) ? value : 0;
}

function madeAndAttempted(value?: string) {
  const [made, attempted] = String(value || "0/0")
    .split("/")
    .map(Number);
  return {
    made: Number.isFinite(made) ? made : 0,
    attempted: Number.isFinite(attempted) ? attempted : 0,
  };
}

function playerLines(groups: EspnStatGroup[]) {
  const lines = new Map<
    string,
    { name: string; statLine: FootballStatLine }
  >();
  const lineFor = (row: EspnAthleteRow) => {
    const name = row.athlete?.displayName || "";
    const key = normalizedPlayer(name);
    if (!key) return null;
    const current = lines.get(key) || { name, statLine: {} };
    lines.set(key, current);
    return current.statLine;
  };

  groups.forEach((group) => {
    const rows = group.athletes || [];
    if (group.name === "passing") {
      const completionsAttempts = statIndex(group, "C/ATT");
      const yards = statIndex(group, "YDS");
      const touchdowns = statIndex(group, "TD");
      const interceptions = statIndex(group, "INT");
      rows.forEach((row) => {
        const line = lineFor(row);
        if (!line) return;
        const [completions, attempts] = String(
          row.stats?.[completionsAttempts] || "0/0"
        )
          .split("/")
          .map(Number);
        line.completions = Number.isFinite(completions) ? completions : 0;
        line.passingAttempts = Number.isFinite(attempts) ? attempts : 0;
        line.passingYards = valueAt(row, yards);
        line.passingTds = valueAt(row, touchdowns);
        line.interceptionsThrown = valueAt(row, interceptions);
      });
    }

    if (group.name === "rushing") {
      const attempts = statIndex(group, "CAR");
      const yards = statIndex(group, "YDS");
      const touchdowns = statIndex(group, "TD");
      rows.forEach((row) => {
        const line = lineFor(row);
        if (!line) return;
        line.rushingAttempts = valueAt(row, attempts);
        line.rushingYards = valueAt(row, yards);
        line.rushingTds = valueAt(row, touchdowns);
      });
    }

    if (group.name === "receiving") {
      const receptions = statIndex(group, "REC");
      const yards = statIndex(group, "YDS");
      const touchdowns = statIndex(group, "TD");
      rows.forEach((row) => {
        const line = lineFor(row);
        if (!line) return;
        line.receptions = valueAt(row, receptions);
        line.receivingYards = valueAt(row, yards);
        line.receivingTds = valueAt(row, touchdowns);
      });
    }

    if (group.name === "fumbles") {
      const lost = statIndex(group, "LOST");
      rows.forEach((row) => {
        const line = lineFor(row);
        if (line) line.fumblesLost = valueAt(row, lost);
      });
    }

    if (group.name === "kicking") {
      const fieldGoals = statIndex(group, "FG");
      const extraPoints = statIndex(group, "XP");
      const longest = statIndex(group, "LONG");
      rows.forEach((row) => {
        const line = lineFor(row);
        if (!line) return;
        const fg = madeAndAttempted(row.stats?.[fieldGoals]);
        const xp = madeAndAttempted(row.stats?.[extraPoints]);
        line.fieldGoalsMade = fg.made;
        line.fieldGoalsMissed = Math.max(0, fg.attempted - fg.made);
        line.extraPointsMade = xp.made;
        line.extraPointsMissed = Math.max(0, xp.attempted - xp.made);
        line.fieldGoals50Plus = valueAt(row, longest) >= 50 ? 1 : 0;
      });
    }
  });

  return [...lines.values()];
}

function groupTotal(group: EspnStatGroup | undefined, label: string) {
  const index = statIndex(group, label);
  return (group?.athletes || []).reduce(
    (sum, row) => sum + valueAt(row, index),
    0
  );
}

function displayedTeamStat(
  summary: EspnSummary,
  teamId: string | undefined,
  name: string
) {
  const team = (summary.boxscore?.teams || []).find(
    (candidate) => candidate.team?.id === teamId
  );
  const raw = team?.statistics?.find((stat) => stat.name === name)?.displayValue;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function defenseLine(
  summary: EspnSummary,
  own: EspnSummaryTeam,
  opponentTeamId: string | undefined
): FootballStatLine {
  const groups = own.statistics || [];
  const defensive = groups.find((group) => group.name === "defensive");
  const interceptions = groups.find((group) => group.name === "interceptions");
  const kickReturns = groups.find((group) => group.name === "kickReturns");
  const puntReturns = groups.find((group) => group.name === "puntReturns");
  const returnTds =
    groupTotal(kickReturns, "TD") + groupTotal(puntReturns, "TD");
  const allDefensiveTds = groupTotal(defensive, "TD");

  return {
    sacks: groupTotal(defensive, "SACKS"),
    defenseInterceptions:
      groupTotal(interceptions, "INT") ||
      displayedTeamStat(summary, opponentTeamId, "interceptions"),
    fumbleRecoveries: displayedTeamStat(
      summary,
      opponentTeamId,
      "fumblesLost"
    ),
    defenseTds: Math.max(0, allDefensiveTds - returnTds),
    safeties: 0,
    blockedKicks: 0,
    returnTds,
  };
}

function parseSummary(
  fixture: EspnFallbackFixture,
  summary: EspnSummary
): EspnFallbackGame | null {
  const competitors = summary.header?.competitions?.[0]?.competitors || [];
  const bySide = new Map(
    competitors.map((competitor) => [competitor.homeAway, competitor.team])
  );
  const playersByTeam = summary.boxscore?.players || [];
  const sides = [
    { side: "home" as const, source: fixture.home, opponent: "away" as const },
    { side: "away" as const, source: fixture.away, opponent: "home" as const },
  ];
  const teams = sides.flatMap(({ side, source, opponent }) => {
    const espnTeam = bySide.get(side);
    const own = playersByTeam.find((entry) => entry.team?.id === espnTeam?.id);
    if (!own) return [];
    return [
      {
        teamId: source.id,
        players: playerLines(own.statistics || []),
        defense: defenseLine(summary, own, bySide.get(opponent)?.id),
      },
    ];
  });
  return teams.length ? { fixtureId: fixture.id, teams } : null;
}

export async function getEspnFallbackGames(
  fixtures: EspnFallbackFixture[],
  seasonYear: number
) {
  if (!fixtures.length) return [];
  const directory = await espnGet<{
    sports?: { leagues?: { teams?: { team?: EspnTeam }[] }[] }[];
  }>("/teams?limit=1000");
  const teams =
    directory.sports
      ?.flatMap((sport) => sport.leagues || [])
      .flatMap((league) => league.teams || [])
      .flatMap((entry) => (entry.team ? [entry.team] : [])) || [];

  const fallbackGames = await Promise.all(
    fixtures.map(async (fixture) => {
      try {
        const espnTeam =
          findEspnTeam(teams, fixture.home) || findEspnTeam(teams, fixture.away);
        if (!espnTeam) return null;
        const schedule = await espnGet<EspnSchedule>(
          `/teams/${espnTeam.id}/schedule?season=${seasonYear}`
        );
        const targetTime = Date.parse(fixture.startDate);
        const event = (schedule.events || [])
          .filter((candidate) => candidate.id && candidate.date)
          .map((candidate) => ({
            ...candidate,
            distance: Math.abs(Date.parse(candidate.date!) - targetTime),
          }))
          .filter((candidate) => candidate.distance <= 12 * 60 * 60 * 1000)
          .sort((a, b) => a.distance - b.distance)[0];
        if (!event?.id) return null;
        const summary = await espnGet<EspnSummary>(`/summary?event=${event.id}`);
        return parseSummary(fixture, summary);
      } catch {
        return null;
      }
    })
  );

  return fallbackGames.filter(
    (game): game is EspnFallbackGame => game !== null
  );
}
