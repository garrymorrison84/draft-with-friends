"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballPool,
  FootballScoring,
  defaultScoring,
  loadFootballPool,
  saveFootballPool,
} from "../lib/storage";

const rosterOptions = {
  QB: [1, 2],
  RB: [1, 2, 3],
  WR: [1, 2, 3],
  TE: [1, 2],
  FLEX: [0, 1, 2],
  DST: [0, 1],
  K: [0, 1],
};

export default function FootballScoringPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [scoring, setScoring] = useState<FootballScoring>(defaultScoring);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadFootballPool(id);
    if (savedPool) {
      setPool(savedPool);
      setScoring(savedPool.scoring || defaultScoring);
    }
  }, []);

  function updateSection<T extends keyof FootballScoring>(
    section: T,
    key: keyof FootballScoring[T],
    value: number
  ) {
    setScoring((current) => ({
      ...current,
      [section]: {
        ...(current[section] as Record<string, number>),
        [key]: value,
      },
    }));
  }

  function saveAndContinue() {
    if (!pool) return;

    const nextPool = { ...pool, scoring };
    saveFootballPool(nextPool);
    window.location.href = `/football/draft?id=${pool.id}`;
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
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <Link href={`/football/create`} className="text-sm font-medium text-emerald-300">
            Back to Setup
          </Link>
        </div>

        <h1 className="mt-8 text-4xl font-black md:text-5xl">
          Football Scoring
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          {pool.poolName} • {pool.season}
        </p>

        <div className="mt-10 grid gap-6">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <div className="grid gap-4 md:grid-cols-3">
              <Toggle
                label="Fractional Points"
                checked={scoring.fractionalPoints}
                onChange={(checked) =>
                  setScoring((current) => ({ ...current, fractionalPoints: checked }))
                }
              />
              <Toggle
                label="Kickers"
                checked={scoring.includeKickers}
                onChange={(checked) =>
                  setScoring((current) => ({
                    ...current,
                    includeKickers: checked,
                    roster: { ...current.roster, K: checked ? 1 : 0 },
                  }))
                }
              />
              <div>
                <label className="mb-2 block text-sm font-semibold">Available Players</label>
                <select
                  value={scoring.playerPool}
                  onChange={(event) =>
                    setScoring((current) => ({
                      ...current,
                      playerPool: event.target.value as FootballScoring["playerPool"],
                    }))
                  }
                  className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white"
                >
                  <option>Power 5 + Notre Dame</option>
                  <option>All FBS</option>
                </select>
              </div>
            </div>
          </section>

          <ScoringPanel title="Roster Positions">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(rosterOptions).map(([position, options]) => (
                <div key={position}>
                  <label className="mb-2 block text-sm font-semibold">{position}</label>
                  <select
                    value={scoring.roster[position as keyof FootballScoring["roster"]]}
                    onChange={(event) =>
                      updateSection(
                        "roster",
                        position as keyof FootballScoring["roster"],
                        Number(event.target.value)
                      )
                    }
                    disabled={position === "K" && !scoring.includeKickers}
                    className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white disabled:opacity-40"
                  >
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </ScoringPanel>

          <ScoringPanel title="Passing">
            <NumberGrid
              values={[
                ["Passing TD", scoring.passing.passingTd, (value) => updateSection("passing", "passingTd", value)],
                ["Passing Yards Per Point", scoring.passing.passingYardsPerPoint, (value) => updateSection("passing", "passingYardsPerPoint", value)],
                ["Completion", scoring.passing.completion, (value) => updateSection("passing", "completion", value)],
                ["Interception", scoring.passing.interception, (value) => updateSection("passing", "interception", value)],
                ["2 Point Conversion", scoring.passing.twoPointConversion, (value) => updateSection("passing", "twoPointConversion", value)],
                ["Fumble Lost", scoring.passing.fumbleLost, (value) => updateSection("passing", "fumbleLost", value)],
              ]}
            />
          </ScoringPanel>

          <ScoringPanel title="Rushing">
            <NumberGrid
              values={[
                ["Rushing TD", scoring.rushing.rushingTd, (value) => updateSection("rushing", "rushingTd", value)],
                ["Rushing Yards Per Point", scoring.rushing.rushingYardsPerPoint, (value) => updateSection("rushing", "rushingYardsPerPoint", value)],
                ["Rushing Attempt", scoring.rushing.attempt, (value) => updateSection("rushing", "attempt", value)],
                ["2 Point Conversion", scoring.rushing.twoPointConversion, (value) => updateSection("rushing", "twoPointConversion", value)],
              ]}
            />
          </ScoringPanel>

          <ScoringPanel title="Receiving">
            <NumberGrid
              values={[
                ["Receiving TD", scoring.receiving.receivingTd, (value) => updateSection("receiving", "receivingTd", value)],
                ["Receiving Yards Per Point", scoring.receiving.receivingYardsPerPoint, (value) => updateSection("receiving", "receivingYardsPerPoint", value)],
                ["Reception", scoring.receiving.reception, (value) => updateSection("receiving", "reception", value)],
                ["2 Point Conversion", scoring.receiving.twoPointConversion, (value) => updateSection("receiving", "twoPointConversion", value)],
              ]}
            />
          </ScoringPanel>

          <ScoringPanel title="Defense + Special Teams">
            <NumberGrid
              values={[
                ["Sack", scoring.defense.sack, (value) => updateSection("defense", "sack", value)],
                ["Interception", scoring.defense.interception, (value) => updateSection("defense", "interception", value)],
                ["Fumble Recovery", scoring.defense.fumbleRecovery, (value) => updateSection("defense", "fumbleRecovery", value)],
                ["Touchdown", scoring.defense.touchdown, (value) => updateSection("defense", "touchdown", value)],
                ["Safety", scoring.defense.safety, (value) => updateSection("defense", "safety", value)],
                ["Blocked Kick", scoring.defense.blockedKick, (value) => updateSection("defense", "blockedKick", value)],
                ["Return TD", scoring.defense.returnTouchdown, (value) => updateSection("defense", "returnTouchdown", value)],
              ]}
            />
          </ScoringPanel>

          {scoring.includeKickers && (
            <ScoringPanel title="Kicking">
              <NumberGrid
                values={[
                  ["Made Extra Point", scoring.kicking.extraPoint, (value) => updateSection("kicking", "extraPoint", value)],
                  ["Field Goal", scoring.kicking.fieldGoal, (value) => updateSection("kicking", "fieldGoal", value)],
                  ["50+ Yard FG Bonus", scoring.kicking.fieldGoal50Bonus, (value) => updateSection("kicking", "fieldGoal50Bonus", value)],
                ]}
              />
            </ScoringPanel>
          )}

          <button
            type="button"
            onClick={saveAndContinue}
            className="rounded-xl bg-emerald-400 px-6 py-4 text-center font-bold text-slate-950 hover:bg-emerald-300"
          >
            Save Scoring & Enter Draft
          </button>
        </div>
      </div>
    </main>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#1F2937] p-4">
      <span className="font-bold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-emerald-400"
      />
    </label>
  );
}

function ScoringPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function NumberGrid({
  values,
}: {
  values: [string, number, (value: number) => void][];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {values.map(([label, value, onChange]) => (
        <div key={label}>
          <label className="mb-2 block text-sm font-semibold">{label}</label>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            onFocus={(event) => event.target.select()}
            className="w-full rounded-xl border border-white/5 bg-[#1F2937] px-4 py-3 text-white outline-none"
          />
        </div>
      ))}
    </div>
  );
}
