"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballDraftPick,
  FootballPlayer,
  FootballPool,
  footballPlayers,
  getTotalRosterSlots,
  loadFootballDraftPicks,
  loadFootballPool,
  saveFootballDraftPicks,
} from "../lib/storage";

const positions = ["ALL", "QB", "RB", "WR", "TE", "DST", "K"];

const positionStyles: Record<FootballPlayer["position"], { badge: string; card: string; board: string }> = {
  QB: {
    badge: "border-fuchsia-400/35 bg-fuchsia-400/15 text-fuchsia-200",
    card: "hover:border-fuchsia-400/70",
    board: "border-l-fuchsia-400",
  },
  RB: {
    badge: "border-teal-300/35 bg-teal-300/15 text-teal-200",
    card: "hover:border-teal-300/70",
    board: "border-l-teal-300",
  },
  WR: {
    badge: "border-sky-300/35 bg-sky-300/15 text-sky-200",
    card: "hover:border-sky-300/70",
    board: "border-l-sky-300",
  },
  TE: {
    badge: "border-amber-300/35 bg-amber-300/15 text-amber-200",
    card: "hover:border-amber-300/70",
    board: "border-l-amber-300",
  },
  DST: {
    badge: "border-lime-300/35 bg-lime-300/15 text-lime-200",
    card: "hover:border-lime-300/70",
    board: "border-l-lime-300",
  },
  K: {
    badge: "border-violet-300/35 bg-violet-300/15 text-violet-200",
    card: "hover:border-violet-300/70",
    board: "border-l-violet-300",
  },
};

export default function FootballDraftPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [picks, setPicks] = useState<FootballDraftPick[]>([]);
  const [position, setPosition] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState<FootballPlayer | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadFootballPool(id);
    if (savedPool) {
      setPool(savedPool);
      setPicks(loadFootballDraftPicks(savedPool.id));
    }
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

  const filteredPlayers = footballPlayers.filter((player) => {
    const matchesPosition = position === "ALL" || player.position === position;
    const matchesSearch =
      player.name.toLowerCase().includes(search.toLowerCase()) ||
      player.school.toLowerCase().includes(search.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  function draftPlayer(player: FootballPlayer) {
    if (!pool || draftedIds.has(player.id) || draftComplete) return;
    setPendingPlayer(player);
  }

  function cancelDraftPlayer() {
    setPendingPlayer(null);
  }

  function confirmDraftPlayer() {
    if (!pool || !pendingPlayer || draftedIds.has(pendingPlayer.id) || draftComplete) {
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

        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:p-6">
            <h2 className="text-3xl font-black">Eligible Players</h2>
            <p className="mt-3 text-slate-400">
              Filter by position, search player or school, then draft from the list.
            </p>

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
              {positions.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All Positions" : item}
                </option>
              ))}
            </select>

            <div className="mt-6 space-y-4">
              {filteredPlayers.map((player) => {
                const drafted = draftedIds.has(player.id);
                const selected = pendingPlayer?.id === player.id;
                const styles = positionStyles[player.position];
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => draftPlayer(player)}
                    disabled={drafted || draftComplete}
                    className={`w-full rounded-2xl border p-5 text-left transition ${
                      drafted
                        ? "border-white/5 bg-[#030712] opacity-45"
                        : selected
                          ? "border-emerald-300 bg-emerald-400/10 shadow-lg shadow-emerald-400/10"
                          : `border-emerald-400/25 bg-[#1F2937] ${styles.card}`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xl font-black">{player.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles.badge}`}>
                            {player.position}
                          </span>
                          <span className="text-sm font-bold text-slate-400">{player.school}</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-black text-emerald-300">
                        {drafted ? "Taken" : selected ? "Selected" : "Pick"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
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
                  <div key={team} className="border-r border-emerald-400/20 bg-emerald-700 p-4 text-center last:border-r-0 sm:p-6">
                    <p className="text-sm font-black uppercase tracking-widest text-emerald-100/80">Team</p>
                    <p className="mt-2 text-2xl font-black">{team}</p>
                  </div>
                ))}

                {Array.from({ length: totalPicks }).map((_, index) => {
                  const round = Math.floor(index / pool.numberOfTeams);
                  const spot = index % pool.numberOfTeams;
                  const boardTeamIndex = round % 2 === 1 ? pool.numberOfTeams - spot - 1 : spot;
                  const pick = picks[index];
                  const player = footballPlayers.find((item) => item.id === pick?.playerId);
                  const styles = player ? positionStyles[player.position] : null;

                  return (
                    <div
                      key={index}
                      className={`min-h-32 border-r border-t border-slate-700/60 bg-[#1b3458] p-4 last:border-r-0 sm:min-h-36 sm:p-5 ${
                        styles ? `border-l-4 ${styles.board}` : ""
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
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles?.badge || ""}`}>
                            {player.position}
                          </span>
                          <span className="text-sm font-bold text-slate-400">{player.school}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

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
