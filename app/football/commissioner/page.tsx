"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  type FootballDraftPick,
  type FootballPlayer,
  type FootballPool,
  defaultFootballPlayerPool,
  footballPlayers,
  loadFootballDraftPicks,
  loadFootballPool,
  saveFootballDraftPicks,
  saveFootballPool,
} from "../lib/storage";
import {
  updateCommissionerFootballDraftPick,
  updateCommissionerFootballTeamNames,
} from "../lib/platformStorage";

function hasScheduledOpponent(player: FootballPlayer) {
  return /^(vs|@)\s+\S+/.test(player.opponent.trim());
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim();
}

type FootballRosterSlot = FootballPlayer["position"] | "FLEX";

function isFlexPosition(position: FootballPlayer["position"]) {
  return position === "RB" || position === "WR" || position === "TE";
}

function inferRosterSlotsForTeam({
  team,
  picks,
  players,
  pool,
}: {
  team: string;
  picks: FootballDraftPick[];
  players: FootballPlayer[];
  pool: FootballPool;
}) {
  const scoring = pool.scoring;
  const slotByPickNumber = new Map<number, FootballRosterSlot>();
  const teamPicks = picks
    .filter((pick) => pick.team === team)
    .sort((a, b) => a.pickNumber - b.pickNumber)
    .map((pick) => ({
      pick,
      player: players.find((player) => player.id === pick.playerId),
    }))
    .filter((entry): entry is { pick: FootballDraftPick; player: FootballPlayer } =>
      Boolean(entry.player)
    );

  if (!scoring) {
    teamPicks.forEach(({ pick, player }) => slotByPickNumber.set(pick.pickNumber, player.position));
    return slotByPickNumber;
  }

  const remaining = [...teamPicks];
  const takeNext = (
    predicate: (player: FootballPlayer) => boolean,
    slot: FootballRosterSlot
  ) => {
    const index = remaining.findIndex(({ player }) => predicate(player));
    if (index === -1) return;

    const [entry] = remaining.splice(index, 1);
    slotByPickNumber.set(entry.pick.pickNumber, slot);
  };
  const takePosition = (position: FootballPlayer["position"], count: number) => {
    for (let index = 0; index < count; index += 1) {
      takeNext((player) => player.position === position, position);
    }
  };

  takePosition("QB", scoring.roster.QB);
  takePosition("RB", scoring.roster.RB);
  takePosition("WR", scoring.roster.WR);
  takePosition("TE", scoring.roster.TE);

  for (let index = 0; index < scoring.roster.FLEX; index += 1) {
    takeNext((player) => isFlexPosition(player.position), "FLEX");
  }

  takePosition("DST", scoring.roster.DST);
  takePosition("K", scoring.roster.K);

  remaining.forEach(({ pick, player }) => slotByPickNumber.set(pick.pickNumber, player.position));

  return slotByPickNumber;
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
      const player = players.find((item) => item.id === pick.playerId);
      if (player) counts[player.position] += 1;
    });

  return counts;
}

function teamRosterIsValid({
  team,
  picks,
  players,
  pool,
}: {
  team: string;
  picks: FootballDraftPick[];
  players: FootballPlayer[];
  pool: FootballPool;
}) {
  const roster = pool.scoring?.roster;
  if (!roster) return true;

  const counts = positionCountsForTeam(team, picks, players);

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

function playerFitsRosterSlot(player: FootballPlayer, slot: FootballRosterSlot) {
  return slot === "FLEX" ? isFlexPosition(player.position) : player.position === slot;
}

export default function FootballCommissionerPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [players, setPlayers] = useState<FootballPlayer[]>(footballPlayers);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [pickSearch, setPickSearch] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [pickSaveStatus, setPickSaveStatus] = useState<{
    pickNumber: number;
    status: "saving" | "saved" | "error";
    message?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get("id");

    if (!poolId) {
      setIsLoading(false);
      return;
    }

    const savedPool = loadFootballPool(poolId);

    if (!savedPool) {
      setIsLoading(false);
      return;
    }

    setPool(savedPool);
    setPicks(loadFootballDraftPicks(savedPool.id));
    setTeamNames(savedPool.teamNames);
    setIsLoading(false);

    async function loadReplayPlayers() {
      try {
        const response = await fetch("/api/football/replay");
        const data = await response.json();
        const replayPlayers = data?.playerPool?.players;

        if (Array.isArray(replayPlayers) && replayPlayers.length > 0) {
          setPlayers(replayPlayers as FootballPlayer[]);
        }
      } catch {
        setPlayers(footballPlayers);
      }
    }

    loadReplayPlayers();
  }, []);

  useEffect(() => {
    if (saveStatus === "idle" || saveStatus === "saving") return;

    const timeout = window.setTimeout(() => setSaveStatus("idle"), 3000);

    return () => window.clearTimeout(timeout);
  }, [saveStatus]);

  useEffect(() => {
    if (pickSaveStatus === null || pickSaveStatus.status === "saving") return;

    const timeout = window.setTimeout(() => setPickSaveStatus(null), 3000);

    return () => window.clearTimeout(timeout);
  }, [pickSaveStatus]);

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );
  const activeConferences =
    pool?.playerPool?.conferences || defaultFootballPlayerPool.conferences;
  const availablePlayers = useMemo(
    () =>
      players
        .filter(
          (player) =>
            activeConferences.includes(player.conference) && hasScheduledOpponent(player)
        )
        .sort((a, b) => b.projected - a.projected),
    [activeConferences, players]
  );
  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => a.pickNumber - b.pickNumber),
    [picks]
  );
  const draftedIds = useMemo(
    () => new Set(picks.map((pick) => pick.playerId)),
    [picks]
  );
  const rosterSlotByPickNumber = useMemo(() => {
    if (!pool) return new Map<number, FootballRosterSlot>();

    const next = new Map<number, FootballRosterSlot>();

    Array.from(new Set(picks.map((pick) => pick.team))).forEach((team) => {
      inferRosterSlotsForTeam({ team, picks, players, pool }).forEach((slot, pickNumber) => {
        next.set(pickNumber, slot);
      });
    });

    return next;
  }, [picks, players, pool]);

  function updateTeamName(index: number, value: string) {
    setTeamNames((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  async function saveTeamNames() {
    if (!pool) return;

    const nextNames = teamNames.map(
      (team, index) => team.trim() || `Team ${index + 1}`
    );
    const renamedDraftOrder = pool.draftOrder.map((team) => {
      const previousIndex = pool.teamNames.indexOf(team);
      return previousIndex >= 0 ? nextNames[previousIndex] : team;
    });

    setSaveStatus("saving");
    setSaveError("");

    try {
      const sharedPool = await updateCommissionerFootballTeamNames({
        poolId: pool.id,
        teamNames: nextNames,
      });
      const nextPool = {
        ...pool,
        ...sharedPool,
        teamNames: nextNames,
        draftOrder: sharedPool.draftOrder || renamedDraftOrder,
      };
      const renamedPicks = picks.map((pick) => {
        const previousIndex = pool.teamNames.indexOf(pick.team);
        return previousIndex >= 0 ? { ...pick, team: nextNames[previousIndex] } : pick;
      });

      saveFootballPool(nextPool);
      saveFootballDraftPicks(pool.id, renamedPicks);
      setPool(nextPool);
      setPicks(renamedPicks);
      setTeamNames(nextNames);
      setSaveStatus("saved");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Team names could not be saved.");
      setSaveStatus("error");
    }
  }

  function draftPickOptions(pick: FootballDraftPick) {
    const query = normalizeSearch(pickSearch[pick.pickNumber] || "");
    const currentPlayer = playerById.get(pick.playerId);
    const rosterSlot = rosterSlotByPickNumber.get(pick.pickNumber) || currentPlayer?.position;

    if (query.length < 2) return [];
    if (!pool || !rosterSlot) return [];

    return availablePlayers
      .filter((player) => {
        const alreadyDraftedElsewhere =
          draftedIds.has(player.id) && player.id !== pick.playerId;
        const searchable = `${player.name} ${player.school} ${player.position}`.toLowerCase();
        const replacementPicks = picks.map((item) =>
          item.pickNumber === pick.pickNumber ? { ...item, playerId: player.id } : item
        );

        return (
          !alreadyDraftedElsewhere &&
          playerFitsRosterSlot(player, rosterSlot) &&
          teamRosterIsValid({ team: pick.team, picks: replacementPicks, players, pool }) &&
          searchable.includes(query)
        );
      })
      .slice(0, 6);
  }

  async function saveDraftPickOverride(pick: FootballDraftPick, player: FootballPlayer) {
    if (!pool) return;

    const currentPlayer = playerById.get(pick.playerId);
    const rosterSlot = rosterSlotByPickNumber.get(pick.pickNumber) || currentPlayer?.position;

    if (!rosterSlot || !playerFitsRosterSlot(player, rosterSlot)) return;

    const nextPicks = picks.map((item) =>
      item.pickNumber === pick.pickNumber ? { ...item, playerId: player.id } : item
    );

    if (!teamRosterIsValid({ team: pick.team, picks: nextPicks, players, pool })) return;

    setPickSaveStatus({ pickNumber: pick.pickNumber, status: "saving" });

    try {
      await updateCommissionerFootballDraftPick({
        poolId: pool.id,
        pickNumber: pick.pickNumber,
        player,
      });
      const sharedPicks = nextPicks.map((item) =>
        item.pickNumber === pick.pickNumber
          ? { ...item, playerId: player.id, playerSnapshot: player }
          : item
      );
      saveFootballDraftPicks(pool.id, sharedPicks);
      setPicks(sharedPicks);
      setPickSearch((current) => ({ ...current, [pick.pickNumber]: "" }));
      setPickSaveStatus({ pickNumber: pick.pickNumber, status: "saved" });
    } catch (error) {
      setPickSaveStatus({
        pickNumber: pick.pickNumber,
        status: "error",
        message: error instanceof Error ? error.message : "Draft pick could not be updated.",
      });
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <BrandMark size="md" />
          <h1 className="mt-8 text-4xl font-black">Loading commissioner tools...</h1>
        </div>
      </main>
    );
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
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-emerald-300">
              Commissioner Tools
            </p>
            <h1 className="mt-2 break-words text-4xl font-black md:text-5xl">
              {pool.poolName}
            </h1>
            <p className="mt-3 text-base font-bold text-slate-400">
              Edit team names, roster settings, scoring, and draft picks.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/football/pool?id=${pool.id}`}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-8 py-4 text-center text-lg font-black text-emerald-300 transition hover:bg-emerald-400/15"
            >
              Back to Lobby
            </Link>
            <Link
              href={`/football/leaderboard?id=${pool.id}`}
              className="rounded-2xl bg-emerald-400 px-8 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        <section id="team-names" className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
          <h2 className="text-2xl font-black">Team Names</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Update display names for the lobby, draft board, and leaderboard.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {teamNames.map((team, index) => (
              <div key={index}>
                <label className="mb-2 block text-sm font-semibold">
                  Team {index + 1}
                </label>
                <input
                  type="text"
                  value={team}
                  onChange={(event) => updateTeamName(index, event.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-[#030712] px-4 py-3 text-white outline-none placeholder:text-slate-600"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={saveTeamNames}
            disabled={saveStatus === "saving"}
            className="mt-6 rounded-xl bg-emerald-400 px-7 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "Saved to Live Pool"
                : "Save Team Names"}
          </button>
          {saveStatus === "error" && saveError ? (
            <p className="mt-3 text-sm font-bold text-rose-300">{saveError}</p>
          ) : null}
        </section>

        <section id="draft-picks" className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-3 shadow-xl shadow-black/40 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Draft Picks</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Search for a replacement player, then save that pick.
              </p>
            </div>
            <Link
              href={`/football/leaderboard?id=${pool.id}`}
              className="rounded-2xl bg-emerald-400 px-6 py-3 text-center text-base font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
            >
              View Leaderboard
            </Link>
          </div>

          {sortedPicks.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-white/5 bg-[#1F2937] p-5 font-semibold text-slate-400">
              No picks have been made yet.
            </p>
          ) : (
            <div className="mt-6 space-y-2">
              {sortedPicks.map((pick) => {
                const currentPlayer = playerById.get(pick.playerId);
                const rosterSlot =
                  rosterSlotByPickNumber.get(pick.pickNumber) || currentPlayer?.position;
                const options = draftPickOptions(pick);

                return (
                  <div
                    key={pick.pickNumber}
                    className="rounded-2xl border border-white/5 bg-[#1F2937] p-2.5 sm:p-4"
                  >
                    <div className="grid grid-cols-[28px_52px_minmax(72px,1fr)_minmax(105px,1.35fr)] items-end gap-1.5 sm:gap-3 lg:grid-cols-[72px_140px_minmax(180px,1fr)_minmax(300px,0.95fr)]">
                      <div className="min-w-0">
                        <p className="whitespace-nowrap text-[9px] font-black uppercase leading-tight text-slate-500 sm:text-xs sm:tracking-wide">
                          Pick
                        </p>
                        <p className="mt-1 text-lg font-black sm:text-2xl">{pick.pickNumber}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="whitespace-nowrap text-[9px] font-black uppercase leading-tight text-slate-500 sm:text-xs sm:tracking-wide">
                          Team
                        </p>
                        <p className="mt-1 truncate text-sm font-black sm:text-lg">{pick.team}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="whitespace-nowrap text-[9px] font-black uppercase leading-tight text-slate-500 sm:text-xs sm:tracking-wide">
                          Current Player
                        </p>
                        <p className="mt-1 truncate text-sm font-black sm:text-lg">
                          {currentPlayer?.name || "Unknown Player"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <label className="mb-1 block truncate whitespace-nowrap text-[9px] font-black uppercase leading-tight text-slate-500 sm:mb-2 sm:text-xs sm:tracking-wide">
                          Search Replacement
                          {rosterSlot ? (
                            <span className="ml-1 text-emerald-300 sm:ml-2">
                              {rosterSlot === "FLEX" ? "RB/WR/TE" : rosterSlot}
                            </span>
                          ) : null}
                        </label>
                        <input
                          type="search"
                          value={pickSearch[pick.pickNumber] || ""}
                          onChange={(event) =>
                            setPickSearch((current) => ({
                              ...current,
                              [pick.pickNumber]: event.target.value,
                            }))
                          }
                          placeholder="Search player, school, or position..."
                          className="w-full min-w-0 rounded-lg border border-white/5 bg-[#030712] px-2 py-2 text-xs text-white outline-none placeholder:text-slate-600 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-base"
                        />
                      </div>
                    </div>

                    {options.length > 0 && (
                      <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {options.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => saveDraftPickOverride(pick, player)}
                            disabled={pickSaveStatus?.status === "saving"}
                            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-left transition hover:bg-emerald-400/15 disabled:cursor-wait disabled:opacity-60"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-black text-white">
                                {player.name}
                              </span>
                              <span className="block truncate text-sm font-semibold text-slate-400">
                                {player.position} • {player.school}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-lg bg-emerald-400 px-3 py-1 text-sm font-black text-slate-950">
                              Select
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {pickSaveStatus?.pickNumber === pick.pickNumber ? (
                      <p
                        className={`mt-3 text-sm font-black ${
                          pickSaveStatus.status === "error"
                            ? "text-rose-300"
                            : "text-emerald-300"
                        }`}
                      >
                        {pickSaveStatus.status === "saving"
                          ? "Updating live pool..."
                          : pickSaveStatus.status === "saved"
                            ? "Pick updated in live pool."
                            : pickSaveStatus.message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40 sm:p-8">
          <h2 className="text-2xl font-black">Pool Controls</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Jump into the core commissioner workflows.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <ToolLink href={`/football/scoring?id=${pool.id}`} label="Edit Roster + Scoring" />
            <ToolLink href={`/football/commissioner?id=${pool.id}#draft-picks`} label="Adjust Draft Picks" />
          </div>
        </section>
      </div>
    </main>
  );
}

function ToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-emerald-400 px-5 py-4 text-center font-black text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
    >
      {label}
    </Link>
  );
}
