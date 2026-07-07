"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballDraftPick,
  FootballPlayer,
  FootballPool,
  defaultFootballPlayerPool,
  footballPlayers,
  getTotalRosterSlots,
  loadFootballDraftPicks,
  loadFootballPool,
  saveFootballDraftPicks,
} from "../lib/storage";
import {
  getPlayerPpg,
  getProjectedScore,
  scoreFootballStats,
} from "../lib/scoringEngine";

const positions = ["ALL", "QB", "RB", "WR", "TE", "DST", "K"];

const positionStyles: Record<
  FootballPlayer["position"],
  { badge: string; card: string; board: string }
> = {
  QB: {
    badge: "border-fuchsia-400/35 bg-fuchsia-400/15 text-fuchsia-200",
    card: "hover:border-fuchsia-400/70",
    board: "border-fuchsia-400/45 bg-fuchsia-400/12",
  },
  RB: {
    badge: "border-teal-300/35 bg-teal-300/15 text-teal-200",
    card: "hover:border-teal-300/70",
    board: "border-teal-300/45 bg-teal-300/12",
  },
  WR: {
    badge: "border-blue-300/45 bg-blue-300/15 text-blue-100",
    card: "hover:border-blue-300/70",
    board: "border-blue-300/45 bg-blue-300/12",
  },
  TE: {
    badge: "border-amber-300/35 bg-amber-300/15 text-amber-200",
    card: "hover:border-amber-300/70",
    board: "border-amber-300/45 bg-amber-300/12",
  },
  DST: {
    badge: "border-lime-300/35 bg-lime-300/15 text-lime-200",
    card: "hover:border-lime-300/70",
    board: "border-lime-300/45 bg-lime-300/12",
  },
  K: {
    badge: "border-violet-300/35 bg-violet-300/15 text-violet-200",
    card: "hover:border-violet-300/70",
    board: "border-violet-300/45 bg-violet-300/12",
  },
};

function formatStat(value: number | undefined) {
  if (!value) return "-";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function positionCountsForTeam(
  team: string,
  picks: FootballDraftPick[],
  players: FootballPlayer[]
) {
  const counts: Record<FootballPlayer["position"], number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    DST: 0,
    K: 0,
  };
  picks
    .filter((pick) => pick.team === team)
    .forEach((pick) => {
      const draftedPlayer = players.find((player) => player.id === pick.playerId);
      if (draftedPlayer) counts[draftedPlayer.position] += 1;
    });
  return counts;
}

function canTeamDraftPosition({
  team,
  position,
  picks,
  players,
  pool,
}: {
  team: string;
  position: FootballPlayer["position"];
  picks: FootballDraftPick[];
  players: FootballPlayer[];
  pool: FootballPool;
}) {
  const roster = pool.scoring?.roster;
  if (!roster) return true;

  const counts = positionCountsForTeam(team, picks, players);
  counts[position] += 1;

  if (counts.QB > roster.QB || counts.DST > roster.DST || counts.K > roster.K) {
    return false;
  }

  const rbExcess = Math.max(0, counts.RB - roster.RB);
  const wrExcess = Math.max(0, counts.WR - roster.WR);
  const teExcess = Math.max(0, counts.TE - roster.TE);
  const flexUsed = rbExcess + wrExcess + teExcess;
  const skillUsed = counts.RB + counts.WR + counts.TE;
  const skillSlots = roster.RB + roster.WR + roster.TE + roster.FLEX;

  return (
    counts.RB <= roster.RB + roster.FLEX &&
    counts.WR <= roster.WR + roster.FLEX &&
    counts.TE <= roster.TE + roster.FLEX &&
    flexUsed <= roster.FLEX &&
    skillUsed <= skillSlots
  );
}

function playerGameRows(player: FootballPlayer, scoring: FootballPool["scoring"]) {
  if (player.gameLogs && player.gameLogs.length > 0) {
    return player.gameLogs.map((log) => ({
      label: log.week,
      opponent: log.opponent,
      statLine: log.statLine,
      points: scoreFootballStats(log.statLine, scoring).total,
    }));
  }

  return [
    {
      label: "Proj",
      opponent: player.opponent,
      statLine: player.projectedStats,
      points: getProjectedScore(player, scoring).total,
    },
    {
      label: "Avg",
      opponent: "Season avg",
      statLine: player.averageStats,
      points: getPlayerPpg(player, scoring),
    },
  ];
}

function PlayerStatColumns({
  player,
  scoring,
}: {
  player: FootballPlayer;
  scoring: FootballPool["scoring"];
}) {
  const stats = player.projectedStats;
  const projectedScore = getProjectedScore(player, scoring);

  return (
    <>
      <div className="text-left text-emerald-300">{formatPoints(projectedScore.total)}</div>
      <div className="text-left text-slate-400">{player.gameTime} {player.opponent}</div>
      <div>{formatStat(stats.rushingAttempts)}</div>
      <div>{formatStat(stats.rushingYards)}</div>
      <div>{formatStat(stats.rushingTds)}</div>
      <div>{formatStat(stats.receptions)}</div>
      <div>{formatStat(stats.receivingTargets)}</div>
      <div>{formatStat(stats.receivingYards)}</div>
      <div>{formatStat(stats.receivingTds)}</div>
      <div>{formatStat(stats.completions)}</div>
      <div>{formatStat(stats.passingAttempts)}</div>
      <div>{formatStat(stats.passingYards)}</div>
    </>
  );
}

function PlayerDetailsModal({
  player,
  scoring,
  onClose,
  onDraft,
}: {
  player: FootballPlayer;
  scoring: FootballPool["scoring"];
  onClose: () => void;
  onDraft: () => void;
}) {
  const styles = positionStyles[player.position];
  const projection = getProjectedScore(player, scoring);
  const rows = playerGameRows(player, scoring);
  const hasReplayGameLogs = Boolean(player.gameLogs?.length);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#030712]/75 px-3 pb-4 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60">
        <div className="flex flex-col gap-5 border-b border-white/10 bg-[#1F2937] p-5 sm:p-7 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}>
                {player.position}
              </span>
              <span className="text-sm font-black uppercase tracking-wide text-slate-400">
                {player.school}
              </span>
            </div>
            <h2 className="mt-3 break-words text-3xl font-black text-white sm:text-4xl">
              {player.name}
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-400 sm:text-base">
              {player.conference} • {player.gameTime} {player.opponent}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
            <div className="rounded-2xl bg-[#030712] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Projected</p>
              <p className="mt-1 text-2xl font-black text-emerald-300">{formatPoints(projection.total)}</p>
            </div>
            <button
              type="button"
              onClick={onDraft}
              className="rounded-2xl bg-emerald-400 p-4 text-lg font-black text-slate-950 hover:bg-emerald-300"
            >
              Draft
            </button>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-5 sm:p-7">
          <h3 className="text-xl font-black">Game Log</h3>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            Fantasy points use this pool&apos;s scoring rules. No player photos or school logos are shown.
          </p>
          {!hasReplayGameLogs && (
            <p className="mt-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
              SportsData did not return game-by-game rows for this replay package yet, so this view is showing projected and season-average stat lines.
            </p>
          )}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#030712]">
            <div className="grid min-w-[940px] grid-cols-[70px_150px_86px_70px_70px_70px_70px_70px_70px_70px_70px_70px_70px] gap-x-4 border-b border-white/10 px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
              <div className="text-left">Week</div>
              <div className="text-left">Opp</div>
              <div className="text-emerald-300">Pts</div>
              <div>Rush Att</div>
              <div>Rush Yd</div>
              <div>Rush TD</div>
              <div>Rec</div>
              <div>Tar</div>
              <div>Rec Yd</div>
              <div>Rec TD</div>
              <div>Cmp</div>
              <div>Pass Att</div>
              <div>Pass Yd</div>
            </div>
            {rows.map((row) => (
              <div
                key={`${row.label}-${row.opponent}`}
                className="grid min-w-[940px] grid-cols-[70px_150px_86px_70px_70px_70px_70px_70px_70px_70px_70px_70px_70px] gap-x-4 border-b border-white/5 px-4 py-4 text-right text-sm font-black text-slate-200 last:border-b-0"
              >
                <div className="text-left text-slate-400">{row.label}</div>
                <div className="truncate text-left">{row.opponent}</div>
                <div className="text-emerald-300">{formatPoints(row.points)}</div>
                <div>{formatStat(row.statLine.rushingAttempts)}</div>
                <div>{formatStat(row.statLine.rushingYards)}</div>
                <div>{formatStat(row.statLine.rushingTds)}</div>
                <div>{formatStat(row.statLine.receptions)}</div>
                <div>{formatStat(row.statLine.receivingTargets)}</div>
                <div>{formatStat(row.statLine.receivingYards)}</div>
                <div>{formatStat(row.statLine.receivingTds)}</div>
                <div>{formatStat(row.statLine.completions)}</div>
                <div>{formatStat(row.statLine.passingAttempts)}</div>
                <div>{formatStat(row.statLine.passingYards)}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projection.components.slice(0, 6).map((component) => (
              <div key={component.label} className="rounded-2xl border border-white/5 bg-[#1F2937] p-4">
                <p className="text-sm font-bold text-slate-400">{component.label}</p>
                <p className="mt-1 text-xl font-black text-emerald-300">
                  {component.points.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/15 px-5 py-3 font-black text-slate-200 hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FootballDraftPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [position, setPosition] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState<FootballPlayer | null>(null);
  const [detailsPlayer, setDetailsPlayer] = useState<FootballPlayer | null>(null);
  const [players, setPlayers] = useState<FootballPlayer[]>(footballPlayers);
  const [playerSource, setPlayerSource] = useState("Loading replay player pool...");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadFootballPool(id);
    if (savedPool) {
      setPool(savedPool);
      setPicks(loadFootballDraftPicks(savedPool.id));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReplayPlayers() {
      try {
        const response = await fetch("/api/football/replay", { cache: "no-store" });
        if (!response.ok) throw new Error("Replay player pool failed");
        const data = await response.json();
        const replayPlayers = data?.playerPool?.players;

        if (!cancelled && Array.isArray(replayPlayers) && replayPlayers.length > 0) {
          setPlayers(replayPlayers);
          setPlayerSource(
            `${data.playerPool.source} • ${replayPlayers.length.toLocaleString()} eligible players`
          );
        }
      } catch {
        if (!cancelled) {
          setPlayers(footballPlayers);
          setPlayerSource("Static trial player pool");
        }
      }
    }

    loadReplayPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  const rosterSlots = getTotalRosterSlots(pool?.scoring);
  const totalPicks = (pool?.numberOfTeams || 0) * rosterSlots;
  const draftComplete = totalPicks > 0 && picks.length >= totalPicks;
  const draftedIds = new Set(picks.map((pick) => pick.playerId));

  const currentTeam = useMemo(() => {
    if (!pool || draftComplete) return "Draft Complete";
    const pickIndex = picks.length;
    const round = Math.floor(pickIndex / pool.numberOfTeams);
    const pickInRound = pickIndex % pool.numberOfTeams;
    return round % 2 === 1
      ? pool.draftOrder[pool.numberOfTeams - pickInRound - 1]
      : pool.draftOrder[pickInRound];
  }, [draftComplete, picks.length, pool]);

  const activeConferences =
    pool?.playerPool?.conferences || defaultFootballPlayerPool.conferences;
  const activeRoster = pool?.scoring?.roster;
  const activePositions = new Set(
    positions.filter((item) => {
      if (item === "ALL") return true;
      if (!activeRoster) return true;
      if (item === "RB" || item === "WR" || item === "TE") {
        return activeRoster[item] > 0 || activeRoster.FLEX > 0;
      }
      return activeRoster[item as keyof typeof activeRoster] > 0;
    })
  );
  const draftablePositions = new Set(
    positions.filter((item) => {
      if (item === "ALL") return true;
      if (!pool || draftComplete) return activePositions.has(item);
      return (
        activePositions.has(item) &&
        canTeamDraftPosition({
          team: currentTeam,
          position: item as FootballPlayer["position"],
          picks,
          players,
          pool,
        })
      );
    })
  );

  const filteredPlayers = players
    .filter((player) => {
    const matchesPosition = position === "ALL" || player.position === position;
    const matchesConference = activeConferences.includes(player.conference);
    const matchesRoster = activePositions.has(player.position);
    const matchesCurrentTeamRoster =
      !pool ||
      draftComplete ||
      canTeamDraftPosition({
        team: currentTeam,
        position: player.position,
        picks,
        players,
        pool,
      });
    const matchesSearch =
      player.name.toLowerCase().includes(search.toLowerCase()) ||
      player.school.toLowerCase().includes(search.toLowerCase()) ||
      player.conference.toLowerCase().includes(search.toLowerCase());
    return (
      matchesPosition &&
      matchesConference &&
      matchesRoster &&
      matchesCurrentTeamRoster &&
      matchesSearch
    );
  })
  .sort(
    (a, b) =>
      getProjectedScore(b, pool?.scoring).total -
      getProjectedScore(a, pool?.scoring).total
  );
  const displayedPlayers = filteredPlayers.slice(0, 300);

  useEffect(() => {
    if (!draftablePositions.has(position)) {
      setPosition("ALL");
    }
  }, [draftablePositions, position]);

  function draftPlayer(player: FootballPlayer) {
    if (
      !pool ||
      draftedIds.has(player.id) ||
      draftComplete ||
      !canTeamDraftPosition({
        team: currentTeam,
        position: player.position,
        picks,
        players,
        pool,
      })
    ) {
      return;
    }
    setPendingPlayer(player);
  }

  function draftFromDetails(player: FootballPlayer) {
    setDetailsPlayer(null);
    draftPlayer(player);
  }

  function cancelDraftPlayer() {
    setPendingPlayer(null);
  }

  function confirmDraftPlayer() {
    if (
      !pool ||
      !pendingPlayer ||
      draftedIds.has(pendingPlayer.id) ||
      draftComplete ||
      !canTeamDraftPosition({
        team: currentTeam,
        position: pendingPlayer.position,
        picks,
        players,
        pool,
      })
    ) {
      setPendingPlayer(null);
      return;
    }

    const nextPicks = [
      ...picks,
      { playerId: pendingPlayer.id, team: currentTeam, pickNumber: picks.length + 1 },
    ];
    setPicks(nextPicks);
    saveFootballDraftPicks(pool.id, nextPicks);
    setPendingPlayer(null);
    setDetailsPlayer(null);

    if (nextPicks.length >= totalPicks) {
      setShowCompleted(true);
    }
  }

  function undoPick() {
    if (!pool) return;
    const nextPicks = picks.slice(0, -1);
    setPicks(nextPicks);
    saveFootballDraftPicks(pool.id, nextPicks);
    setShowCompleted(false);
    setPendingPlayer(null);
    setDetailsPlayer(null);
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <BrandMark size="md" />
          <h1 className="mt-8 text-4xl font-black">No football pool found</h1>
          <Link href="/football/create" className="mt-6 inline-block text-emerald-300">
            Create a football pool
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/" aria-label="Draft With Friends home">
              <BrandMark size="md" />
            </Link>
            <h1 className="mt-6 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              College Football Draft Room
            </h1>
            <p className="mt-4 text-base font-bold text-slate-300 sm:text-lg">
              {draftComplete ? "All picks are complete." : `${currentTeam} is on the clock`}
            </p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {pool.season} • Pick {Math.min(picks.length + 1, totalPicks)} of {totalPicks}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={undoPick}
              disabled={picks.length === 0}
            className="rounded-2xl border border-slate-700 px-6 py-4 text-base font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 sm:px-8 sm:text-lg"
            >
              Undo Pick
            </button>
            {draftComplete && (
              <Link
                href={`/football/leaderboard?id=${pool.id}`}
                className="rounded-2xl bg-emerald-400 px-6 py-4 text-center text-base font-black text-slate-950 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 sm:px-8 sm:text-lg"
              >
                Live Leaderboard
              </Link>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-[minmax(520px,640px)_1fr]">
          <section className="min-w-0 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
            <h2 className="text-3xl font-black">Eligible Players</h2>
            <p className="mt-3 text-slate-400">
              Filter by position, search player or school, then draft from the list.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">{playerSource}</p>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search players..."
              className="mt-6 w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-4 text-white outline-none placeholder:text-slate-500"
            />

            <select
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="mt-4 w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-4 text-white"
            >
              {positions.filter((item) => draftablePositions.has(item)).map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All Positions" : item}
                </option>
              ))}
            </select>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#030712]">
              <div className="overflow-x-auto">
                <div className="min-w-[1180px] border-b border-white/10 bg-[#1F2937] px-4 py-3">
                  <div className="grid grid-cols-[260px_92px_220px_72px_72px_72px_72px_72px_72px_72px_72px_72px_72px_104px] items-center gap-x-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    <div className="text-left">Player</div>
                    <div className="text-left text-emerald-300">Pts</div>
                    <div className="text-left">Game</div>
                    <div>Rush Att</div>
                    <div>Rush Yd</div>
                    <div>Rush TD</div>
                    <div>Rec</div>
                    <div>Tar</div>
                    <div>Rec Yd</div>
                    <div>Rec TD</div>
                    <div>Cmp</div>
                    <div>Pass Att</div>
                    <div>Pass Yd</div>
                    <div>Action</div>
                  </div>
                </div>

              {displayedPlayers.map((player) => {
                const drafted = draftedIds.has(player.id);
                const selected = pendingPlayer?.id === player.id;
                const styles = positionStyles[player.position];
                const projectedScore = getProjectedScore(player, pool.scoring);

                return (
                  <div
                    key={player.id}
                    className={`grid min-w-[1180px] grid-cols-[260px_92px_220px_72px_72px_72px_72px_72px_72px_72px_72px_72px_72px_104px] items-center gap-x-4 border-b border-white/5 px-4 py-4 text-right text-sm font-black text-slate-300 last:border-b-0 ${
                      drafted
                        ? "bg-[#030712] opacity-45"
                        : selected
                          ? "bg-emerald-400/10"
                          : "bg-[#030712]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailsPlayer(player)}
                      className="min-w-0 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}>
                          {player.position}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-white">
                            {player.name}
                          </p>
                          <p className="truncate text-xs font-bold text-slate-500">
                            {player.school} • {player.conference} • {formatPoints(projectedScore.total)} proj
                          </p>
                        </div>
                      </div>
                    </button>

                    <PlayerStatColumns player={player} scoring={pool.scoring} />

                    <button
                      type="button"
                      onClick={() => draftPlayer(player)}
                      disabled={drafted || draftComplete}
                      className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {drafted ? "Taken" : selected ? "Confirm" : "Draft"}
                    </button>
                  </div>
                );
              })}
              </div>
            </div>

              {filteredPlayers.length > displayedPlayers.length && (
                <div className="mt-4 rounded-2xl border border-white/5 bg-[#030712] p-5 text-sm font-semibold text-slate-400">
                  Showing the top {displayedPlayers.length.toLocaleString()} of{" "}
                  {filteredPlayers.length.toLocaleString()} eligible players. Search by
                  player or school to narrow the list.
                </div>
              )}

              {filteredPlayers.length === 0 && (
                <div className="mt-4 rounded-2xl border border-white/5 bg-[#030712] p-5 text-slate-400">
                  No eligible players match this position, roster limit, conference,
                  and search combination for {currentTeam}.
                </div>
              )}
          </section>

          <section className="min-w-0 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-black">Draft Board</h2>
                <p className="mt-2 text-slate-400">
                  Snake draft order reverses each round.
                </p>
              </div>
              <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300">
                Snake Draft
              </span>
            </div>

            <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-700/60 sm:mt-8">
              <div className="grid min-w-max" style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(150px, 1fr))` }}>
                {pool.draftOrder.map((team) => (
                  <div key={team} className="border-r border-slate-700/70 bg-[#243044] p-4 text-center last:border-r-0 sm:p-6">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Team</p>
                    <p className="mt-2 text-2xl font-black">{team}</p>
                  </div>
                ))}

                {picks.map((pick, index) => {
                  const round = Math.floor(index / pool.numberOfTeams);
                  const spot = index % pool.numberOfTeams;
                  const boardTeamIndex = round % 2 === 1 ? pool.numberOfTeams - spot - 1 : spot;
                  const player = players.find((item) => item.id === pick?.playerId);
                  const styles = player ? positionStyles[player.position] : null;

                  return (
                    <div
                      key={index}
                      className={`min-h-32 border-r border-t p-4 last:border-r-0 sm:min-h-36 sm:p-5 ${
                        styles
                          ? `border ${styles.board}`
                          : "border-slate-700/60 bg-[#1b3458]"
                      }`}
                      style={{ gridColumnStart: boardTeamIndex + 1 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-300">
                          {player ? "Drafted" : index === picks.length ? "On the clock" : "Open"}
                        </p>
                        <span className="rounded-full bg-blue-500/30 px-3 py-1 text-sm font-black text-slate-200">
                          {round + 1}.{boardTeamIndex + 1}
                        </span>
                      </div>
                      <p className="mt-4 text-xl font-black">
                        {player?.name || "Awaiting pick"}
                      </p>
                      {player && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles?.badge || ""}`}>
                            {player.position}
                          </span>
                          <span className="text-sm font-bold text-slate-400">{player.school}</span>
                          <span className="text-sm font-bold text-emerald-300">
                            {getProjectedScore(player, pool.scoring).total.toFixed(1)} proj
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {picks.length === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-700/70 bg-[#030712] p-5 text-sm font-bold text-slate-500">
                Draft board will fill in after the first confirmed pick.
              </div>
            )}
          </section>
        </div>
      </div>

      {detailsPlayer && (
        <PlayerDetailsModal
          player={detailsPlayer}
          scoring={pool.scoring}
          onClose={() => setDetailsPlayer(null)}
          onDraft={() => draftFromDetails(detailsPlayer)}
        />
      )}

      {pendingPlayer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#030712]/70 px-4 pb-6 backdrop-blur-sm md:items-center md:pb-0">
          <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
              Confirm Pick
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Draft {pendingPlayer.name}?
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${positionStyles[pendingPlayer.position].badge}`}>
                {pendingPlayer.position}
              </span>
              <span className="text-sm font-bold text-slate-400">{pendingPlayer.school}</span>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              This will add {pendingPlayer.name} to {currentTeam}&apos;s current pick.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cancelDraftPlayer}
                className="rounded-xl border border-white/15 px-4 py-3 font-bold text-slate-200 transition hover:bg-[#111827]"
              >
                No
              </button>

              <button
                type="button"
                onClick={confirmDraftPlayer}
                className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-400/30 bg-[#111827] p-8 text-center shadow-2xl shadow-black/60">
            <h2 className="text-4xl font-black">Congratulations! Draft Completed!</h2>
            <p className="mt-4 text-slate-300">
              Your college football pool is ready for live tracking.
            </p>
            <Link
              href={`/football/leaderboard?id=${pool.id}`}
              className="mt-8 inline-flex rounded-2xl bg-emerald-400 px-8 py-4 text-lg font-black text-slate-950 hover:bg-emerald-300"
            >
              Live Tracking Leaderboard
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
