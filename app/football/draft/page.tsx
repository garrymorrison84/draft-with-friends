"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "../../components/BrandMark";
import { getCurrentOrganizerUser } from "../../lib/poolApi";
import { claimTeam } from "../../lib/teamClaims";
import FormSelect from "../../components/FormSelect";
import {
  formatDraftStart,
  formatPickClock,
  getDraftOpeningBufferStartedAt,
  getDraftStartsIn,
  isDraftOpen,
  scheduledDraftOpeningBufferSeconds,
} from "../../lib/draftTiming";
import {
  draftCompleteSoundDurationMs,
  isDraftSoundEnabled,
  pickMadeSoundDurationMs,
  playCountdownTickSound,
  playDraftCompleteSound,
  playDraftStartSound,
  playPauseResumeWhistleSound,
  playPickMadeSound,
  preloadDraftSounds,
  setDraftSoundEnabled,
  stopCountdownTickSound,
  unlockDraftSounds,
} from "../../lib/draftSounds";
import {
  FootballDraftPick,
  FootballPlayer,
  FootballPool,
  defaultFootballPlayerPool,
  defaultScoring,
  footballPlayers,
  getFootballDraftEligibilityCutoff,
  getFootballInjuryAvailability,
  getFootballReplayUrl,
  getTotalRosterSlots,
  isFootballPlayerEligibleAt,
  saveFootballDraftPicks,
  saveFootballPool,
} from "../lib/storage";
import {
  loadPersistedFootballHistory,
  setFootballDraftPause,
  submitFootballPick,
  undoLastFootballPick,
} from "../lib/platformStorage";
import {
  getPlayerPpg,
  scoreFootballStats,
} from "../lib/scoringEngine";
import type { FootballStatLine } from "../lib/scoringEngine";

const positions = ["ALL", "QB", "RB", "WR", "TE", "DST", "K"];

const positionStyles: Record<
  FootballPlayer["position"],
  { badge: string; card: string; board: string }
> = {
  QB: {
    badge: "border-purple-200 bg-purple-500/45 text-purple-50 shadow-purple-500/20",
    card: "hover:border-purple-200/90",
    board: "border-purple-300/50 bg-purple-500/20",
  },
  RB: {
    badge: "border-sky-200 bg-sky-500/45 text-sky-50 shadow-sky-500/20",
    card: "hover:border-sky-200/90",
    board: "border-sky-300/50 bg-sky-500/20",
  },
  WR: {
    badge: "border-yellow-200 bg-yellow-500/45 text-yellow-50 shadow-yellow-500/20",
    card: "hover:border-yellow-200/90",
    board: "border-yellow-300/50 bg-yellow-500/20",
  },
  TE: {
    badge: "border-red-200 bg-red-500/45 text-red-50 shadow-red-500/20",
    card: "hover:border-red-200/90",
    board: "border-red-300/50 bg-red-500/20",
  },
  DST: {
    badge: "border-green-200 bg-green-500/45 text-green-50 shadow-green-500/20",
    card: "hover:border-green-200/90",
    board: "border-green-300/50 bg-green-500/20",
  },
  K: {
    badge: "border-slate-100 bg-slate-400/45 text-white shadow-slate-400/20",
    card: "hover:border-slate-100/90",
    board: "border-slate-300/50 bg-slate-400/20",
  },
};

function formatStat(value: number | undefined) {
  if (!value) return "-";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatClockTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getPickSoundKey(poolId: string, pick: FootballDraftPick | undefined) {
  if (!pick) return "";
  return `${poolId}:${pick.pickNumber}:${pick.pickedAt || ""}`;
}


function formatDraftOpeningMessage(secondsRemaining: number) {
  if (secondsRemaining >= 45 && secondsRemaining <= 75) {
    return "Draft opens in a minute";
  }

  return "Draft opens in a moment";
}

function hasScheduledOpponent(player: FootballPlayer) {
  return /^(vs|@)\s+\S+/.test(player.opponent);
}

function injuryLabel(player: FootballPlayer) {
  return [player.injuryStatus, player.injuryType].filter(Boolean).join(" • ");
}

const eligiblePlayerGrid =
  "grid-cols-[minmax(0,1fr)_48px_20px] md:grid-cols-[minmax(190px,1fr)_56px_72px]";
const compactEligiblePlayerGrid =
  "grid-cols-[minmax(0,1fr)_48px_20px] xl:grid-cols-[minmax(0,1fr)_48px_64px]";

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
      scoringRules.passing.twoPointConversion !== 0 && { label: "2PT", value: (stats: FootballStatLine) => stats.twoPointConversions },
    ].filter(Boolean) as { label: string; value: (stats: FootballStatLine) => number | undefined }[];
  }

  if (position === "RB") {
    return [
      { label: "Rush Att", value: (stats: FootballStatLine) => stats.rushingAttempts },
      { label: "Rush Yd", value: (stats: FootballStatLine) => stats.rushingYards },
      { label: "Rush TD", value: (stats: FootballStatLine) => stats.rushingTds },
      { label: "Rec", value: (stats: FootballStatLine) => stats.receptions },
      { label: "Rec Yd", value: (stats: FootballStatLine) => stats.receivingYards },
      { label: "Rec TD", value: (stats: FootballStatLine) => stats.receivingTds },
      scoringRules.rushing.twoPointConversion !== 0 && { label: "2PT", value: (stats: FootballStatLine) => stats.twoPointConversions },
    ].filter(Boolean) as { label: string; value: (stats: FootballStatLine) => number | undefined }[];
  }

  if (position === "WR" || position === "TE") {
    return [
      { label: "Rec", value: (stats: FootballStatLine) => stats.receptions },
      { label: "Rec Yd", value: (stats: FootballStatLine) => stats.receivingYards },
      { label: "Rec TD", value: (stats: FootballStatLine) => stats.receivingTds },
      scoringRules.receiving.twoPointConversion !== 0 && { label: "2PT", value: (stats: FootballStatLine) => stats.twoPointConversions },
    ].filter(Boolean) as { label: string; value: (stats: FootballStatLine) => number | undefined }[];
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
  const ppg = getPlayerPpg(player, scoring);

  return (
    <>
      <div className="text-right text-emerald-300 md:text-center">
        {formatPoints(ppg)}
      </div>
    </>
  );
}

function PlayerDetailsModal({
  player,
  scoring,
  onClose,
  onDraft,
  canDraft,
}: {
  player: FootballPlayer;
  scoring: FootballPool["scoring"];
  onClose: () => void;
  onDraft: () => void;
  canDraft: boolean;
}) {
  const styles = positionStyles[player.position];
  const ppg = getPlayerPpg(player, scoring);
  const rows = playerGameRows(player, scoring);
  const hasReplayGameLogs = Boolean(player.gameLogs?.length);
  const injuryAvailability = getFootballInjuryAvailability(player);
  const gameLogColumns = gameLogColumnsForPosition(player.position, scoring);
  const mobileGameLogMinWidth = 190 + gameLogColumns.length * 52;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/75 p-1 backdrop-blur-sm md:p-6">
      <div className="flex max-h-[calc(100dvh-0.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60 md:max-h-[calc(100dvh-3rem)]">
        <div className="shrink-0 border-b border-white/10 bg-[#1F2937] p-4 sm:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}>
                  {player.position}
                </span>
                <span className="text-sm font-black uppercase tracking-wide text-slate-400">
                  {player.school}
                </span>
              </div>
              <h2 className="mt-3 break-words text-2xl font-black text-white sm:text-4xl">
                {player.name}
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-400 sm:text-base">
                {player.conference} • {player.gameTime} {player.opponent}
                {player.gameStatus && <span className="text-emerald-300"> • {player.gameStatus}</span>}
              </p>
              {injuryAvailability !== "available" && (
                <p className={`mt-3 rounded-xl border px-3 py-2 text-sm font-black ${injuryAvailability === "out" ? "border-red-300/30 bg-red-400/10 text-red-200" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>
                  Injury status: {injuryLabel(player)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 md:min-w-[280px] md:gap-3">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#030712] p-3 text-center sm:p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">PPG</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{formatPoints(ppg)}</p>
              </div>
              <button
                type="button"
                onClick={onDraft}
                disabled={!canDraft}
                className="rounded-2xl bg-emerald-400 p-3 text-base font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:p-4 sm:text-lg"
              >
                Draft
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 sm:p-7">
          <h3 className="text-xl font-black">Game Log</h3>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            Fantasy points reflect your pool&apos;s scoring rules.
          </p>
          {!hasReplayGameLogs && (
            <p className="mt-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
              No completed game log is available for this player yet. PPG will populate after game data is available.
            </p>
          )}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#030712] sm:mt-5">
            <table
              className="w-full text-right text-[11px] font-black text-slate-200 sm:min-w-[760px] sm:text-sm"
              style={{ minWidth: mobileGameLogMinWidth }}
            >
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
                <tr>
                  <th className="whitespace-nowrap px-2 py-2.5 text-left sm:px-4 sm:py-3">Week</th>
                  <th className="px-2 py-2.5 text-left sm:px-4 sm:py-3">Opp</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-emerald-300 sm:px-4 sm:py-3">Pts</th>
                  {gameLogColumns.map((column) => (
                    <th key={column.label} className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.label}-${row.opponent}`} className="border-b border-white/5 last:border-b-0">
                    <td className="whitespace-nowrap px-2 py-3 text-left text-slate-400 sm:px-4 sm:py-4">{row.label}</td>
                    <td className="max-w-[112px] truncate px-2 py-3 text-left sm:max-w-[180px] sm:px-4 sm:py-4">{row.opponent}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-emerald-300 sm:px-4 sm:py-4">{formatPoints(row.points)}</td>
                    {gameLogColumns.map((column) => (
                      <td key={column.label} className="whitespace-nowrap px-2 py-3 sm:px-4 sm:py-4">
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

const formatPlayerName = (name: string) => {
  const clean = name.replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length <= 1) return clean;

  const suffixMap: Record<string, string> = {
    jr: "Jr.",
    "jr.": "Jr.",
    sr: "Sr.",
    "sr.": "Sr.",
    ii: "II",
    iii: "III",
    iv: "IV",
    v: "V",
  };

  const lastPart = parts[parts.length - 1].replace(/,$/, "");
  const suffix = suffixMap[lastPart.toLowerCase()];
  const lastName = suffix ? parts[parts.length - 2] : parts[parts.length - 1];
  const firstName = parts[0];

  return `${firstName.charAt(0)}. ${lastName}${suffix ? ` ${suffix}` : ""}`;
};

function normalizePlayerSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function FootballDraftPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [position, setPosition] = useState("ALL");
  const [search, setSearch] = useState("");
  const [pendingPlayer, setPendingPlayer] = useState<FootballPlayer | null>(null);
  const [detailsPlayer, setDetailsPlayer] = useState<FootballPlayer | null>(null);
  const [players, setPlayers] = useState<FootballPlayer[]>(footballPlayers);
  const [now, setNow] = useState(() => new Date());
  const [pickTimerStartedAt, setPickTimerStartedAt] = useState(() => Date.now());
  const [pickTimerPickIndex, setPickTimerPickIndex] = useState(0);
  const [draftOpeningStartedAt, setDraftOpeningStartedAt] = useState<number | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [isPickClockPaused, setIsPickClockPaused] = useState(false);
  const [pausedPickClockRemaining, setPausedPickClockRemaining] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [draftIdentityReady, setDraftIdentityReady] = useState(false);
  const [pickError, setPickError] = useState("");
  const autoPickInFlightRef = useRef(false);
  const autoPickedKeyRef = useRef("");
  const committedPickKeyRef = useRef("");
  const wasDraftOpenRef = useRef(false);
  const wasDraftOpeningBufferActiveRef = useRef(false);
  const draftJustOpenedPickKeyRef = useRef("");
  const draftCompleteSoundPlayedRef = useRef(false);
  const tickKeyRef = useRef("");
  const pickSubmissionInFlightRef = useRef(false);
  const serverTimeOffsetRef = useRef(0);
  const announcedPickSoundKeyRef = useRef("");
  const announcedPickCountRef = useRef(0);
  const pickSoundBaselineReadyRef = useRef(false);
  const draftCompleteAfterPickSoundRef = useRef(0);
  const announcedPauseStateRef = useRef<boolean | null>(null);
  const pauseSubmissionInFlightRef = useRef(false);
  const activePoolId = pool?.id || "";

  const syncServerClock = useCallback(
    (serverNow: string | undefined, requestStartedAt = Date.now()) => {
      if (!serverNow) return;

      const serverNowMs = Date.parse(serverNow);
      if (!Number.isFinite(serverNowMs)) return;

      const responseReceivedAt = Date.now();
      const estimatedNetworkDelay = Math.max(
        0,
        (responseReceivedAt - requestStartedAt) / 2
      );
      const estimatedServerNow = serverNowMs + estimatedNetworkDelay;
      serverTimeOffsetRef.current = estimatedServerNow - responseReceivedAt;
      setNow(new Date(estimatedServerNow));
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;

    function hasSelectedTeam(candidatePool: FootballPool) {
      const chosenTeam =
        params.get("team") ||
        window.sessionStorage.getItem(`dwf-football-team-${candidatePool.id}`) ||
        "";
      if (!candidatePool.teamNames.includes(chosenTeam)) {
        window.location.replace(`/football/pool?id=${candidatePool.id}#choose-team`);
        return "";
      }
      window.sessionStorage.setItem(`dwf-football-team-${candidatePool.id}`, chosenTeam);
      setSelectedTeam(chosenTeam);
      return chosenTeam;
    }

    async function loadDraft() {
      const requestStartedAt = Date.now();
      const history = await loadPersistedFootballHistory(id!);
      if (!history) return;
      const savedPool = history.pool;
      syncServerClock(history.serverNow, requestStartedAt);
      const chosenTeam = hasSelectedTeam(savedPool);
      if (!chosenTeam) return;
      const savedPicks = history.picks;
      announcedPickSoundKeyRef.current = getPickSoundKey(savedPool.id, savedPicks.at(-1));
      announcedPickCountRef.current = savedPicks.length;
      pickSoundBaselineReadyRef.current = true;
      saveFootballPool(savedPool);
      saveFootballDraftPicks(savedPool.id, savedPicks);
      setPool(savedPool);
      setPicks(savedPicks);
      setIsPickClockPaused(savedPool.draftPaused === true);
      announcedPauseStateRef.current = savedPool.draftPaused === true;
      setPausedPickClockRemaining(savedPool.draftPaused ? savedPool.draftPausedRemaining ?? null : null);
      const savedPickStartedAt = savedPicks.at(-1)?.pickedAt ? Date.parse(savedPicks.at(-1)!.pickedAt!) : Number.NaN;
      const savedResumeStartedAt = savedPool.draftTimerStartedAt ? Date.parse(savedPool.draftTimerStartedAt) : Number.NaN;
      const savedStartedAt = Math.max(
        Number.isFinite(savedPickStartedAt) ? savedPickStartedAt : 0,
        Number.isFinite(savedResumeStartedAt) ? savedResumeStartedAt : 0
      );
      if (savedStartedAt > 0) setPickTimerStartedAt(savedStartedAt);
      setPickTimerPickIndex(savedPicks.length);
      const snapshotPlayers = savedPicks
        .map((pick) => pick.playerSnapshot)
        .filter((player): player is FootballPlayer => Boolean(player));
      if (snapshotPlayers.length) {
        setPlayers((current) => [
          ...snapshotPlayers,
          ...current.filter((player) => !snapshotPlayers.some((snapshot) => snapshot.id === player.id)),
        ]);
      }
      const organizer = await getCurrentOrganizerUser();
      if (!organizer) {
        const redirect = encodeURIComponent(`/football/pool?id=${savedPool.id}`);
        window.location.replace(`/organizer/sign-in?redirect=${redirect}`);
        return;
      }
      const commissioner = Boolean(organizer?.id && organizer.id === savedPool.ownerId);
      setIsCommissioner(commissioner);
      if (commissioner) {
        setDraftIdentityReady(true);
      } else {
        try {
          await claimTeam(savedPool.id, chosenTeam);
          setDraftIdentityReady(true);
        } catch {
          window.sessionStorage.removeItem(`dwf-football-team-${savedPool.id}`);
          window.location.replace(`/football/pool?id=${savedPool.id}#choose-team`);
          return;
        }
      }
    }

    loadDraft();
  }, [syncServerClock]);

  useEffect(() => {
    if (!activePoolId) return;
    let cancelled = false;
    let syncInFlight = false;

    async function syncDraftBoard() {
      if (syncInFlight || pickSubmissionInFlightRef.current) return;
      syncInFlight = true;
      try {
        const requestStartedAt = Date.now();
        const history = await loadPersistedFootballHistory(activePoolId);
        if (!history || cancelled) return;
        syncServerClock(history.serverNow, requestStartedAt);
        setPool((current) =>
          current && JSON.stringify(current) === JSON.stringify(history.pool)
            ? current
            : history.pool
        );
        const sharedPaused = history.pool.draftPaused === true;
        if (
          !pauseSubmissionInFlightRef.current &&
          announcedPauseStateRef.current !== null &&
          sharedPaused !== announcedPauseStateRef.current
        ) {
          playPauseResumeWhistleSound();
        }
        announcedPauseStateRef.current = sharedPaused;
        setIsPickClockPaused(sharedPaused);
        setPausedPickClockRemaining(sharedPaused ? history.pool.draftPausedRemaining ?? null : null);
        if (!sharedPaused) {
          const latestPickStartedAt = history.picks.at(-1)?.pickedAt ? Date.parse(history.picks.at(-1)!.pickedAt!) : Number.NaN;
          const resumeStartedAt = history.pool.draftTimerStartedAt ? Date.parse(history.pool.draftTimerStartedAt) : Number.NaN;
          const authoritativeStartedAt = Math.max(
            Number.isFinite(latestPickStartedAt) ? latestPickStartedAt : 0,
            Number.isFinite(resumeStartedAt) ? resumeStartedAt : 0
          );
          if (authoritativeStartedAt > 0) {
            setPickTimerStartedAt(authoritativeStartedAt);
            setPickTimerPickIndex(history.picks.length);
          }
        }
        const latestPickSoundKey = getPickSoundKey(activePoolId, history.picks.at(-1));
        const historyTotalPicks =
          history.pool.numberOfTeams * getTotalRosterSlots(history.pool.scoring);
        const historyDraftComplete =
          historyTotalPicks > 0 && history.picks.length >= historyTotalPicks;
        const previousPickCount = announcedPickCountRef.current;
        const newSharedPicks = pickSoundBaselineReadyRef.current
          ? history.picks.length > previousPickCount
            ? history.picks.slice(previousPickCount)
            : history.picks.length === previousPickCount &&
                latestPickSoundKey &&
                latestPickSoundKey !== announcedPickSoundKeyRef.current
              ? [history.picks.at(-1)!]
              : []
          : [];
        let queuedPickSounds = 0;
        newSharedPicks.forEach((pick) => {
          if (playPickMadeSound(getPickSoundKey(activePoolId, pick))) {
            queuedPickSounds += 1;
          }
        });
        if (historyDraftComplete && queuedPickSounds > 0) {
          draftCompleteAfterPickSoundRef.current =
            Date.now() + queuedPickSounds * pickMadeSoundDurationMs;
        }
        announcedPickSoundKeyRef.current = latestPickSoundKey;
        announcedPickCountRef.current = history.picks.length;
        pickSoundBaselineReadyRef.current = true;
        setPicks((current) => {
          const keyFor = (list: FootballDraftPick[]) =>
            list.map((pick) => `${pick.pickNumber}:${pick.playerId}:${pick.team}:${pick.pickedAt || ""}`).join("|");
          if (keyFor(current) === keyFor(history.picks)) return current;
          saveFootballDraftPicks(activePoolId, history.picks);
          setPendingPlayer(null);
          committedPickKeyRef.current = "";
          return history.picks;
        });
      } finally {
        syncInFlight = false;
      }
    }

    syncDraftBoard();
    const interval = window.setInterval(syncDraftBoard, 1000);
    const syncWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(new Date(Date.now() + serverTimeOffsetRef.current));
      void syncDraftBoard();
    };
    window.addEventListener("focus", syncWhenVisible);
    window.addEventListener("pageshow", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncWhenVisible);
      window.removeEventListener("pageshow", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [activePoolId, syncServerClock]);

  useEffect(() => {
    if (!pool) return;
    let cancelled = false;
    let requestInFlight = false;

    async function loadReplayPlayers() {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch(getFootballReplayUrl(pool!), { cache: "no-store" });
        if (!response.ok) throw new Error("Replay player pool failed");
        const data = await response.json();
        const replayPlayers = data?.playerPool?.players;

        if (!cancelled && Array.isArray(replayPlayers) && replayPlayers.length > 0) {
          setPlayers(replayPlayers);
        }
      } catch {
        if (!cancelled) {
          setPlayers((current) => current.length > 0 ? current : footballPlayers);
        }
      } finally {
        requestInFlight = false;
      }
    }

    const refreshPlayers = () => void loadReplayPlayers();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshPlayers();
    };
    refreshPlayers();
    const refreshInterval = window.setInterval(refreshPlayers, 30000);
    window.addEventListener("focus", refreshPlayers);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshPlayers);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pool?.createdAt, pool?.season]);

  useEffect(() => {
    let animationFrame = 0;
    let renderedSecond = -1;

    const updateVisibleClock = () => {
      const authoritativeNow = Date.now() + serverTimeOffsetRef.current;
      const authoritativeSecond = Math.floor(authoritativeNow / 1000);
      if (authoritativeSecond !== renderedSecond) {
        renderedSecond = authoritativeSecond;
        setNow(new Date(authoritativeNow));
      }
    };

    const tick = () => {
      updateVisibleClock();
      animationFrame = window.requestAnimationFrame(tick);
    };

    const catchUpClock = () => {
      renderedSecond = -1;
      updateVisibleClock();
    };

    catchUpClock();
    animationFrame = window.requestAnimationFrame(tick);
    window.addEventListener("focus", catchUpClock);
    window.addEventListener("pageshow", catchUpClock);
    document.addEventListener("visibilitychange", catchUpClock);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("focus", catchUpClock);
      window.removeEventListener("pageshow", catchUpClock);
      document.removeEventListener("visibilitychange", catchUpClock);
    };
  }, []);

  useEffect(() => {
    setSoundsEnabled(isDraftSoundEnabled());
    preloadDraftSounds();
    const unlockAudio = () => unlockDraftSounds();
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const rosterSlots = getTotalRosterSlots(pool?.scoring);
  const totalPicks = (pool?.numberOfTeams || 0) * rosterSlots;
  const draftComplete = totalPicks > 0 && picks.length >= totalPicks;
  const draftOpen = pool ? isDraftOpen(pool, now) : true;
  const draftStartsIn = pool ? getDraftStartsIn(pool, now) : null;
  const activePickClockSeconds = Math.max(0, Number(pool?.pickClockSeconds) || 0);
  const draftBoardTeamCount = pool?.numberOfTeams || 0;
  const draftBoardNameClass =
    draftBoardTeamCount >= 10
      ? "text-[clamp(0.7rem,0.95vw,0.88rem)] sm:text-[clamp(0.76rem,0.98vw,0.95rem)]"
      : draftBoardTeamCount >= 7
        ? "text-[clamp(0.76rem,1.02vw,0.95rem)] sm:text-[clamp(0.82rem,1.08vw,1.02rem)]"
      : draftBoardTeamCount >= 5
          ? "text-[clamp(0.82rem,1.12vw,1.02rem)] sm:text-[clamp(0.88rem,1.2vw,1.1rem)]"
          : "text-[clamp(0.95rem,1.35vw,1.22rem)] sm:text-[clamp(1.05rem,1.45vw,1.32rem)]";
  const draftBoardTeamClass =
    draftBoardTeamCount >= 10
      ? "text-[clamp(0.85rem,1.2vw,1.15rem)]"
      : draftBoardTeamCount >= 7
        ? "text-[clamp(0.9rem,1.35vw,1.3rem)]"
        : "text-[clamp(0.95rem,1.8vw,1.75rem)]";
  const draftOpeningBufferRemaining =
    pool &&
    pool.draftType === "scheduled" &&
    draftOpen &&
    !draftComplete &&
    picks.length === 0 &&
    draftOpeningStartedAt !== null
      ? Math.max(
          0,
          scheduledDraftOpeningBufferSeconds -
            Math.floor((now.getTime() - draftOpeningStartedAt) / 1000)
        )
      : 0;
  const draftOpeningBufferActive = draftOpeningBufferRemaining > 0;
  const pickClockRemaining =
    draftOpen &&
    !draftOpeningBufferActive &&
    !draftComplete &&
    activePickClockSeconds > 0
      ? isPickClockPaused && pausedPickClockRemaining !== null
        ? pausedPickClockRemaining
        : pickTimerPickIndex !== picks.length
          ? activePickClockSeconds
        : Math.max(
          0,
          activePickClockSeconds -
            Math.floor((now.getTime() - pickTimerStartedAt) / 1000)
        )
      : null;
  const draftedIds = new Set(picks.map((pick) => pick.playerId));
  const eligibilityCutoff = getFootballDraftEligibilityCutoff(pool, now);
  const compactDraftLayout = (pool?.numberOfTeams || 0) > 3;
  const draftRoomGridClass = compactDraftLayout
    ? "lg:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] xl:grid-cols-[minmax(380px,460px)_minmax(0,1fr)]"
    : "lg:grid-cols-[minmax(520px,640px)_1fr]";
  const playerGridClass = compactDraftLayout ? compactEligiblePlayerGrid : eligiblePlayerGrid;

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

  useEffect(() => {
    if (draftComplete) {
      const completionDelay = Math.max(
        0,
        draftCompleteAfterPickSoundRef.current - Date.now()
      );
      let completionSoundTimer: number | undefined;
      if (!draftCompleteSoundPlayedRef.current) {
        draftCompleteSoundPlayedRef.current = true;
        completionSoundTimer = window.setTimeout(
          playDraftCompleteSound,
          completionDelay
        );
      }
      if (!activePoolId) return;
      const redirect = window.setTimeout(() => {
        window.location.replace(`/football/leaderboard?id=${activePoolId}`);
      }, completionDelay + draftCompleteSoundDurationMs);
      return () => {
        if (completionSoundTimer !== undefined) {
          window.clearTimeout(completionSoundTimer);
        }
        window.clearTimeout(redirect);
      };
    }

    draftCompleteSoundPlayedRef.current = false;
    draftCompleteAfterPickSoundRef.current = 0;
  }, [activePoolId, draftComplete]);
  const eligiblePlayerTeam = isCommissioner
    ? currentTeam
    : selectedTeam || currentTeam;
  const draftablePositions = new Set(
    positions.filter((item) => {
      if (item === "ALL") return true;
      if (!pool || draftComplete) return activePositions.has(item);
      return (
        activePositions.has(item) &&
        canTeamDraftPosition({
          team: eligiblePlayerTeam,
          position: item as FootballPlayer["position"],
          picks,
          players,
          pool,
        })
      );
    })
  );
  const searchTerms = normalizePlayerSearch(search).split(" ").filter(Boolean);

  const filteredPlayers = players
    .filter((player) => {
      const matchesPosition = position === "ALL" || player.position === position;
      const matchesConference = activeConferences.includes(player.conference);
      const matchesSchedule = hasScheduledOpponent(player);
      const gameHasNotStarted = isFootballPlayerEligibleAt(
        player,
        eligibilityCutoff
      );
      const injuryEligible = getFootballInjuryAvailability(player) !== "out";
      const matchesRoster = activePositions.has(player.position);
      const isAvailable = !draftedIds.has(player.id);
      const matchesEligiblePlayerTeamRoster =
        !pool ||
        draftComplete ||
        canTeamDraftPosition({
          team: eligiblePlayerTeam,
          position: player.position,
          picks,
          players,
          pool,
        });
      const searchablePlayer = normalizePlayerSearch(
        `${player.name} ${player.school} ${player.schoolAbbreviation || ""} ${
          player.conference
        } ${player.position} ${player.injuryStatus || ""} ${player.injuryType || ""}`
      );
      const matchesSearch = searchTerms.every((term) =>
        searchablePlayer.includes(term)
      );
      return (
        isAvailable &&
        matchesPosition &&
        matchesConference &&
        matchesSchedule &&
        gameHasNotStarted &&
        injuryEligible &&
        matchesRoster &&
        matchesEligiblePlayerTeamRoster &&
        matchesSearch
      );
    })
    .sort(
      (a, b) =>
        getPlayerPpg(b, pool?.scoring) -
        getPlayerPpg(a, pool?.scoring)
    );
  const displayedPlayers = filteredPlayers.slice(0, 300);

  useEffect(() => {
    if (!draftablePositions.has(position)) {
      setPosition("ALL");
    }
  }, [draftablePositions, position]);

  useEffect(() => {
    const latestPickStartedAt = picks.at(-1)?.pickedAt
      ? Date.parse(picks.at(-1)!.pickedAt!)
      : Number.NaN;
    const resetStartedAt = pool?.draftTimerStartedAt
      ? Date.parse(pool.draftTimerStartedAt)
      : Number.NaN;
    const authoritativeStartedAt = Math.max(
      Number.isFinite(latestPickStartedAt) ? latestPickStartedAt : 0,
      Number.isFinite(resetStartedAt) ? resetStartedAt : 0
    );
    setPickTimerStartedAt(
      authoritativeStartedAt > 0 ? authoritativeStartedAt : Date.now()
    );
    setPickTimerPickIndex(picks.length);
    setIsPickClockPaused(false);
    setPausedPickClockRemaining(null);
    stopCountdownTickSound();
    if (picks.length !== 0) {
      setDraftOpeningStartedAt(null);
    }
  }, [picks.length, pool?.draftTimerStartedAt]);

  useEffect(() => {
    // Release the timeout lock only after the next pick's fresh timer has rendered.
    // Releasing it in the picks.length effect lets the next pick briefly inherit 0:00.
    autoPickInFlightRef.current = false;
    autoPickedKeyRef.current = "";
  }, [pickTimerStartedAt]);

  useEffect(() => {
    if (draftOpen && !wasDraftOpenRef.current) {
      const openingPickKey = pool ? `${pool.id}-${picks.length}` : "";
      const shouldUseOpeningBuffer = false;

      draftJustOpenedPickKeyRef.current = openingPickKey;
      setDraftOpeningStartedAt(
        shouldUseOpeningBuffer && pool
          ? getDraftOpeningBufferStartedAt(pool.id, pool.scheduledDraftAt)
          : null
      );
      const scheduledStart = pool?.scheduledDraftAt ? Date.parse(pool.scheduledDraftAt) : Number.NaN;
      setPickTimerStartedAt(
        pool?.draftType === "scheduled" && picks.length === 0 && Number.isFinite(scheduledStart)
          ? scheduledStart
          : Date.now()
      );
      setPickTimerPickIndex(picks.length);
      setIsPickClockPaused(false);
      setPausedPickClockRemaining(null);
      autoPickInFlightRef.current = false;
      autoPickedKeyRef.current = "";
      tickKeyRef.current = "";
      playDraftStartSound();
      if (!shouldUseOpeningBuffer) {
        window.setTimeout(() => {
          if (draftJustOpenedPickKeyRef.current === openingPickKey) {
            draftJustOpenedPickKeyRef.current = "";
          }
        }, 0);
      }
    }
    wasDraftOpenRef.current = draftOpen;
  }, [draftOpen, picks.length, pool]);

  useEffect(() => {
    if (draftOpeningBufferActive) {
      wasDraftOpeningBufferActiveRef.current = true;
      return;
    }

    if (wasDraftOpeningBufferActiveRef.current) {
      wasDraftOpeningBufferActiveRef.current = false;
      setPickTimerStartedAt(Date.now());
      setPickTimerPickIndex(picks.length);
      setIsPickClockPaused(false);
      setPausedPickClockRemaining(null);
      tickKeyRef.current = "";
      draftJustOpenedPickKeyRef.current = "";
      stopCountdownTickSound();
    }
  }, [draftOpeningBufferActive, picks.length]);

  useEffect(() => {
    if (
      !pool ||
      isPickClockPaused ||
      draftOpeningBufferActive ||
      pickClockRemaining === null ||
      draftComplete ||
      !draftOpen
    ) {
      stopCountdownTickSound();
      return;
    }

    const pickKey = `${pool.id}-${picks.length}`;
    if (
      pickClockRemaining >= 1 &&
      pickClockRemaining <= 8 &&
      tickKeyRef.current !== pickKey
    ) {
      tickKeyRef.current = pickKey;
      playCountdownTickSound();
    } else if (pickClockRemaining > 8) {
      stopCountdownTickSound();
    }
  }, [
    draftComplete,
    draftOpen,
    draftOpeningBufferActive,
    isPickClockPaused,
    pickClockRemaining,
    picks.length,
    pool,
  ]);

  function draftPlayer(player: FootballPlayer) {
    if (
      !pool ||
      !draftIdentityReady ||
      draftedIds.has(player.id) ||
      !isFootballPlayerEligibleAt(player, eligibilityCutoff) ||
      getFootballInjuryAvailability(player) === "out" ||
      !draftOpen ||
      isPickClockPaused ||
      draftComplete ||
      (!isCommissioner && selectedTeam !== currentTeam) ||
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

  async function savePlayerPick(player: FootballPlayer) {
    const pickKey = pool ? `${pool.id}-${picks.length}` : "";
    if (
      !pool ||
      !draftIdentityReady ||
      pickSubmissionInFlightRef.current ||
      committedPickKeyRef.current === pickKey ||
      draftedIds.has(player.id) ||
      !isFootballPlayerEligibleAt(player, eligibilityCutoff) ||
      getFootballInjuryAvailability(player) === "out" ||
      !draftOpen ||
      isPickClockPaused ||
      draftComplete ||
      (!isCommissioner && selectedTeam !== currentTeam) ||
      !canTeamDraftPosition({
        team: currentTeam,
        position: player.position,
        picks,
        players,
        pool,
      })
    ) {
      setPendingPlayer(null);
      return false;
    }

    committedPickKeyRef.current = pickKey;
    pickSubmissionInFlightRef.current = true;
    setPickError("");
    try {
      const result = await submitFootballPick({
        poolId: pool.id,
        playerId: player.id,
        team: currentTeam,
        expectedPickIndex: picks.length,
        playerSnapshot: player,
      });
      const pickedAt = result?.pickedAt || new Date().toISOString();
      const nextPicks = [
        ...picks,
        {
          playerId: player.id,
          team: currentTeam,
          pickNumber: picks.length + 1,
          pickedAt,
          playerSnapshot: player,
        },
      ];
      const nextTurnStartedAt = Date.parse(pickedAt);
      setPickTimerStartedAt(
        Number.isFinite(nextTurnStartedAt) ? nextTurnStartedAt : Date.now()
      );
      setPickTimerPickIndex(nextPicks.length);
      setPicks(nextPicks);
      const acceptedPickSoundKey = getPickSoundKey(pool.id, nextPicks.at(-1));
      announcedPickSoundKeyRef.current = acceptedPickSoundKey;
      announcedPickCountRef.current = nextPicks.length;
      pickSoundBaselineReadyRef.current = true;
      saveFootballDraftPicks(pool.id, nextPicks);
      setPendingPlayer(null);
      setDetailsPlayer(null);

      const isFinalPick = nextPicks.length >= totalPicks;
      const pickSoundQueued = playPickMadeSound(acceptedPickSoundKey);
      if (isFinalPick && pickSoundQueued) {
        draftCompleteAfterPickSoundRef.current =
          Date.now() + pickMadeSoundDurationMs;
      }
      return true;
    } catch (error) {
      console.error(error);
      setPickError(error instanceof Error ? error.message : "This pick could not be saved. Please try again.");
      committedPickKeyRef.current = "";
      const history = await loadPersistedFootballHistory(pool.id);
      if (history) {
        const latestPickSoundKey = getPickSoundKey(pool.id, history.picks.at(-1));
        const historyTotalPicks =
          history.pool.numberOfTeams * getTotalRosterSlots(history.pool.scoring);
        const historyDraftComplete =
          historyTotalPicks > 0 && history.picks.length >= historyTotalPicks;
        const previousPickCount = announcedPickCountRef.current;
        const newSharedPicks = pickSoundBaselineReadyRef.current
          ? history.picks.length > previousPickCount
            ? history.picks.slice(previousPickCount)
            : history.picks.length === previousPickCount &&
                latestPickSoundKey &&
                latestPickSoundKey !== announcedPickSoundKeyRef.current
              ? [history.picks.at(-1)!]
              : []
          : [];
        let queuedPickSounds = 0;
        newSharedPicks.forEach((pick) => {
          if (playPickMadeSound(getPickSoundKey(pool.id, pick))) {
            queuedPickSounds += 1;
          }
        });
        if (historyDraftComplete && queuedPickSounds > 0) {
          draftCompleteAfterPickSoundRef.current =
            Date.now() + queuedPickSounds * pickMadeSoundDurationMs;
        }
        announcedPickSoundKeyRef.current = latestPickSoundKey;
        announcedPickCountRef.current = history.picks.length;
        pickSoundBaselineReadyRef.current = true;
        setPicks(history.picks);
        saveFootballDraftPicks(pool.id, history.picks);
      }
      setPendingPlayer(null);
      return false;
    } finally {
      pickSubmissionInFlightRef.current = false;
      autoPickInFlightRef.current = false;
    }
  }

  function confirmDraftPlayer() {
    if (!pendingPlayer) return;
    void savePlayerPick(pendingPlayer);
  }

  useEffect(() => {
    if (
      !pool ||
      !draftIdentityReady ||
      pickClockRemaining !== 0 ||
      activePickClockSeconds <= 0 ||
      !draftOpen ||
      draftOpeningBufferActive ||
      draftComplete ||
      isPickClockPaused ||
      pickTimerPickIndex !== picks.length ||
      autoPickInFlightRef.current
    ) {
      return;
    }

    stopCountdownTickSound();

    const pickKey = `${pool.id}-${picks.length}`;
    if (
      draftJustOpenedPickKeyRef.current === pickKey ||
      autoPickedKeyRef.current === pickKey
    ) {
      return;
    }

    const nextPlayer = displayedPlayers.find(
      (player) =>
        !draftedIds.has(player.id) &&
        canTeamDraftPosition({
          team: currentTeam,
          position: player.position,
          picks,
          players,
          pool,
        })
    );

    if (!nextPlayer) return;

    autoPickInFlightRef.current = true;
    autoPickedKeyRef.current = pickKey;
    setPendingPlayer(null);
    void savePlayerPick(nextPlayer);
  }, [
    activePickClockSeconds,
    currentTeam,
    displayedPlayers,
    draftComplete,
    draftIdentityReady,
    draftOpen,
    draftOpeningBufferActive,
    draftedIds,
    isPickClockPaused,
    pickClockRemaining,
    pickTimerPickIndex,
    picks,
    players,
    pool,
  ]);

  async function undoPick() {
    if (!pool || !isCommissioner) return;
    committedPickKeyRef.current = "";
    autoPickInFlightRef.current = true;
    stopCountdownTickSound();
    setPickError("");
    try {
      await undoLastFootballPick(pool.id);
      const history = await loadPersistedFootballHistory(pool.id);
      if (history) {
        const resetStartedAt = history.pool.draftTimerStartedAt
          ? Date.parse(history.pool.draftTimerStartedAt)
          : Number.NaN;
        setPickTimerStartedAt(
          Number.isFinite(resetStartedAt) ? resetStartedAt : Date.now()
        );
        setPickTimerPickIndex(history.picks.length);
        setPool(history.pool);
        setPicks(history.picks);
        announcedPickSoundKeyRef.current = getPickSoundKey(
          pool.id,
          history.picks.at(-1)
        );
        announcedPickCountRef.current = history.picks.length;
        saveFootballDraftPicks(pool.id, history.picks);
      }
      autoPickInFlightRef.current = false;
      autoPickedKeyRef.current = "";
      tickKeyRef.current = "";
      setPendingPlayer(null);
      setDetailsPlayer(null);
    } catch (error) {
      autoPickInFlightRef.current = false;
      setPickError(error instanceof Error ? error.message : "Could not undo the last pick.");
    }
  }

  async function togglePickClockPause() {
    if (!pool || !isCommissioner || pickClockRemaining === null || activePickClockSeconds <= 0) return;

    const nextPaused = !isPickClockPaused;
    const remaining = isPickClockPaused
      ? pausedPickClockRemaining ?? pickClockRemaining
      : pickClockRemaining;
    setPickError("");
    pauseSubmissionInFlightRef.current = true;
    try {
      const sharedPool = await setFootballDraftPause({ poolId: pool.id, paused: nextPaused, remaining });
      setPool(sharedPool);
      announcedPauseStateRef.current = nextPaused;
      setIsPickClockPaused(nextPaused);
      setPausedPickClockRemaining(nextPaused ? remaining : null);
      if (!nextPaused && sharedPool.draftTimerStartedAt) {
        const sharedStartedAt = Date.parse(sharedPool.draftTimerStartedAt);
        if (Number.isFinite(sharedStartedAt)) {
          setPickTimerStartedAt(sharedStartedAt);
          setPickTimerPickIndex(picks.length);
        }
      }
      if (nextPaused) stopCountdownTickSound();
      else if (remaining <= 8) tickKeyRef.current = "";
      playPauseResumeWhistleSound();
    } catch (error) {
      setPickError(error instanceof Error ? error.message : "Could not update the shared draft clock.");
    } finally {
      pauseSubmissionInFlightRef.current = false;
    }
  }

  function toggleDraftSounds() {
    const nextSoundsEnabled = !soundsEnabled;
    setSoundsEnabled(nextSoundsEnabled);
    setDraftSoundEnabled(nextSoundsEnabled);
    if (nextSoundsEnabled) {
      preloadDraftSounds();
      unlockDraftSounds();
    }
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
      <div className="mx-auto w-full max-w-[1500px] px-2 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/" aria-label="Draft With Friends home">
              <BrandMark size="md" />
            </Link>
            <h1 className="mt-6 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              College Fantasy Football Draft Room
            </h1>
            {!draftOpen ? (
              <p className="mt-4 text-lg font-black text-slate-300 sm:text-xl md:text-2xl">
                Draft opens {formatDraftStart(pool)}
                {draftStartsIn ? ` • ${draftStartsIn}` : ""}.
              </p>
            ) : draftComplete ? (
              <p className="mt-4 text-lg font-black text-slate-300 sm:text-xl md:text-2xl">
                All picks are complete.
              </p>
            ) : (
              <p className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">
                <span className="text-emerald-300">{currentTeam}</span>{" "}
                is on the clock
              </p>
            )}
            <p className="mt-2 text-sm font-bold text-slate-500">
              {pool.season} • Pick {Math.min(picks.length + 1, totalPicks)} of {totalPicks} •{" "}
              {formatPickClock(pool.pickClockSeconds)}
            </p>
          </div>

          {isCommissioner && <div className="hidden flex-col gap-3 sm:flex-row lg:flex">
            <Link
              href={`/football/pool?id=${pool.id}&view=lobby`}
              className="rounded-2xl border border-slate-700 px-6 py-4 text-center text-base font-black text-slate-200 transition hover:border-emerald-400/40 hover:bg-[#111827] sm:px-8 sm:text-lg"
            >
              Return to Lobby
            </Link>
          </div>}
        </div>

        {pickError && (
          <div role="alert" className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
            <span>{pickError}</span>
            <button type="button" onClick={() => setPickError("")} className="shrink-0 rounded-lg border border-red-300/30 px-3 py-1.5 text-xs font-black hover:bg-red-300/10">
              Dismiss
            </button>
          </div>
        )}

        {!draftComplete && (
          <div className="fixed bottom-5 right-4 z-50 flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-2xl border border-emerald-400/30 bg-[#06261f]/95 px-3.5 py-3 text-sm font-black shadow-2xl shadow-black/50 backdrop-blur sm:right-6 sm:gap-3 sm:px-4 sm:py-3.5 sm:text-base">
            <span className="min-w-0 max-w-[190px] truncate text-emerald-300 sm:max-w-[260px]">
              {pool.draftType !== "scheduled"
                ? `${currentTeam} is up`
                : !draftOpen
                ? "Draft opens in"
                : isPickClockPaused
                ? "Draft paused"
                : draftOpeningBufferActive
                  ? formatDraftOpeningMessage(draftOpeningBufferRemaining)
                  : `${currentTeam} is up`}
            </span>
            {pool.draftType === "scheduled" && (
              <span className="shrink-0 text-white">
                {!draftOpen
                  ? draftStartsIn || "a moment"
                  : draftOpeningBufferActive
                  ? formatClockTime(draftOpeningBufferRemaining)
                  : pickClockRemaining !== null
                    ? formatClockTime(pickClockRemaining)
                    : formatPickClock(pool.pickClockSeconds)}
              </span>
            )}
          </div>
        )}

        <div className={`mt-8 grid gap-5 sm:mt-10 sm:gap-4 ${draftRoomGridClass}`}>
          <section className={`order-2 min-w-0 rounded-2xl border border-slate-600/35 bg-[#111827] p-2 shadow-xl shadow-black/40 sm:rounded-3xl lg:sticky lg:top-6 lg:order-1 lg:h-[calc(100vh-48px)] lg:overflow-hidden ${
            compactDraftLayout ? "sm:p-4" : "sm:p-6"
          }`}>
            <h2 className={compactDraftLayout ? "text-2xl font-black" : "text-3xl font-black"}>Eligible Players</h2>

            <input
              type="text"
              value={search}
              onChange={(event) => {
                const nextSearch = event.target.value;
                setSearch(nextSearch);
                if (nextSearch.trim()) setPosition("ALL");
              }}
              placeholder="Search player or school..."
              aria-label="Search eligible players by player name or school"
              className={`mt-4 w-full rounded-xl border border-slate-600/40 bg-[#172235] px-4 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/60 ${
                compactDraftLayout ? "py-3" : "py-4"
              }`}
            />

            <FormSelect
              ariaLabel="Filter players by position"
              value={position}
              onChange={setPosition}
              options={positions
                .filter((item) => draftablePositions.has(item))
                .map((item) => ({
                  value: item,
                  label: item === "ALL" ? "All Positions" : item,
                }))}
              className="mt-4"
              buttonClassName={compactDraftLayout ? "py-3" : "py-4"}
            />

            <div className={`${compactDraftLayout ? "mt-4" : "mt-6"} overflow-hidden rounded-2xl border border-slate-600/35 bg-[#050a13]`}>
              <div className={`max-h-[620px] overflow-y-auto lg:max-h-none ${
                compactDraftLayout ? "lg:h-[calc(100vh-330px)]" : "lg:h-[calc(100vh-380px)]"
              }`}>
                <div className="sticky top-0 z-10 w-full border-b border-slate-600/35 bg-[#172235] px-2 py-3 sm:px-4">
                  <div className={`grid ${playerGridClass} items-center gap-x-1.5 text-center text-xs font-black uppercase tracking-wide text-slate-500 sm:gap-x-3`}>
                    <div className="text-left">Player</div>
                    <div className="text-right text-emerald-300 md:text-center">PPG</div>
                    <div className={compactDraftLayout ? "hidden xl:block" : "hidden md:block"}>Action</div>
                  </div>
                </div>

              {displayedPlayers.map((player) => {
                const drafted = draftedIds.has(player.id);
                const selected = pendingPlayer?.id === player.id;
                const styles = positionStyles[player.position];

                return (
                  <div
                    key={player.id}
                    className={`grid ${playerGridClass} items-center gap-x-1.5 border-b border-slate-700/45 px-2 text-center text-sm font-black text-slate-300 last:border-b-0 sm:gap-x-3 sm:px-4 ${
                      drafted
                        ? "bg-[#050a13] opacity-45"
                        : selected
                          ? "bg-emerald-400/10"
                          : "bg-[#050a13]"
                    } ${compactDraftLayout ? "py-3" : "py-4"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailsPlayer(player)}
                      className="min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black sm:px-3 sm:text-xs ${styles.badge}`}>
                          {player.position}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-baseline gap-2">
                            <p className={`${compactDraftLayout ? "text-sm" : "text-base"} truncate font-black text-white`}>
                              {player.name}
                            </p>
                            <span className="shrink-0 text-xs font-black uppercase text-slate-500">
                              {player.schoolAbbreviation || player.school}
                            </span>
                          </div>
                          <p className="whitespace-normal text-xs font-bold leading-4 text-slate-500">
                            {player.gameTime} {player.opponent}
                            {player.gameStatus && <span className="text-emerald-300"> • {player.gameStatus}</span>}
                          </p>
                          {getFootballInjuryAvailability(player) === "warning" && (
                            <p className="mt-1 text-xs font-black leading-4 text-amber-300">
                              Injury: {injuryLabel(player)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    <PlayerStatColumns player={player} scoring={pool.scoring} />

                    <button
                      type="button"
                      onClick={() => draftPlayer(player)}
                      disabled={drafted || !draftIdentityReady || !draftOpen || isPickClockPaused || draftComplete || (!isCommissioner && selectedTeam !== currentTeam)}
                      className={`${compactDraftLayout ? "hidden xl:block" : "hidden md:block"} rounded-lg bg-emerald-400 px-2 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400`}
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
                  and search combination for {eligiblePlayerTeam}.
                </div>
              )}
          </section>

          <section className="order-1 flex min-w-0 flex-col rounded-2xl border border-slate-600/35 bg-[#111827] p-2.5 shadow-xl shadow-black/40 sm:rounded-3xl sm:p-6 lg:sticky lg:top-6 lg:order-2 lg:h-[calc(100vh-48px)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">Draft Board</h2>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                {isCommissioner && <button
                  type="button"
                  onClick={() => void undoPick()}
                  disabled={picks.length === 0}
                  className="min-h-10 flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm font-black text-slate-200 transition hover:border-emerald-400/40 hover:bg-[#0b1220] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-4 sm:py-3"
                >
                  Undo Pick
                </button>}
                {isCommissioner && draftOpen &&
                  !draftOpeningBufferActive &&
                  !draftComplete &&
                  activePickClockSeconds > 0 && (
                  <button
                    type="button"
                    onClick={() => void togglePickClockPause()}
                    className="min-h-10 flex-1 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/15 sm:flex-none sm:px-4 sm:py-3"
                  >
                    {isPickClockPaused ? "Resume" : "Pause"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleDraftSounds}
                  aria-label={soundsEnabled ? "Turn draft sounds off" : "Turn draft sounds on"}
                  title={soundsEnabled ? "Sound on" : "Sound off"}
                  className={`min-h-10 flex-1 rounded-xl border px-3 py-2 text-sm font-black transition sm:flex-none sm:px-4 sm:py-3 ${
                    soundsEnabled
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                      : "border-slate-700 text-slate-400 hover:border-emerald-400/40 hover:bg-[#0b1220]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                      viewBox="0 0 24 24"
                    >
                      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                      {soundsEnabled ? (
                        <>
                          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                        </>
                      ) : (
                        <>
                          <path d="m16 9 5 5" />
                          <path d="m21 9-5 5" />
                        </>
                      )}
                    </svg>
                    {soundsEnabled ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 h-[374px] min-h-0 flex-none overflow-auto rounded-2xl border border-slate-500/35 bg-[#0B1220] shadow-inner shadow-black/30 sm:mt-8 sm:h-auto sm:min-h-[620px] sm:flex-1 sm:rounded-3xl lg:min-h-0">
              <div style={{ minWidth: `${pool.numberOfTeams * 142}px` }}>
                <div
                  className="sticky top-0 z-20 grid bg-[#12313b] shadow-[0_18px_28px_rgba(0,0,0,0.35)]"
                  style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(142px, 1fr))` }}
                >
                  {pool.draftOrder.map((team) => (
                    <div key={team} className="border-r border-emerald-300/20 px-3 py-3 text-center last:border-r-0 sm:p-6">
                      <p className={`truncate font-black text-white ${draftBoardTeamClass}`}>{team}</p>
                    </div>
                  ))}
                </div>

                {Array.from({ length: rosterSlots }).map((_, roundIndex) => (
                  <div
                    key={roundIndex}
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${pool.numberOfTeams}, minmax(142px, 1fr))` }}
                  >
                    {pool.draftOrder.map((team, teamIndex) => {
                      const isSnakeRound = roundIndex % 2 === 1;
                      const actualTeamIndex = isSnakeRound
                        ? pool.numberOfTeams - 1 - teamIndex
                        : teamIndex;
                      const displayedPickIndex =
                        roundIndex * pool.numberOfTeams + actualTeamIndex;
                      const pick = picks[displayedPickIndex];
                      const player = players.find((item) => item.id === pick?.playerId) || pick?.playerSnapshot;
                      const styles = player ? positionStyles[player.position] : null;
                      const isCurrentPick =
                        !draftComplete && displayedPickIndex === picks.length;
                      const pickLabel = `${roundIndex + 1}.${actualTeamIndex + 1}`;

                      return (
                        <div
                          key={`${roundIndex}-${team}`}
                          className={`relative min-h-[108px] overflow-hidden border-r border-t p-3 pt-12 last:border-r-0 sm:min-h-40 sm:p-5 sm:pt-14 ${
                            player && styles
                              ? styles.board
                              : isCurrentPick
                                ? "border-emerald-300/60 bg-[#0b2f2c]/95 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.14)]"
                                : "border-slate-700/70 bg-[#050a13]/95"
                          }`}
                        >
                          <div
                            className={`absolute right-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black sm:right-5 sm:top-5 sm:px-3 sm:text-xs ${
                              player
                                ? "bg-blue-500/35 text-blue-50 shadow-sm shadow-blue-950/40"
                                : isCurrentPick
                                  ? "bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-950/30"
                                : "bg-[#1F2937] text-slate-500"
                            }`}
                          >
                            {pickLabel}
                          </div>

                          {player && styles ? (
                            <>
                              <p
                                className={`relative z-10 min-w-0 max-w-full overflow-hidden break-words font-black leading-tight text-white [overflow-wrap:anywhere] ${draftBoardNameClass}`}
                                style={{
                                  display: "-webkit-box",
                                  WebkitBoxOrient: "vertical",
                                  WebkitLineClamp: 2,
                                }}
                              >
                                {player.name}
                              </p>
                              <div className="relative z-10 mt-2 flex flex-wrap items-center gap-1.5 pr-1 sm:mt-3 sm:gap-2 sm:pr-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black sm:px-3 sm:text-xs ${styles.badge}`}>
                                  {player.position}
                                </span>
                                <span className="truncate text-xs font-bold text-slate-400 sm:text-sm">{player.school}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p
                                className={`relative z-10 text-sm font-black ${
                                  isCurrentPick ? "text-emerald-300" : "text-slate-500"
                                }`}
                              >
                                {pick ? "Pick recorded" : isCurrentPick ? "On the clock" : "Open"}
                              </p>
                              <p className="relative z-10 mt-2 text-xs font-bold text-slate-600 sm:mt-3 sm:text-sm">
                                {pick ? "Player data is resyncing…" : "Awaiting selection"}
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
          canDraft={draftIdentityReady && draftOpen && !isPickClockPaused && !draftComplete && !draftedIds.has(detailsPlayer.id) && isFootballPlayerEligibleAt(detailsPlayer, eligibilityCutoff) && getFootballInjuryAvailability(detailsPlayer) !== "out" && (isCommissioner || selectedTeam === currentTeam)}
        />
      )}

      {pendingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-3rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
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
            {getFootballInjuryAvailability(pendingPlayer) === "warning" && (
              <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-100">
                Injury warning: {injuryLabel(pendingPlayer)}
              </p>
            )}

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
                disabled={!isFootballPlayerEligibleAt(pendingPlayer, eligibilityCutoff) || getFootballInjuryAvailability(pendingPlayer) === "out"}
                className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {!isFootballPlayerEligibleAt(pendingPlayer, eligibilityCutoff)
                  ? "Game Started"
                  : getFootballInjuryAvailability(pendingPlayer) === "out"
                    ? "Unavailable"
                    : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
