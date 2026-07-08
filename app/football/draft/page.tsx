"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballDraftPick,
  FootballPlayer,
  FootballPool,
  defaultFootballPlayerPool,
  defaultScoring,
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
import type { FootballStatLine } from "../lib/scoringEngine";

const positions = ["ALL", "QB", "RB", "WR", "TE", "DST", "K"];

const positionStyles: Record<
  FootballPlayer["position"],
  { badge: string; card: string; board: string }
> = {
  QB: {
    badge: "border-fuchsia-300/55 bg-fuchsia-400/20 text-fuchsia-100",
    card: "hover:border-fuchsia-400/70",
    board: "border-fuchsia-300/70 bg-fuchsia-400/20",
  },
  RB: {
    badge: "border-teal-200/55 bg-teal-300/20 text-teal-100",
    card: "hover:border-teal-300/70",
    board: "border-teal-200/70 bg-teal-300/20",
  },
  WR: {
    badge: "border-sky-200/60 bg-sky-300/25 text-sky-50",
    card: "hover:border-sky-300/80",
    board: "border-sky-200/75 bg-sky-300/24",
  },
  TE: {
    badge: "border-amber-200/55 bg-amber-300/20 text-amber-100",
    card: "hover:border-amber-300/70",
    board: "border-amber-200/70 bg-amber-300/20",
  },
  DST: {
    badge: "border-lime-200/55 bg-lime-300/20 text-lime-100",
    card: "hover:border-lime-300/70",
    board: "border-lime-200/70 bg-lime-300/20",
  },
  K: {
    badge: "border-violet-200/55 bg-violet-300/20 text-violet-100",
    card: "hover:border-violet-300/70",
    board: "border-violet-200/70 bg-violet-300/20",
  },
};

function formatStat(value: number | undefined) {
  if (!value) return "-";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

const eligiblePlayerGrid =
  "grid-cols-[260px_92px_92px_220px_72px_72px_72px_72px_72px_72px_72px_72px_72px_72px_104px]";

function gameLogColumnsForPosition(
  position: FootballPlayer["position"],
  scoring: FootballPool["scoring"]
) {
  const scoringRules = scoring ?? defaultScoring;

  if (position === "QB") {
    return [
      { label: "Cmp", value: (stats: FootballStatLine) => stats.completions },
      { label: "Pass Att", value: (stats: FootballStatLine) => stats.passingAttempts },
      { label: "Pass Yd", value: (stats: FootballStatLine) => stats.passingYards },
      { label: "Pass TD", value: (stats: FootballStatLine) => stats.passingTds },
      { label: "INT", value: (stats: FootballStatLine) => stats.interceptionsThrown },
      { label: "Rush Att", value: (stats: FootballStatLine) => stats.rushingAttempts },
      { label: "Rush Yd", value: (stats: FootballStatLine) => stats.rushingYards },
      { label: "Rush TD", value: (stats: FootballStatLine) => stats.rushingTds },
    ];
  }

  if (position === "RB") {
    return [
      { label: "Rush Att", value: (stats: FootballStatLine) => stats.rushingAttempts },
      { label: "Rush Yd", value: (stats: FootballStatLine) => stats.rushingYards },
      { label: "Rush TD", value: (stats: FootballStatLine) => stats.rushingTds },
      { label: "Rec", value: (stats: FootballStatLine) => stats.receptions },
      { label: "Rec Yd", value: (stats: FootballStatLine) => stats.receivingYards },
      { label: "Rec TD", value: (stats: FootballStatLine) => stats.receivingTds },
    ];
  }

  if (position === "WR" || position === "TE") {
    return [
      { label: "Rec", value: (stats: FootballStatLine) => stats.receptions },
      { label: "Rec Yd", value: (stats: FootballStatLine) => stats.receivingYards },
      { label: "Rec TD", value: (stats: FootballStatLine) => stats.receivingTds },
    ];
  }

  if (position === "DST") {
    return [
      scoringRules.defense.sack !== 0 && { label: "Sacks", value: (stats: FootballStatLine) => stats.sacks },
      scoringRules.defense.interception !== 0 && { label: "INT", value: (stats: FootballStatLine) => stats.defenseInterceptions },
      scoringRules.defense.fumbleRecovery !== 0 && { label: "Fum Rec", value: (stats: FootballStatLine) => stats.fumbleRecoveries },
      scoringRules.defense.touchdown !== 0 && { label: "TD", value: (stats: FootballStatLine) => stats.defenseTds },
      scoringRules.defense.safety !== 0 && { label: "Safety", value: (stats: FootballStatLine) => stats.safeties },
      scoringRules.defense.blockedKick !== 0 && { label: "Blk Kick", value: (stats: FootballStatLine) => stats.blockedKicks },
      scoringRules.defense.returnTouchdown !== 0 && { label: "Ret TD", value: (stats: FootballStatLine) => stats.returnTds },
    ].filter(Boolean) as { label: string; value: (stats: FootballStatLine) => number | undefined }[];
  }

  return [
    scoringRules.kicking.extraPoint !== 0 && { label: "XP Made", value: (stats: FootballStatLine) => stats.extraPointsMade },
    scoringRules.kicking.missedExtraPoint !== 0 && { label: "XP Miss", value: (stats: FootballStatLine) => stats.extraPointsMissed },
    scoringRules.kicking.fieldGoal !== 0 && { label: "FG Made", value: (stats: FootballStatLine) => stats.fieldGoalsMade },
    scoringRules.kicking.missedFieldGoal !== 0 && { label: "FG Miss", value: (stats: FootballStatLine) => stats.fieldGoalsMissed },
    scoringRules.kicking.fieldGoal50Bonus !== 0 && { label: "50+ FG", value: (stats: FootballStatLine) => stats.fieldGoals50Plus },
  ].filter(Boolean) as { label: string; value: (stats: FootballStatLine) => number | undefined }[];
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
  const ppg = getPlayerPpg(player, scoring);

  return (
    <>
      <div className="text-left text-emerald-300">{formatPoints(projectedScore.total)}</div>
      <div className="text-left text-slate-300">{formatPoints(ppg)}</div>
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
  const gameLogColumns = gameLogColumnsForPosition(player.position, scoring);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#030712]/75 px-3 pb-4 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60">
        <div className="shrink-0 border-b border-white/10 bg-[#1F2937] p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
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
            <table className="min-w-[760px] w-full text-right text-sm font-black text-slate-200">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-left">Opp</th>
                  <th className="px-4 py-3 text-emerald-300">Pts</th>
                  {gameLogColumns.map((column) => (
                    <th key={column.label} className="px-4 py-3">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.label}-${row.opponent}`} className="border-b border-white/5 last:border-b-0">
                    <td className="px-4 py-4 text-left text-slate-400">{row.label}</td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-left">{row.opponent}</td>
                    <td className="px-4 py-4 text-emerald-300">{formatPoints(row.points)}</td>
                    {gameLogColumns.map((column) => (
                      <td key={column.label} className="px-4 py-4">
                        {formatStat(column.value(row.statLine))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 p-4 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-white/15 px-5 py-3 font-black text-slate-200 hover:bg-white/5 sm:w-auto"
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
                <div className="min-w-[1720px] border-b border-white/10 bg-[#1F2937] px-4 py-3">
                  <div className={`grid ${eligiblePlayerGrid} items-center gap-x-4 text-right text-xs font-black uppercase tracking-wide text-slate-500`}>
                    <div className="text-left">Player</div>
                    <div className="text-left text-emerald-300">Pts</div>
                    <div className="text-left">PPG</div>
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

                return (
                  <div
                    key={player.id}
                    className={`grid min-w-[1720px] ${eligiblePlayerGrid} items-center gap-x-4 border-b border-white/5 px-4 py-4 text-right text-sm font-black text-slate-300 last:border-b-0 ${
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
                            {player.school} • {player.conference}
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

          <section className="flex min-w-0 flex-col rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
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

            <div className="mt-6 min-h-[620px] flex-1 overflow-auto rounded-3xl border border-white/5 sm:mt-8 lg:min-h-[760px]">
              <div style={{ minWidth: `${pool.numberOfTeams * 190}px` }}>
                <div
                  className="sticky top-0 z-20 grid bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#0F766E] shadow-lg shadow-emerald-950/40"
                  style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(190px, 1fr))` }}
                >
                  {pool.draftOrder.map((team) => (
                    <div key={team} className="border-r border-emerald-300/20 p-4 text-center last:border-r-0 sm:p-6">
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-100/85">Team</p>
                      <p className="mt-2 truncate text-xl font-black text-white sm:text-2xl">{team}</p>
                    </div>
                  ))}
                </div>

                {Array.from({ length: rosterSlots }).map((_, roundIndex) => (
                  <div
                    key={roundIndex}
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(190px, 1fr))` }}
                  >
                    {pool.draftOrder.map((team, teamIndex) => {
                      const isSnakeRound = roundIndex % 2 === 1;
                      const actualTeamIndex = isSnakeRound
                        ? pool.numberOfTeams - 1 - teamIndex
                        : teamIndex;
                      const displayedPickIndex =
                        roundIndex * pool.numberOfTeams + actualTeamIndex;
                      const pick = picks[displayedPickIndex];
                      const player = players.find((item) => item.id === pick?.playerId);
                      const styles = player ? positionStyles[player.position] : null;
                      const isCurrentPick =
                        !draftComplete && displayedPickIndex === picks.length;

                      return (
                        <div
                          key={`${roundIndex}-${team}`}
                          className={`relative min-h-[132px] border-r border-t p-4 last:border-r-0 sm:min-h-40 sm:p-5 ${
                            player && styles
                              ? styles.board
                              : isCurrentPick
                                ? "border-emerald-400/20 bg-emerald-400/15"
                                : "border-white/5 bg-[#030712]"
                          }`}
                        >
                          <div
                            className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black ${
                              player
                                ? "bg-blue-500/25 text-blue-100"
                                : isCurrentPick
                                  ? "bg-emerald-400 text-slate-950"
                                  : "bg-[#1F2937] text-slate-500"
                            }`}
                          >
                            {roundIndex + 1}.{actualTeamIndex + 1}
                          </div>

                          {player && styles ? (
                            <>
                              <p className="pr-12 text-sm font-black text-slate-300">
                                Drafted
                              </p>
                              <p className="mt-3 pr-12 text-lg font-black leading-tight text-white sm:text-xl">
                                {player.name}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2 pr-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}>
                                  {player.position}
                                </span>
                                <span className="text-sm font-bold text-slate-400">{player.school}</span>
                                <span className="text-sm font-bold text-emerald-300">
                                  {getProjectedScore(player, pool.scoring).total.toFixed(1)} proj
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p
                                className={`pr-12 text-sm font-black ${
                                  isCurrentPick ? "text-emerald-300" : "text-slate-500"
                                }`}
                              >
                                {isCurrentPick ? "On the clock" : "Open"}
                              </p>
                              <p className="mt-3 pr-12 text-sm font-bold text-slate-600">
                                Awaiting selection
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
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
            <h2 className="text-4xl font-black">
              <span className="block">Congratulations!</span>
              <span className="block">Draft Completed!</span>
            </h2>
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
