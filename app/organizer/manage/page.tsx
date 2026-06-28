"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "../../components/BrandMark";
import { deletePool, getPool, updatePool } from "../../lib/poolApi";
import {
  getOrganizerPoolMeta,
  saveOrganizerPoolMeta,
} from "../../lib/organizerStorage";

type ManagePool = {
  id: string;
  pool_name: string;
  golf_event: string;
  number_of_teams: number;
  golfers_per_team: number;
  scores_to_count: number;
  team_names: string[];
  draft_order: string[];
  draft_locked?: boolean;
  archived?: boolean;
};

export default function ManagePoolPage() {
  const [pool, setPool] = useState<ManagePool | null>(null);
  const [poolName, setPoolName] = useState("");
  const [scoresToCount, setScoresToCount] = useState(4);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draftLocked, setDraftLocked] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPoolForManagement() {
      const params = new URLSearchParams(window.location.search);
      const poolId = params.get("id");

      if (!poolId) {
        setIsLoading(false);
        return;
      }

      const savedPool = await getPool(poolId);

      if (!savedPool) {
        setIsLoading(false);
        return;
      }

      const meta = getOrganizerPoolMeta(savedPool.id);
      const formattedPool: ManagePool = {
        id: savedPool.id,
        pool_name: savedPool.pool_name,
        golf_event: savedPool.golf_event,
        number_of_teams: savedPool.number_of_teams,
        golfers_per_team: savedPool.golfers_per_team,
        scores_to_count: savedPool.scores_to_count,
        team_names: savedPool.team_names || [],
        draft_order: savedPool.draft_order || savedPool.team_names || [],
        draft_locked: Boolean(savedPool.draft_locked || meta.draftLocked),
        archived: Boolean(savedPool.archived || meta.archived),
      };

      setPool(formattedPool);
      setPoolName(formattedPool.pool_name);
      setScoresToCount(formattedPool.scores_to_count);
      setTeamNames(formattedPool.team_names);
      setDraftOrder(formattedPool.draft_order);
      setDraftLocked(Boolean(formattedPool.draft_locked));
      setIsLoading(false);
    }

    loadPoolForManagement();
  }, []);

  function updateTeamName(index: number, value: string) {
    const previousName = teamNames[index];
    const nextTeamNames = [...teamNames];
    nextTeamNames[index] = value;

    setTeamNames(nextTeamNames);
    setDraftOrder((currentOrder) =>
      currentOrder.map((team) => (team === previousName ? value : team))
    );
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDrop(dropIndex: number) {
    if (draggedIndex === null) return;

    const nextOrder = [...draftOrder];
    const draggedTeam = nextOrder[draggedIndex];

    nextOrder.splice(draggedIndex, 1);
    nextOrder.splice(dropIndex, 0, draggedTeam);

    setDraftOrder(nextOrder);
    setDraggedIndex(null);
  }

  function getFinalTeamNames() {
    return teamNames.map((team, index) => team.trim() || `Team ${index + 1}`);
  }

  async function saveSettings() {
    if (!pool) return;

    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    const finalTeamNames = getFinalTeamNames();
    const finalDraftOrder = draftOrder.map(
      (team, index) => team.trim() || finalTeamNames[index] || `Team ${index + 1}`
    );

    try {
      const updatedPool = await updatePool(pool.id, {
        pool_name: poolName.trim() || "Untitled Golf Pool",
        team_names: finalTeamNames,
        draft_order: finalDraftOrder,
        scores_to_count: scoresToCount,
      });

      setPool({
        ...pool,
        ...updatedPool,
        draft_locked: draftLocked,
      });
      setTeamNames(finalTeamNames);
      setDraftOrder(finalDraftOrder);
      setStatusMessage("Pool settings saved.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not save pool settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleDraftLock() {
    if (!pool) return;

    const nextLocked = !draftLocked;
    setDraftLocked(nextLocked);
    saveOrganizerPoolMeta(pool.id, { draftLocked: nextLocked });

    try {
      await updatePool(pool.id, { draft_locked: nextLocked });
    } catch (error) {
      console.warn("Draft lock saved locally only.", error);
    }
  }

  async function archivePool() {
    if (!pool) return;

    const confirmed = window.confirm(
      "Archive this pool? It will be hidden from your organizer dashboard."
    );

    if (!confirmed) return;

    saveOrganizerPoolMeta(pool.id, { archived: true });

    try {
      await updatePool(pool.id, { archived: true });
    } catch (error) {
      console.warn("Pool archived locally only.", error);
    }

    window.location.href = "/organizer";
  }

  async function removePool() {
    if (!pool) return;

    const confirmed = window.confirm(
      "Delete this pool from Supabase? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      await deletePool(pool.id);
      saveOrganizerPoolMeta(pool.id, { archived: true });
      window.location.href = "/organizer";
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not delete the pool. Try archive instead.");
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <BrandMark size="md" />
          <p className="mt-8 text-slate-400">Loading pool management...</p>
        </div>
      </main>
    );
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#030712] text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <BrandMark size="md" />
          <h1 className="mt-8 text-4xl font-black">Pool not found</h1>
          <a href="/organizer" className="mt-6 inline-block text-emerald-300">
            Back to organizer dashboard →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="md" />
          </Link>

          <a href="/organizer" className="text-sm font-medium text-emerald-300">
            ← Organizer Dashboard
          </a>
        </div>

        <div className="mt-10">
          <p className="text-sm font-extrabold uppercase text-emerald-400">
            Manage Pool
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">
            {pool.pool_name}
          </h1>
          <p className="mt-3 text-slate-400">
            {pool.golf_event} • {pool.number_of_teams} teams • {pool.golfers_per_team} golfers per team
          </p>
        </div>

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
          <div className="grid gap-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Pool Name
              </label>
              <input
                value={poolName}
                onChange={(event) => setPoolName(event.target.value)}
                className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Best Scores Count
              </label>
              <input
                type="number"
                min={1}
                max={pool.golfers_per_team}
                value={scoresToCount}
                onChange={(event) => setScoresToCount(Number(event.target.value))}
                className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
              />
            </div>

            <div className="rounded-2xl border border-slate-700/60 bg-[#1F2937] p-5">
              <h2 className="text-2xl font-black">Team Names</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {teamNames.map((team, index) => (
                  <div key={index}>
                    <label className="mb-2 block text-sm font-semibold">
                      Team {index + 1}
                    </label>
                    <input
                      value={team}
                      onChange={(event) =>
                        updateTeamName(index, event.target.value)
                      }
                      className="w-full rounded-xl border border-white/5 bg-[#030712] px-4 py-3 text-white outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/60 bg-[#1F2937] p-5">
              <h2 className="text-2xl font-black">Draft Order</h2>
              <p className="mt-2 text-sm text-slate-400">
                Drag teams to update the first-round draft order.
              </p>

              <div className="mt-5 space-y-3">
                {draftOrder.map((team, index) => (
                  <div
                    key={`${team}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className="flex cursor-grab items-center justify-between rounded-xl border border-white/5 bg-[#030712] p-4 active:cursor-grabbing"
                  >
                    <p className="font-black">{team}</p>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-lg font-black text-slate-950">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {statusMessage && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-300">
                {statusMessage}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-red-200">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveSettings}
                disabled={isSaving}
                className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>

              <button
                type="button"
                onClick={toggleDraftLock}
                className="rounded-xl border border-white/15 px-5 py-3 font-black text-white transition hover:bg-[#1F2937]"
              >
                {draftLocked ? "Unlock Draft" : "Lock Draft"}
              </button>

              <button
                type="button"
                onClick={archivePool}
                className="rounded-xl border border-yellow-300/30 px-5 py-3 font-black text-yellow-200 transition hover:bg-yellow-300/10"
              >
                Archive
              </button>

              <button
                type="button"
                onClick={removePool}
                className="rounded-xl border border-red-400/30 px-5 py-3 font-black text-red-200 transition hover:bg-red-400/10"
              >
                Delete
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
