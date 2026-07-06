"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createPoolId,
  savePool as saveLocalPool,
} from "../lib/poolStorage";
import {
  getCurrentOrganizerUser,
} from "../lib/poolApi";
import BrandMark from "../components/BrandMark";
import type { User } from "@supabase/supabase-js";

function getCreatePoolErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : "";

  if (message.toLowerCase().includes("invalid api key")) {
    return "Supabase rejected the API key. Check NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel and .env.local.";
  }

  if (
    message.includes("owner_id") ||
    message.includes("draft_locked") ||
    message.includes("archived")
  ) {
    return "Supabase is missing the organizer columns. Run supabase-organizer-auth.sql in the Supabase SQL editor, then try again.";
  }

  if (
    message.toLowerCase().includes("row-level security") ||
    message.toLowerCase().includes("violates row-level security")
  ) {
    return "Supabase row-level security blocked pool creation. Run supabase-organizer-auth.sql and make sure you are signed in.";
  }

  return message
    ? `Could not create pool: ${message}`
    : "Something went wrong creating the pool. Try again.";
}

async function createSharedPool(pool: {
  id: string;
  pool_name: string;
  golf_event: string;
  event_id?: string | null;
  number_of_teams: number;
  golfers_per_team: number;
  scores_to_count: number;
  team_names: string[];
  draft_order: string[];
  owner_id?: string | null;
  draft_locked: boolean;
  archived: boolean;
}) {
  const response = await fetch("/api/pools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pool),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "Could not save pool to the database.");
  }

  return result.pool;
}

export default function CreatePoolPage() {
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [poolName, setPoolName] = useState("");
  const [golfEvent, setGolfEvent] = useState("");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEventLabel, setActiveEventLabel] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  const [golfersPerTeam, setGolfersPerTeam] = useState(8);
  const [scoresToCount, setScoresToCount] = useState(4);
  const [draftOrderMethod, setDraftOrderMethod] = useState("random");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [teamNames, setTeamNames] = useState([
    "Team 1",
    "Team 2",
    "Team 3",
    "Team 4",
  ]);

  const [draftOrder, setDraftOrder] = useState([
    "Team 1",
    "Team 2",
    "Team 3",
    "Team 4",
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadOrganizer() {
      const user = await getCurrentOrganizerUser();
      setOrganizer(user);
      setIsCheckingAuth(false);
    }

    async function loadActiveEvent() {
      try {
        const response = await fetch("/api/events/active", { cache: "no-store" });
        const data = await response.json();
        const activeEvent = data?.activeEvent;

        if (activeEvent?.id && activeEvent?.name) {
          setActiveEventId(activeEvent.id);
          setActiveEventLabel(activeEvent.name);
          setGolfEvent((current) => current || activeEvent.name);
          return;
        }

        setActiveEventId(null);
        setActiveEventLabel("Scottish Open");
        setGolfEvent((current) => current || "Scottish Open");
      } catch (error) {
        console.error("Could not load active golf event", error);
        setActiveEventId(null);
        setActiveEventLabel("Scottish Open");
        setGolfEvent((current) => current || "Scottish Open");
      }
    }

    loadOrganizer();
    loadActiveEvent();
  }, []);

  function getFinalTeamNames() {
    return Array.from({ length: numberOfTeams }).map((_, index) => {
      const trimmedName = teamNames[index]?.trim();
      return trimmedName || `Team ${index + 1}`;
    });
  }

  function updateNumberOfTeams(value: number) {
    setNumberOfTeams(value);

    const updatedTeams = Array.from({ length: value }).map(
      (_, index) => teamNames[index] ?? `Team ${index + 1}`
    );

    setTeamNames(updatedTeams);
    setDraftOrder(updatedTeams);
  }

  function updateTeamName(index: number, value: string) {
    const previousName = teamNames[index];
    const updatedTeams = [...teamNames];

    updatedTeams[index] = value;
    setTeamNames(updatedTeams);

    setDraftOrder((currentOrder) =>
      currentOrder.map((team) => (team === previousName ? value : team))
    );
  }

  function randomizeDraftOrder() {
    const finalizedTeams = getFinalTeamNames();
    const shuffled = [...finalizedTeams].sort(() => Math.random() - 0.5);
    setDraftOrder(shuffled);
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDrop(dropIndex: number) {
    if (draggedIndex === null) return;

    const updatedOrder = [...draftOrder];
    const draggedTeam = updatedOrder[draggedIndex];

    updatedOrder.splice(draggedIndex, 1);
    updatedOrder.splice(dropIndex, 0, draggedTeam);

    setDraftOrder(updatedOrder);
    setDraggedIndex(null);
  }

  function moveDraftTeam(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= draftOrder.length) return;

    const updatedOrder = [...draftOrder];
    const currentTeam = updatedOrder[index];

    updatedOrder[index] = updatedOrder[nextIndex];
    updatedOrder[nextIndex] = currentTeam;

    setDraftOrder(updatedOrder);
  }

  async function createPool() {
    setIsCreating(true);
    setErrorMessage("");

    const poolId = createPoolId();
    const finalTeamNames = getFinalTeamNames();

    const finalDraftOrder =
      draftOrder.length === finalTeamNames.length
        ? draftOrder.map((team, index) => team?.trim() || finalTeamNames[index])
        : finalTeamNames;

    const localPool = {
      id: poolId,
      poolName: poolName || "Untitled Golf Pool",
      golfEvent: golfEvent || activeEventLabel || "Golf Event",
      eventId: activeEventId || undefined,
      numberOfTeams,
      golfersPerTeam,
      scoresToCount,
      teamNames: finalTeamNames,
      draftOrder: finalDraftOrder,
    };

    try {
      await createSharedPool({
        id: poolId,
        pool_name: localPool.poolName,
        golf_event: localPool.golfEvent,
        event_id: localPool.eventId || null,
        number_of_teams: numberOfTeams,
        golfers_per_team: golfersPerTeam,
        scores_to_count: scoresToCount,
        team_names: finalTeamNames,
        draft_order: finalDraftOrder,
        owner_id: organizer?.id || null,
        draft_locked: false,
        archived: false,
      });

      saveLocalPool(localPool);

      window.location.href = `/pool?id=${poolId}`;
    } catch (error) {
      console.error(error);
      setErrorMessage(getCreatePoolErrorMessage(error));
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>

          <Link href="/" className="text-sm font-medium text-emerald-300">
            Back Home
          </Link>
        </div>

        <h1 className="mt-8 text-4xl font-black md:text-5xl">
          Create a Golf Pool
        </h1>

        <p className="mt-4 text-lg text-slate-400">
          Set up your pool, add your teams, choose the draft order, and manage
          it from your organizer dashboard.
        </p>

        <div className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
          <div className="grid gap-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Pool Name
              </label>
              <input
                type="text"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                placeholder="Enter your pool name"
                className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Golf Event
              </label>
              <input
                type="text"
                value={golfEvent}
                onChange={(e) => setGolfEvent(e.target.value)}
                placeholder="U.S. Open, Masters, Memorial Tournament..."
                className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Number of Teams
                </label>
                <select
                  value={numberOfTeams}
                  onChange={(e) => updateNumberOfTeams(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <option key={num} value={num}>
                      {num} Teams
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Golfers Per Team
                </label>
                <input
                  type="number"
                  min="1"
                  value={golfersPerTeam || ""}
                  onChange={(e) =>
                    setGolfersPerTeam(
                      e.target.value === "" ? 0 : Number(e.target.value)
                    )
                  }
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Scores Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={scoresToCount || ""}
                  onChange={(e) =>
                    setScoresToCount(
                      e.target.value === "" ? 0 : Number(e.target.value)
                    )
                  }
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/60 bg-[#1F2937] p-6">
              <h2 className="text-2xl font-bold">Team Names</h2>
              <p className="mt-2 text-sm text-slate-400">
                Team fields automatically match the number of teams selected.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {teamNames.map((team, index) => (
                  <div key={index}>
                    <label className="mb-2 block text-sm font-semibold">
                      Team {index + 1}
                    </label>
                    <input
                      type="text"
                      value={team ?? ""}
                      onChange={(e) => updateTeamName(index, e.target.value)}
                      placeholder={`Team ${index + 1}`}
                      className="w-full rounded-xl border border-white/5 bg-[#030712] px-4 py-3 text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/60 bg-[#1F2937] p-6">
              <h2 className="text-2xl font-bold">Draft Order</h2>
              <p className="mt-2 text-sm text-slate-400">
                Choose how the first round draft order should be set.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-2xl border p-5 ${
                    draftOrderMethod === "random"
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/5 bg-[#111827]"
                  }`}
                >
                  <input
                    type="radio"
                    name="draftOrder"
                    checked={draftOrderMethod === "random"}
                    onChange={() => {
                      setDraftOrderMethod("random");
                      randomizeDraftOrder();
                    }}
                    className="mr-3"
                  />
                  <span
                    className={`font-bold ${
                      draftOrderMethod === "random"
                        ? "text-emerald-300"
                        : "text-white"
                    }`}
                  >
                    Randomize Draft Order
                  </span>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Draft With Friends randomly assigns the order before the
                    draft starts.
                  </p>
                </label>

                <label
                  className={`cursor-pointer rounded-2xl border p-5 ${
                    draftOrderMethod === "manual"
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/5 bg-[#111827]"
                  }`}
                >
                  <input
                    type="radio"
                    name="draftOrder"
                    checked={draftOrderMethod === "manual"}
                    onChange={() => setDraftOrderMethod("manual")}
                    className="mr-3"
                  />
                  <span
                    className={`font-bold ${
                      draftOrderMethod === "manual"
                        ? "text-emerald-300"
                        : "text-white"
                    }`}
                  >
                    Manually Set Draft Order
                  </span>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    The pool organizer chooses the exact pick order before the
                    draft begins.
                  </p>
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-white/5 bg-[#030712] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">
                      {draftOrderMethod === "manual"
                        ? "Manual Draft Order Preview"
                        : "Random Draft Order Preview"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {draftOrderMethod === "manual"
                        ? "Drag teams on desktop, or use the order controls on mobile."
                        : "Click Randomize Draft Order again to reshuffle."}
                    </p>
                  </div>

                  {draftOrderMethod === "random" && (
                    <button
                      type="button"
                      onClick={randomizeDraftOrder}
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-[#111827]"
                    >
                      Randomize Again
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {draftOrder.map((team, index) => (
                    <div
                      key={`${team}-${index}`}
                      draggable={draftOrderMethod === "manual"}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(index)}
                      className={`flex items-center justify-between rounded-xl border border-white/5 bg-[#1F2937] p-4 ${
                        draftOrderMethod === "manual"
                          ? "cursor-grab active:cursor-grabbing"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold">
                          {team?.trim() || `Team ${index + 1}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {draftOrderMethod === "manual"
                            ? "Set the draft position"
                            : "Randomized order"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {draftOrderMethod === "manual" && (
                          <div className="flex gap-2 md:hidden">
                            <button
                              type="button"
                              onClick={() => moveDraftTeam(index, -1)}
                              disabled={index === 0}
                              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              Up
                            </button>

                            <button
                              type="button"
                              onClick={() => moveDraftTeam(index, 1)}
                              disabled={index === draftOrder.length - 1}
                              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              Down
                            </button>
                          </div>
                        )}

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-lg font-black text-slate-950">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="font-bold text-emerald-300">Snake Draft Format</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Every pool uses a snake draft. The order reverses each round so
                every team gets a fair shot across the full draft.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={createPool}
              disabled={isCreating || isCheckingAuth}
              className="mt-4 block rounded-xl bg-emerald-400 px-6 py-4 text-center font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating Pool..." : "Create Pool & Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
