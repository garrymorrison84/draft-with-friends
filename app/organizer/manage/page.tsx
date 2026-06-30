"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import BrandMark from "../../components/BrandMark";
import {
  getCurrentOrganizerUser,
  getDraftPicks,
  getOwnedPool,
  loadGolfers,
  updateDraftPick,
  updateOwnedPool,
  type DraftPickRow,
} from "../../lib/poolApi";

const FALLBACK_EVENT_ID = "TRAVELERS2026";

type ManagePool = {
  id: string;
  pool_name: string;
  golf_event: string;
  event_id?: string | null;
  number_of_teams: number;
  golfers_per_team: number;
  scores_to_count: number;
  team_names: string[];
  draft_order: string[];
  draft_locked?: boolean;
  archived?: boolean;
};

type GolferOption = {
  name: string;
  rank: number;
};

type PickEdit = {
  golferName: string;
  golferRank: number;
};

function getSortValue(golfer: Record<string, unknown>) {
  const rawValue =
    golfer.odds ??
    golfer.odds_sort ??
    golfer.vegas_odds ??
    golfer.rank ??
    golfer.world_rank;

  const parsedValue =
    typeof rawValue === "number"
      ? rawValue
      : Number(String(rawValue ?? "").replace("+", ""));

  return Number.isFinite(parsedValue) ? parsedValue : 999999;
}

export default function ManagePoolPage() {
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [pool, setPool] = useState<ManagePool | null>(null);
  const [poolName, setPoolName] = useState("");
  const [scoresToCount, setScoresToCount] = useState(4);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draftPicks, setDraftPicks] = useState<DraftPickRow[]>([]);
  const [golferOptions, setGolferOptions] = useState<GolferOption[]>([]);
  const [pickEdits, setPickEdits] = useState<Record<number, PickEdit>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingPickIndex, setSavingPickIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPoolForManagement() {
      const user = await getCurrentOrganizerUser();

      if (!user) {
        window.location.href = "/organizer/sign-in?redirect=/organizer";
        return;
      }

      setOrganizer(user);

      const params = new URLSearchParams(window.location.search);
      const poolId = params.get("id");

      if (!poolId) {
        setIsLoading(false);
        return;
      }

      const savedPool = await getOwnedPool(poolId, user.id);

      if (!savedPool) {
        setIsLoading(false);
        return;
      }

      const formattedPool: ManagePool = {
        id: savedPool.id,
        pool_name: savedPool.pool_name,
        golf_event: savedPool.golf_event,
        event_id: savedPool.event_id,
        number_of_teams: savedPool.number_of_teams,
        golfers_per_team: savedPool.golfers_per_team,
        scores_to_count: savedPool.scores_to_count,
        team_names: savedPool.team_names || [],
        draft_order: savedPool.draft_order || savedPool.team_names || [],
        draft_locked: Boolean(savedPool.draft_locked),
        archived: Boolean(savedPool.archived),
      };

      const [savedPicks, golfers] = await Promise.all([
        getDraftPicks(formattedPool.id),
        loadGolfers(formattedPool.event_id || FALLBACK_EVENT_ID),
      ]);

      const formattedGolfers = golfers
        .map((golfer: Record<string, unknown>) => ({
          name: String(golfer.name || ""),
          rank: getSortValue(golfer),
        }))
        .filter((golfer: GolferOption) => golfer.name)
        .sort((a: GolferOption, b: GolferOption) => a.rank - b.rank);

      const edits = (savedPicks as DraftPickRow[]).reduce<
        Record<number, PickEdit>
      >((draft, pick) => {
        draft[pick.pick_index] = {
          golferName: pick.golfer_name,
          golferRank: pick.golfer_rank ?? 999999,
        };
        return draft;
      }, {});

      setPool(formattedPool);
      setPoolName(formattedPool.pool_name);
      setScoresToCount(formattedPool.scores_to_count);
      setTeamNames(formattedPool.team_names);
      setDraftOrder(formattedPool.draft_order);
      setDraftPicks(savedPicks as DraftPickRow[]);
      setGolferOptions(formattedGolfers);
      setPickEdits(edits);
      setIsLoading(false);
    }

    loadPoolForManagement();
  }, []);

  const sortedDraftPicks = useMemo(
    () => [...draftPicks].sort((a, b) => a.pick_index - b.pick_index),
    [draftPicks]
  );

  function updateTeamName(index: number, value: string) {
    const previousName = teamNames[index];
    const nextTeamNames = [...teamNames];
    nextTeamNames[index] = value;

    setTeamNames(nextTeamNames);
    setDraftOrder((currentOrder) =>
      currentOrder.map((team) => (team === previousName ? value : team))
    );
  }

  function getFinalTeamNames() {
    return teamNames.map((team, index) => team.trim() || `Team ${index + 1}`);
  }

  async function saveSettings() {
    if (!pool || !organizer) return;

    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    const finalTeamNames = getFinalTeamNames();
    const finalDraftOrder = draftOrder.map(
      (team, index) => team.trim() || finalTeamNames[index] || `Team ${index + 1}`
    );

    try {
      const updatedPool = await updateOwnedPool(pool.id, organizer.id, {
        pool_name: poolName.trim() || "Untitled Golf Pool",
        team_names: finalTeamNames,
        draft_order: finalDraftOrder,
        scores_to_count: scoresToCount,
      });

      setPool({
        ...pool,
        ...updatedPool,
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

  function updatePickEdit(pickIndex: number, nextEdit: Partial<PickEdit>) {
    setPickEdits((current) => ({
      ...current,
      [pickIndex]: {
        golferName: current[pickIndex]?.golferName || "",
        golferRank: current[pickIndex]?.golferRank || 999999,
        ...nextEdit,
      },
    }));
  }

  function selectGolferForPick(pickIndex: number, golferName: string) {
    const selectedGolfer = golferOptions.find(
      (golfer) => golfer.name === golferName
    );

    updatePickEdit(pickIndex, {
      golferName,
      golferRank: selectedGolfer?.rank ?? pickEdits[pickIndex]?.golferRank ?? 999999,
    });
  }

  async function savePickOverride(pick: DraftPickRow) {
    if (!pool) return;

    const edit = pickEdits[pick.pick_index];

    if (!edit?.golferName.trim()) {
      setErrorMessage("Golfer name cannot be blank.");
      return;
    }

    setSavingPickIndex(pick.pick_index);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const updatedPick = await updateDraftPick(pool.id, pick.pick_index, {
        golfer_name: edit.golferName.trim(),
        golfer_rank: Number(edit.golferRank) || 999999,
      });

      setDraftPicks((current) =>
        current.map((currentPick) =>
          currentPick.pick_index === pick.pick_index
            ? (updatedPick as DraftPickRow)
            : currentPick
        )
      );
      setStatusMessage("Draft pick updated.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not update that draft pick.");
    } finally {
      setSavingPickIndex(null);
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
          <p className="mt-3 text-slate-400">
            This pool either does not exist or is not owned by your organizer
            account.
          </p>
          <Link href="/organizer" className="mt-6 inline-block text-emerald-300">
            Back to organizer dashboard →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>

          <Link href="/organizer" className="text-sm font-medium text-emerald-300">
            ← Organizer Dashboard
          </Link>
        </div>

        <div className="mt-10">
          <p className="text-sm font-extrabold uppercase text-emerald-400">
            Manage Pool
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
            {pool.pool_name}
          </h1>
          <p className="mt-3 text-slate-400">
            {pool.golf_event} • {pool.number_of_teams} teams •{" "}
            {pool.golfers_per_team} golfers per team
          </p>
        </div>

        <section className="mt-10 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
          <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
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
                  onChange={(event) =>
                    setScoresToCount(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
                />
              </div>
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveSettings}
                disabled={isSaving}
                className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/5 bg-[#111827] p-6 shadow-xl shadow-black/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase text-emerald-400">
                Commissioner Overrides
              </p>
              <h2 className="mt-2 text-3xl font-black">Drafted Golfers</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Replace or correct drafted golfers after the draft has started
                or gone live.
              </p>
            </div>

            <Link
              href={`/leaderboard?id=${pool.id}`}
              className="text-sm font-medium text-emerald-300"
            >
              View Leaderboard →
            </Link>
          </div>

          {sortedDraftPicks.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/5 bg-[#1F2937] p-5 text-slate-400">
              No golfers have been drafted yet.
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {sortedDraftPicks.map((pick) => {
                const edit = pickEdits[pick.pick_index] || {
                  golferName: pick.golfer_name,
                  golferRank: pick.golfer_rank ?? 999999,
                };

                return (
                  <div
                    key={`${pick.pool_id}-${pick.pick_index}`}
                    className="grid gap-3 rounded-2xl border border-white/5 bg-[#1F2937] p-4 lg:grid-cols-[90px_1fr_2fr_120px] lg:items-end"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Pick
                      </p>
                      <p className="mt-1 font-black text-white">
                        {pick.pick_index + 1}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Team
                      </p>
                      <p className="mt-1 font-black text-white">{pick.team}</p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                        Golfer
                      </label>
                      <select
                        value={edit.golferName}
                        onChange={(event) =>
                          selectGolferForPick(
                            pick.pick_index,
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/5 bg-[#030712] px-4 py-3 text-white outline-none"
                      >
                        {golferOptions.map((golfer) => (
                          <option key={golfer.name} value={golfer.name}>
                            {golfer.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => savePickOverride(pick)}
                      disabled={savingPickIndex === pick.pick_index}
                      className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingPickIndex === pick.pick_index ? "Saving..." : "Save"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {statusMessage && (
          <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-300">
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-red-200">
            {errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}
