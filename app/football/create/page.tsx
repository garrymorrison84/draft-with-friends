"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  createFootballPoolId,
  defaultFootballPlayerPool,
  defaultScoring,
  saveFootballPool,
} from "../lib/storage";

const conferenceOptions = [
  "ACC",
  "AAC",
  "Big Ten",
  "Big 12",
  "Pac-12",
  "SEC",
  "Independents",
];

const powerPoolConferences = defaultFootballPlayerPool.conferences;

export default function CreateFootballPoolPage() {
  const [poolName, setPoolName] = useState("College Football Week 1 Draft");
  const [week, setWeek] = useState("Week 1");
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  const [teamNames, setTeamNames] = useState(["Team 1", "Team 2", "Team 3", "Team 4"]);
  const [draftOrder, setDraftOrder] = useState(["Team 1", "Team 2", "Team 3", "Team 4"]);
  const [draftOrderMethod, setDraftOrderMethod] = useState("random");
  const [playerPoolMode, setPlayerPoolMode] = useState<"power" | "custom">("power");
  const [selectedConferences, setSelectedConferences] = useState(powerPoolConferences);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function finalTeamNames() {
    return Array.from({ length: numberOfTeams }).map(
      (_, index) => teamNames[index]?.trim() || `Team ${index + 1}`
    );
  }

  function updateNumberOfTeams(value: number) {
    const updatedTeams = Array.from({ length: value }).map(
      (_, index) => teamNames[index] ?? `Team ${index + 1}`
    );

    setNumberOfTeams(value);
    setTeamNames(updatedTeams);
    setDraftOrder(updatedTeams);
  }

  function updateTeamName(index: number, value: string) {
    const previousName = teamNames[index];
    const updatedTeams = [...teamNames];
    updatedTeams[index] = value;
    setTeamNames(updatedTeams);
    setDraftOrder((current) =>
      current.map((team) => (team === previousName ? value : team))
    );
  }

  function randomizeDraftOrder() {
    setDraftOrder([...finalTeamNames()].sort(() => Math.random() - 0.5));
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

  function handleDrop(dropIndex: number) {
    if (draggedIndex === null) return;
    const updatedOrder = [...draftOrder];
    const draggedTeam = updatedOrder[draggedIndex];
    updatedOrder.splice(draggedIndex, 1);
    updatedOrder.splice(dropIndex, 0, draggedTeam);
    setDraftOrder(updatedOrder);
    setDraggedIndex(null);
  }

  function setPowerPlayerPool() {
    setPlayerPoolMode("power");
    setSelectedConferences(powerPoolConferences);
  }

  function toggleConference(conference: string) {
    setPlayerPoolMode("custom");
    setSelectedConferences((current) => {
      if (current.includes(conference)) {
        const next = current.filter((item) => item !== conference);
        return next.length ? next : [conference];
      }

      return [...current, conference];
    });
  }

  function playerPoolLabel() {
    if (playerPoolMode === "power") return "All Power 5 + Independents";
    return selectedConferences.join(", ");
  }

  function continueToScoring() {
    const id = createFootballPoolId();
    const teams = finalTeamNames();
    const order = draftOrder.length === teams.length ? draftOrder : teams;
    const playerPool = {
      mode: playerPoolMode,
      conferences: selectedConferences,
    };

    saveFootballPool({
      id,
      poolName: poolName.trim() || "College Football Draft",
      season: week.trim() || "Week 1",
      numberOfTeams,
      teamNames: teams,
      draftOrder: order.map((team, index) => team?.trim() || teams[index]),
      playerPool,
      scoring: { ...defaultScoring, playerPool: playerPoolLabel() },
      createdAt: new Date().toISOString(),
    });

    window.location.href = `/football/scoring?id=${id}`;
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <Link href="/football" className="text-sm font-medium text-emerald-300">
            College Football Home
          </Link>
        </div>

        <h1 className="mt-8 text-4xl font-black md:text-5xl">
          Create a College Football Pool
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Set up the weekly pool, team names, and draft order before choosing scoring.
        </p>

        <div className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
          <div className="grid gap-6">
            <TextField label="Pool Name" value={poolName} onChange={setPoolName} />

            <Panel
              title="Player Pool"
              body="Choose which conferences and independents are eligible for this weekly draft."
            >
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={setPowerPlayerPool}
                  className={`rounded-2xl border p-5 text-left transition ${
                    playerPoolMode === "power"
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/5 bg-[#111827] hover:border-emerald-400/30"
                  }`}
                >
                  <p
                    className={`font-bold ${
                      playerPoolMode === "power" ? "text-emerald-300" : "text-white"
                    }`}
                  >
                    All Power 5 + Independents
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    ACC, Big Ten, Big 12, Pac-12, SEC, Notre Dame, UConn, and other independents.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPlayerPoolMode("custom")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    playerPoolMode === "custom"
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/5 bg-[#111827] hover:border-emerald-400/30"
                  }`}
                >
                  <p
                    className={`font-bold ${
                      playerPoolMode === "custom" ? "text-emerald-300" : "text-white"
                    }`}
                  >
                    Custom Conferences
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Pick only the leagues your group wants in the player pool.
                  </p>
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {conferenceOptions.map((conference) => {
                  const checked = selectedConferences.includes(conference);

                  return (
                    <button
                      key={conference}
                      type="button"
                      onClick={() => toggleConference(conference)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        checked
                          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                          : "border-white/5 bg-[#030712] text-slate-300 hover:border-emerald-400/30"
                      }`}
                    >
                      <span className="font-bold">{conference}</span>
                      <span
                        aria-hidden="true"
                        className={`h-6 w-10 rounded-full border transition ${
                          checked
                            ? "border-emerald-400 bg-emerald-400"
                            : "border-white/20"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </Panel>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Week
                </label>
                <select
                  value={week}
                  onChange={(event) => setWeek(event.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white"
                >
                  {Array.from({ length: 18 }).map((_, index) => (
                    <option key={index + 1} value={`Week ${index + 1}`}>
                      Week {index + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Number of Teams
                </label>
                <select
                  value={numberOfTeams}
                  onChange={(event) => updateNumberOfTeams(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <option key={num} value={num}>
                      {num} Teams
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Panel title="Team Names" body="Team fields automatically match the number selected.">
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {teamNames.map((team, index) => (
                  <TextField
                    key={index}
                    label={`Team ${index + 1}`}
                    value={team}
                    onChange={(value) => updateTeamName(index, value)}
                    inputClassName="bg-[#030712]"
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Draft Order" body="Choose random order or manually set the first round.">
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
                    Draft With Friends randomly assigns the order before the draft starts.
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
                    The pool organizer chooses the exact pick order before the draft begins.
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
                      onDragStart={() => setDraggedIndex(index)}
                      onDragOver={(event) => event.preventDefault()}
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
            </Panel>

            <button
              type="button"
              onClick={continueToScoring}
              className="mt-4 rounded-xl bg-emerald-400 px-6 py-4 text-center font-bold text-slate-950 hover:bg-emerald-300"
            >
              Continue to Scoring Setup
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
  inputClassName = "bg-[#1F2937]",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border border-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-600 ${inputClassName}`}
      />
    </div>
  );
}

function Panel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-700/60 bg-[#1F2937] p-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
      {children}
    </div>
  );
}
