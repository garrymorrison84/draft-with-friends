import { NextRequest, NextResponse } from "next/server";

type SportsDataTournament = {
  TournamentID?: number;
  Name?: string;
  StartDate?: string;
  EndDate?: string;
  IsOver?: boolean;
};

type SportsDataLeaderboardPlayer = {
  Name?: string;
  Rank?: number | string | null;
  TotalScore?: number | null;
  IsWithdrawn?: boolean;
  IsCut?: boolean;
  MadeCut?: boolean | null;
  Status?: string | null;
};

type RecentFinish = {
  tournament: string;
  date: string | null;
  finish: string;
  score: number | null;
};

const recentFinishCache = new Map<
  string,
  { expiresAt: number; finishes: RecentFinish[] }
>();
const tournamentsCache = new Map<
  string,
  { expiresAt: number; tournaments: SportsDataTournament[] }
>();
const leaderboardCache = new Map<
  number,
  { expiresAt: number; players: SportsDataLeaderboardPlayer[] }
>();
const CACHE_VERSION = "mc-finish-v2";
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

function normalizeName(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

function hasMissedCutStatus(player: SportsDataLeaderboardPlayer) {
  const statusText = String(player.Status || "").toUpperCase();
  return (
    player.IsCut ||
    player.MadeCut === false ||
    /\b(MC|CUT|MISSED CUT|MDF)\b/.test(statusText)
  );
}

function formatFinish(player: SportsDataLeaderboardPlayer) {
  const rank = player.Rank;
  if (player.IsWithdrawn) return "WD";
  if (hasMissedCutStatus(player)) return "MC";

  const hasCompletedScore = Number.isFinite(Number(player.TotalScore));
  if ((rank === null || rank === undefined || rank === "") && hasCompletedScore) {
    return "MC";
  }

  if (rank === null || rank === undefined || rank === "") return "TBD";

  const rankText = String(rank);
  return rankText.toUpperCase().startsWith("T") ? rankText : `T${rankText}`;
}

function getLeaderboardPlayers(payload: any): SportsDataLeaderboardPlayer[] {
  if (Array.isArray(payload?.Players)) return payload.Players;
  if (Array.isArray(payload?.PlayerTournamentStats)) return payload.PlayerTournamentStats;
  if (Array.isArray(payload)) return payload;
  return [];
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.SPORTSDATA_API_KEY;
  const playerName = request.nextUrl.searchParams.get("name") || "";
  const normalizedPlayerName = normalizeName(playerName);

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Missing SPORTSDATA_API_KEY", finishes: [] },
      { status: 500 }
    );
  }

  if (!normalizedPlayerName) {
    return NextResponse.json(
      { success: false, error: "Missing golfer name", finishes: [] },
      { status: 400 }
    );
  }

  const cacheKey = `${CACHE_VERSION}:${normalizedPlayerName}`;
  const cached = recentFinishCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ success: true, finishes: cached.finishes });
  }

  try {
    let tournaments = tournamentsCache.get(CACHE_VERSION)?.tournaments;

    if (!tournaments || tournamentsCache.get(CACHE_VERSION)!.expiresAt <= Date.now()) {
      const tournamentsResponse = await fetch(
        `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${apiKey}`,
        { cache: "no-store" }
      );

      if (!tournamentsResponse.ok) {
        return NextResponse.json(
          {
            success: false,
            error: "SportsData tournaments request failed",
            finishes: [],
          },
          { status: tournamentsResponse.status }
        );
      }

      tournaments = (await tournamentsResponse.json()) as SportsDataTournament[];
      tournamentsCache.set(CACHE_VERSION, {
        expiresAt: Date.now() + ONE_HOUR,
        tournaments,
      });
    }

    const now = Date.now();
    const finishedTournaments = tournaments
      .filter((tournament) => {
        const endDate = tournament.EndDate
          ? new Date(tournament.EndDate).getTime()
          : Number.NaN;
        return (
          tournament.TournamentID &&
          tournament.Name &&
          (tournament.IsOver || (Number.isFinite(endDate) && endDate < now))
        );
      })
      .sort((a, b) => {
        const bDate = b.EndDate ? new Date(b.EndDate).getTime() : 0;
        const aDate = a.EndDate ? new Date(a.EndDate).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 35);

    const finishesByTournamentId = new Map<number, RecentFinish>();

    for (let index = 0; index < finishedTournaments.length; index += 8) {
      if (finishesByTournamentId.size >= 10) break;

      const batch = finishedTournaments.slice(index, index + 8);
      const batchFinishes = await Promise.all(
        batch.map(async (tournament) => {
          if (!tournament.TournamentID) return null;

          let players = leaderboardCache.get(tournament.TournamentID)?.players;

          if (
            !players ||
            leaderboardCache.get(tournament.TournamentID)!.expiresAt <= Date.now()
          ) {
            const leaderboardResponse = await fetch(
              `https://api.sportsdata.io/golf/v2/json/Leaderboard/${tournament.TournamentID}?key=${apiKey}`,
              { cache: "no-store" }
            );

            if (!leaderboardResponse.ok) return null;

            const leaderboard = await leaderboardResponse.json();
            players = getLeaderboardPlayers(leaderboard);
            leaderboardCache.set(tournament.TournamentID, {
              expiresAt: Date.now() + ONE_DAY,
              players,
            });
          }

          const player = players.find(
            (entry) => normalizeName(entry.Name || "") === normalizedPlayerName
          );

          if (!player) return null;

          return {
            tournamentId: tournament.TournamentID,
            finish: {
              tournament: tournament.Name || "Golf Tournament",
              date: tournament.EndDate || tournament.StartDate || null,
              finish: formatFinish(player),
              score: Number.isFinite(Number(player.TotalScore))
                ? Number(player.TotalScore)
                : null,
            },
          };
        })
      );

      for (const result of batchFinishes) {
        if (result) {
          finishesByTournamentId.set(result.tournamentId, result.finish);
        }
      }
    }

    const finishes = finishedTournaments
      .map((tournament) =>
        tournament.TournamentID
          ? finishesByTournamentId.get(tournament.TournamentID)
          : null
      )
      .filter((finish): finish is RecentFinish => Boolean(finish))
      .slice(0, 10);

    recentFinishCache.set(cacheKey, {
      expiresAt: Date.now() + 60 * 60 * 1000,
      finishes,
    });

    return NextResponse.json({ success: true, finishes });
  } catch (error) {
    console.error("RECENT FINISHES ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Could not load recent finishes", finishes: [] },
      { status: 500 }
    );
  }
}
