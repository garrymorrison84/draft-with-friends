"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  getDraftPicks,
  getPool,
  loadGolfers,
  type DraftPickRow,
} from "../../lib/poolApi";
import {
  loadDraftPicks as loadLocalDraftPicks,
  loadPool as loadLocalPool,
  saveDraftPicks as saveLocalDraftPicks,
  updatePool as updateLocalPool,
} from "../../lib/poolStorage";

const FALLBACK_EVENT_ID = "GENESIS_SCOTTISH_OPEN_2026";

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
  hasOdds: boolean;
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

  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return 999999;
  }

  const parsedValue =
    typeof rawValue === "number"
      ? rawValue
      : Number(String(rawValue).replace("+", ""));

  return Number.isFinite(parsedValue) ? parsedValue : 999999;
}

function getTeamIndexForPick(pickNumber: number, teamCount: number) {
  const roundIndex = Math.floor(pickNumber / teamCount);
  const pickInRound = pickNumber % teamCount;
  const isSnakeRound = roundIndex % 2 === 1;

  return isSnakeRound ? teamCount - 1 - pickInRound : pickInRound;
}

export default function ManagePoolPage() {
  const [pool, setPool] = useState<ManagePool | null>(null);
  const [isLocalPool, setIsLocalPool] = useState(false);
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
      const params = new URLSearchParams(window.location.search);
      const poolId = params.get("id") || undefined;

      const savedPool = poolId ? await getPool(poolId) : null;
      const localPool = savedPool ? null : loadLocalPool(poolId);

      if (!savedPool && !localPool) {
        setIsLoading(false);
        return;
      }

      const formattedPool: ManagePool = savedPool
        ? {
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
          }
        : {
            id: localPool!.id,
            pool_name: localPool!.poolName,
            golf_event: localPool!.golfEvent,
            event_id: localPool!.eventId,
            number_of_teams: localPool!.numberOfTeams,
            golfers_per_team: localPool!.golfersPerTeam,
            scores_to_count: localPool!.scoresToCount,
            team_names: localPool!.teamNames || [],
            draft_order: localPool!.draftOrder || localPool!.teamNames || [],
            draft_locked: false,
            archived: false,
          };

      setIsLocalPool(!savedPool);

      const [remotePicks, golfers] = await Promise.all([
        savedPool ? getDraftPicks(formattedPool.id) : Promise.resolve([]),
        loadGolfers(formattedPool.event_id || FALLBACK_EVENT_ID),
      ]);

      const localPicks = savedPool
        ? []
        : (loadLocalDraftPicks(formattedPool.id) || [])
            .filter((pick): pick is NonNullable<typeof pick> => pick !== null)
            .map((pick) => ({
              pool_id: formattedPool.id,
              team: pick.team,
              golfer_name: pick.golfer.name,
              golfer_rank: pick.golfer.rank,
              pick_index: pick.pickIndex,
            }));

      const savedPicks = savedPool ? remotePicks : localPicks;

      const formattedGolfers = golfers
        .map((golfer: Record<string, unknown>) => {
          const rank = getSortValue(golfer);

          return {
            name: String(golfer.name || ""),
            rank,
            hasOdds: rank !== 999999,
          };
        })
        .filter((golfer: GolferOption) => golfer.name && golfer.hasOdds)
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
    if (!pool) return;

    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    const finalTeamNames = getFinalTeamNames();
    const finalDraftOrder = draftOrder.map(
      (team, index) => team.trim() || finalTeamNames[index] || `Team ${index + 1}`
    );

    try {
      if (isLocalPool) {
        const updatedPool = {
          id: pool.id,
          poolName: poolName.trim() || "Untitled Golf Pool",
          golfEvent: pool.golf_event,
          eventId: pool.event_id || undefined,
          numberOfTeams: pool.number_of_teams,
          golfersPerTeam: pool.golfers_per_team,
          scoresToCount: scoresToCount || 1,
          teamNames: finalTeamNames,
          draftOrder: finalDraftOrder,
        };

        const updatedPicks = draftPicks.map((pick) => {
          const teamIndex = getTeamIndexForPick(
            pick.pick_index,
            finalDraftOrder.length
          );

          return {
            ...pick,
            team: finalDraftOrder[teamIndex] || pick.team,
          };
        });

        const localPickArray = Array.from({
          length: pool.number_of_teams * pool.golfers_per_team,
        }).map((_, index) => {
          const pick = updatedPicks.find(
            (draftPick) => draftPick.pick_index === index
          );

          return pick
            ? {
                team: pick.team,
                golfer: {
                  name: pick.golfer_name,
                  rank: pick.golfer_rank,
                },
                pickIndex: pick.pick_index,
              }
            : null;
        });

        updateLocalPool(updatedPool);
        saveLocalDraftPicks(pool.id, localPickArray);

        setPool({
          ...pool,
          pool_name: updatedPool.poolName,
          scores_to_count: updatedPool.scoresToCount,
          team_names: finalTeamNames,
          draft_order: finalDraftOrder,
        });
        setTeamNames(finalTeamNames);
        setDraftOrder(finalDraftOrder);
        setDraftPicks(updatedPicks);
        setStatusMessage("Pool settings saved.");
        return;
      }

      const response = await fetch("/api/commissioner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "settings",
          poolId: pool.id,
          updates: {
            pool_name: poolName.trim() || "Untitled Golf Pool",
            team_names: finalTeamNames,
            draft_order: finalDraftOrder,
            scores_to_count: scoresToCount,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not save pool settings.");
      }

      setPool({
        ...pool,
        ...result.pool,
      });
      setTeamNames(finalTeamNames);
      setDraftOrder(finalDraftOrder);
      if (Array.isArray(result.picks)) {
        setDraftPicks(result.picks as DraftPickRow[]);
      }
      setStatusMessage("Pool settings saved.");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save pool settings. Try again."
      );
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
      if (isLocalPool) {
        const updatedPick = {
          ...pick,
          golfer_name: edit.golferName.trim(),
          golfer_rank: Number(edit.golferRank) || 999999,
        };

        const updatedPicks = draftPicks.map((currentPick) =>
          currentPick.pick_index === pick.pick_index
            ? updatedPick
            : currentPick
        );

        const localPickArray = Array.from({
          length: (pool?.number_of_teams || 0) * (pool?.golfers_per_team || 0),
        }).map((_, index) => {
          const draftPick = updatedPicks.find(
            (currentPick) => currentPick.pick_index === index
          );

          return draftPick
            ? {
                team: draftPick.team,
                golfer: {
                  name: draftPick.golfer_name,
                  rank: draftPick.golfer_rank,
                },
                pickIndex: draftPick.pick_index,
              }
            : null;
        });

        saveLocalDraftPicks(pool.id, localPickArray);
        setDraftPicks(updatedPicks);
        setStatusMessage("Draft pick updated.");
        return;
      }

      const response = await fetch("/api/commissioner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "pick",
          poolId: pool.id,
          pickIndex: pick.pick_index,
          golferName: edit.golferName.trim(),
          golferRank: Number(edit.golferRank) || 999999,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not update that draft pick.");
      }

      setDraftPicks((current) =>
        current.map((currentPick) =>
          currentPick.pick_index === pick.pick_index
            ? (result.pick as DraftPickRow)
            : currentPick
        )
      );
      setStatusMessage("Draft pick updated.");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not update that draft pick."
      );
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
            This pool either does not exist or is not available for editing.
          </p>
          <Link
            href="/organizer"
            className="mt-6 inline-flex rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20"
          >
            Organizer Dashboard
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

          <Link
            href={`/pool?id=${pool.id}&view=lobby`}
            className="inline-flex rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20"
          >
            Pool Lobby
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
            {pool.golf_event} • {pool.number_of_teams} Teams •{" "}
            {pool.golfers_per_team} Golfers Per Team
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
                  value={scoresToCount || ""}
                  onChange={(event) =>
                    setScoresToCount(
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value)
                    )
                  }
                  onFocus={(event) => event.target.select()}
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

        <section className="mt-8 rounded-3xl border border-white/5 bg-[#111827] p-5 shadow-xl shadow-black/40">
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
              className="inline-flex rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20"
            >
              View Leaderboard
            </Link>
          </div>

          {sortedDraftPicks.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/5 bg-[#1F2937] p-4 text-slate-400">
              No golfers have been drafted yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-2">
              {sortedDraftPicks.map((pick) => {
                const edit = pickEdits[pick.pick_index] || {
                  golferName: pick.golfer_name,
                  golferRank: pick.golfer_rank ?? 999999,
                };

                return (
                  <div
                    key={`${pick.pool_id}-${pick.pick_index}`}
                    className="grid gap-3 rounded-xl border border-white/5 bg-[#1F2937] p-3 sm:grid-cols-[1fr_2fr_110px] sm:items-end lg:grid-cols-[70px_1fr_2fr_110px]"
                  >
                    <div className="flex items-center justify-between gap-3 sm:contents">
                      <div>
                        <p className="text-[11px] font-bold uppercase text-slate-500">
                          Pick
                        </p>
                        <p className="text-sm font-black text-white sm:text-base">
                          {pick.pick_index + 1}
                        </p>
                      </div>

                      <div className="text-right sm:text-left">
                        <p className="text-[11px] font-bold uppercase text-slate-500">
                          Team
                        </p>
                        <p className="text-sm font-black text-white sm:text-base">
                          {pick.team}
                        </p>
                      </div>
                    </div>

                    <div>
                      <select
                        aria-label={`Golfer for pick ${pick.pick_index + 1}`}
                        value={edit.golferName}
                        onChange={(event) =>
                          selectGolferForPick(
                            pick.pick_index,
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-white/5 bg-[#030712] px-3 py-2.5 text-sm text-white outline-none sm:text-base"
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
                      className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
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
