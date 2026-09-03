"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import BrandMark from "../../../components/BrandMark";
import FormSelect from "../../../components/FormSelect";
import {
  buildScheduledDraftAt,
  defaultDraftTimeZone,
  draftTimeZoneOptions,
  getAvailableDraftTimeValue,
  getDraftDateOptions,
  getDraftTimeOptions,
  getLocalDateValue,
  pickClockOptions,
  untimedDraftTiming,
  type DraftTimeZone,
} from "../../../lib/draftTiming";
import {
  createWinsPoolId,
  defaultWinsConferences,
  saveWinsPool,
  winsConferenceOptions,
  type WinsPoolMode,
} from "../lib/storage";

export default function CreateWinsPoolPage() {
  const [poolName, setPoolName] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  const [picksPerTeam, setPicksPerTeam] = useState(5);
  const [teamNames, setTeamNames] = useState(["Team 1", "Team 2", "Team 3", "Team 4"]);
  const [draftOrder, setDraftOrder] = useState(["Team 1", "Team 2", "Team 3", "Team 4"]);
  const [draftOrderMethod, setDraftOrderMethod] = useState("random");
  const [draftType, setDraftType] = useState<"unscheduled" | "scheduled">("unscheduled");
  const [scheduledDraftDate, setScheduledDraftDate] = useState(() => getLocalDateValue());
  const [scheduledDraftTime, setScheduledDraftTime] = useState("20:00");
  const [scheduledDraftTimeZone, setScheduledDraftTimeZone] =
    useState<DraftTimeZone>(defaultDraftTimeZone);
  const [pickClockSeconds, setPickClockSeconds] = useState(0);
  const [poolMode, setPoolMode] = useState<WinsPoolMode>("power");
  const [selectedConferences, setSelectedConferences] = useState(defaultWinsConferences);
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

  function setPowerPool() {
    setPoolMode("power");
    setSelectedConferences(defaultWinsConferences);
  }

  function toggleConference(conference: string) {
    setPoolMode("custom");
    setSelectedConferences((current) => {
      if (current.includes(conference)) {
        const next = current.filter((item) => item !== conference);
        return next.length ? next : [conference];
      }

      return [...current, conference];
    });
  }

  function createPool() {
    const id = createWinsPoolId();
    const teams = finalTeamNames();
    const order = draftOrder.length === teams.length ? draftOrder : teams;
    const availableDraftTime = getAvailableDraftTimeValue(
      scheduledDraftDate,
      scheduledDraftTime,
      scheduledDraftTimeZone
    );
    const scheduledStart = buildScheduledDraftAt(
      scheduledDraftDate,
      availableDraftTime,
      scheduledDraftTimeZone
    );

    saveWinsPool({
      id,
      poolName: poolName.trim() || "College Football Wins Pool",
      season: "2026 Season",
      numberOfTeams,
      picksPerTeam,
      teamNames: teams,
      draftOrder: order.map((team, index) => team?.trim() || teams[index]),
      poolMode,
      conferences: selectedConferences,
      draftType,
      scheduledDraftAt:
        draftType === "scheduled" ? scheduledStart : untimedDraftTiming.scheduledDraftAt,
      timeZone:
        draftType === "scheduled" ? scheduledDraftTimeZone : untimedDraftTiming.timeZone,
      pickClockSeconds:
        draftType === "scheduled" ? pickClockSeconds : untimedDraftTiming.pickClockSeconds,
      autoPickOnTimeout: draftType === "scheduled" && pickClockSeconds > 0,
      createdAt: new Date().toISOString(),
    });

    window.location.href = `/football/wins/pool?id=${id}`;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="mx-auto w-full max-w-4xl px-2.5 py-5 sm:px-6 sm:py-12">
        <Link href="/" aria-label="Draft With Friends home">
          <BrandMark size="lg" />
        </Link>

        <h1 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">
          Create a College Football Wins Pool
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">
          Draft college football teams and track who racks up the most wins over
          the season. Simple, familiar, and dangerous for anyone who talks too
          confidently in August.
        </p>

        <div className="mt-6 grid gap-4 rounded-3xl border border-white/5 bg-[#111827] p-4 shadow-xl shadow-black/40 sm:mt-10 sm:p-8">
          <TextField label="Pool Name" value={poolName} onChange={setPoolName} />

          <Panel
            title="Eligible Teams"
            body="Choose the conferences that feed the draft board."
          >
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={setPowerPool}
                className={`rounded-2xl border p-4 text-left transition sm:p-5 ${
                  poolMode === "power"
                    ? "border-emerald-400/40 bg-emerald-400/10"
                    : "border-white/5 bg-[#111827] hover:border-emerald-400/30"
                }`}
              >
                <p className="font-black text-emerald-300">
                  All Power 5 + Independents
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  ACC, Big Ten, Big 12, Pac-12, SEC, Notre Dame, and UConn.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPoolMode("custom")}
                className={`rounded-2xl border p-4 text-left transition sm:p-5 ${
                  poolMode === "custom"
                    ? "border-emerald-400/40 bg-emerald-400/10"
                    : "border-white/5 bg-[#111827] hover:border-emerald-400/30"
                }`}
              >
                <p className="font-black text-white">Custom Conferences</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Narrow the board to the leagues your group wants to draft.
                </p>
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {winsConferenceOptions.map((conference) => {
                const checked = selectedConferences.includes(conference);

                return (
                  <button
                    key={conference}
                    type="button"
                    onClick={() => toggleConference(conference)}
                    className={`rounded-xl border px-4 py-3 text-left font-bold transition ${
                      checked
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                        : "border-white/5 bg-[#030712] text-slate-300 hover:border-emerald-400/30"
                    }`}
                  >
                    {conference}
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Number of Pool Members"
              value={numberOfTeams}
              onChange={(value) => updateNumberOfTeams(Number(value))}
              options={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ({
                value: num,
                label: `${num} Pool Members`,
              }))}
            />

            <SelectField
              label="Picks Per Member"
              value={picksPerTeam}
              onChange={(value) => setPicksPerTeam(Number(value))}
              options={[3, 4, 5, 6, 7, 8, 9, 10].map((num) => ({
                value: num,
                label: `${num} Teams`,
              }))}
            />
          </div>

          <Panel title="Pool Member Names" body="These names become the draft columns and leaderboard rows.">
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {teamNames.map((team, index) => (
                <TextField
                  key={index}
                  label={`Member ${index + 1}`}
                  value={team}
                  onChange={(value) => updateTeamName(index, value)}
                  inputClassName="bg-[#030712]"
                />
              ))}
            </div>
          </Panel>

          <Panel title="Draft Order" body="Choose random order or manually set the first round.">
            <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 sm:p-5 ${
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
                <p className="mt-1 text-xs leading-5 text-slate-400 sm:mt-2 sm:text-sm sm:leading-6">
                  Draft With Friends randomly assigns the order before the draft starts.
                </p>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-4 sm:p-5 ${
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
                <p className="mt-1 text-xs leading-5 text-slate-400 sm:mt-2 sm:text-sm sm:leading-6">
                  The pool organizer chooses the exact pick order before the draft begins.
                </p>
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-white/5 bg-[#030712] p-3 sm:mt-6 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">
                    {draftOrderMethod === "manual" ? "Manual Draft Order" : "Draft Order Preview"}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {draftOrderMethod === "manual"
                      ? "Drag teams on desktop, or use the order controls on mobile."
                      : "Randomize to reshuffle the order before the draft begins."}
                  </p>
                </div>

                {draftOrderMethod === "random" && (
                  <button
                    type="button"
                    onClick={randomizeDraftOrder}
                    className="w-full whitespace-nowrap rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/15 sm:w-auto"
                  >
                    Randomize Again
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                {draftOrder.map((team, index) => (
                  <div
                    key={`${team}-${index}`}
                    draggable={draftOrderMethod === "manual"}
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className={`flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#1F2937] p-3 sm:p-4 ${
                      draftOrderMethod === "manual" ? "cursor-grab active:cursor-grabbing" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold">
                        {team?.trim() || `Team ${index + 1}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
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
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-lg font-black text-slate-950">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="Draft Timing"
            body="Choose an open-ended draft or schedule a live draft with an optional pick clock."
          >
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ChoiceButton
                active={draftType === "unscheduled"}
                title="Anytime Draft"
                body="Draft at your own pace. Share the link with your friends. No time limit per pick."
                onClick={() => setDraftType("unscheduled")}
              />
              <ChoiceButton
                active={draftType === "scheduled"}
                title="Schedule Draft"
                body="Set a draft time and choose how long each member has to make a pick."
                onClick={() => setDraftType("scheduled")}
              />
            </div>

            {draftType === "scheduled" && (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <SelectField
                    label="Draft Date"
                    value={scheduledDraftDate}
                    onChange={setScheduledDraftDate}
                    options={getDraftDateOptions()}
                  />

                  <SelectField
                    label="Draft Time"
                    value={getAvailableDraftTimeValue(
                      scheduledDraftDate,
                      scheduledDraftTime,
                      scheduledDraftTimeZone
                    )}
                    onChange={setScheduledDraftTime}
                    options={getDraftTimeOptions(
                      scheduledDraftDate,
                      scheduledDraftTimeZone
                    )}
                  />

                  <SelectField
                    label="Time Zone"
                    value={scheduledDraftTimeZone}
                    onChange={(value) => setScheduledDraftTimeZone(value as DraftTimeZone)}
                    options={draftTimeZoneOptions}
                  />
                </div>

                <div className="mt-4 max-w-md">
                  <SelectField
                    label="Pick Clock"
                    value={pickClockSeconds}
                    onChange={(value) => setPickClockSeconds(Number(value))}
                    options={pickClockOptions}
                  />
                </div>
              </>
            )}
          </Panel>

          <button
            type="button"
            onClick={createPool}
            className="mt-2 rounded-xl bg-emerald-400 px-6 py-4 text-center text-lg font-black text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300"
          >
            Create Wins Pool
          </button>
        </div>
      </div>
    </main>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
      <FormSelect
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={options}
        buttonClassName="border-white/5 bg-[#1F2937] font-normal"
      />
    </div>
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

function ChoiceButton({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition sm:p-5 ${
        active
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/5 bg-[#111827] hover:border-emerald-400/30"
      }`}
    >
      <p className={`font-black ${active ? "text-emerald-300" : "text-white"}`}>{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </button>
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
    <section className="rounded-2xl border border-slate-700/60 bg-[#1F2937] p-4 sm:rounded-3xl sm:p-6">
      <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
      {children}
    </section>
  );
}
