"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import {
  FootballPool,
  FootballScoring,
  defaultScoring,
  loadFootballPool,
  saveFootballPool,
} from "../lib/storage";

type RosterKey = keyof FootballScoring["roster"];
type ScoringCategory = "passing" | "rushing" | "receiving" | "defense" | "kicking" | "misc";

type ScoringRule = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  presets?: { label: string; value: number }[];
  helper?: string;
  enabled?: boolean;
};

const rosterRows: {
  key: RosterKey;
  label: string;
  max: number;
}[] = [
  { key: "QB", label: "Quarterback (QB)", max: 3 },
  { key: "RB", label: "Running Back (RB)", max: 5 },
  { key: "WR", label: "Wide Receiver (WR)", max: 5 },
  { key: "TE", label: "Tight End (TE)", max: 3 },
  { key: "FLEX", label: "Flex (RB/WR/TE)", max: 3 },
  { key: "DST", label: "Defense / Special Teams", max: 2 },
  { key: "K", label: "Kicker", max: 1 },
];

const tabs: { key: ScoringCategory; label: string }[] = [
  { key: "passing", label: "Passing" },
  { key: "rushing", label: "Rushing" },
  { key: "receiving", label: "Receiving" },
  { key: "defense", label: "Team Defense" },
  { key: "kicking", label: "Kicking" },
  { key: "misc", label: "More" },
];

export default function FootballScoringPage() {
  const [pool, setPool] = useState<FootballPool | null>(null);
  const [scoring, setScoring] = useState<FootballScoring>(defaultScoring);
  const [activeTab, setActiveTab] = useState<ScoringCategory>("passing");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const savedPool = loadFootballPool(id);
    if (savedPool) {
      setPool(savedPool);
      setScoring({ ...defaultScoring, ...savedPool.scoring });
    }
  }, []);

  const rosterTotal = useMemo(
    () => Object.values(scoring.roster).reduce((sum, value) => sum + value, 0),
    [scoring.roster]
  );

  function updateRoster(position: RosterKey, value: number) {
    setScoring((current) => ({
      ...current,
      includeKickers: position === "K" ? value > 0 : current.includeKickers,
      roster: {
        ...current.roster,
        [position]: Math.max(0, value),
      },
    }));
  }

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

  function getRules(): ScoringRule[] {
    if (activeTab === "passing") {
      return [
        {
          label: "Passing Yards",
          value: scoring.passing.passingYardsPerPoint,
          helper: `1 point every ${scoring.passing.passingYardsPerPoint} yards`,
          onChange: (value) => updateSection("passing", "passingYardsPerPoint", value),
          presets: [
            { label: "25 yards", value: 25 },
            { label: "20 yards", value: 20 },
          ],
        },
        {
          label: "Passing Touchdowns",
          value: scoring.passing.passingTd,
          onChange: (value) => updateSection("passing", "passingTd", value),
          presets: [
            { label: "4 points", value: 4 },
            { label: "6 points", value: 6 },
          ],
        },
        {
          label: "Interceptions",
          value: scoring.passing.interception,
          onChange: (value) => updateSection("passing", "interception", value),
          presets: [
            { label: "-1 point", value: -1 },
            { label: "-2 points", value: -2 },
          ],
        },
        {
          label: "Completions",
          value: scoring.passing.completion,
          onChange: (value) => updateSection("passing", "completion", value),
          presets: [
            { label: "0 points", value: 0 },
            { label: "0.2 points", value: 0.2 },
          ],
        },
        {
          label: "2-Point Passing Conversion",
          value: scoring.passing.twoPointConversion,
          onChange: (value) => updateSection("passing", "twoPointConversion", value),
          presets: [{ label: "2 points", value: 2 }],
        },
        {
          label: "Fumbles Lost",
          value: scoring.passing.fumbleLost,
          onChange: (value) => updateSection("passing", "fumbleLost", value),
          presets: [
            { label: "-1 point", value: -1 },
            { label: "-2 points", value: -2 },
          ],
        },
      ];
    }

    if (activeTab === "rushing") {
      return [
        {
          label: "Rushing Yards",
          value: scoring.rushing.rushingYardsPerPoint,
          helper: `1 point every ${scoring.rushing.rushingYardsPerPoint} yards`,
          onChange: (value) => updateSection("rushing", "rushingYardsPerPoint", value),
          presets: [
            { label: "10 yards", value: 10 },
            { label: "5 yards", value: 5 },
          ],
        },
        {
          label: "Rushing Touchdowns",
          value: scoring.rushing.rushingTd,
          onChange: (value) => updateSection("rushing", "rushingTd", value),
          presets: [{ label: "6 points", value: 6 }],
        },
        {
          label: "Rushing Attempts",
          value: scoring.rushing.attempt,
          onChange: (value) => updateSection("rushing", "attempt", value),
          presets: [
            { label: "0 points", value: 0 },
            { label: "0.2 points", value: 0.2 },
          ],
        },
        {
          label: "2-Point Rushing Conversion",
          value: scoring.rushing.twoPointConversion,
          onChange: (value) => updateSection("rushing", "twoPointConversion", value),
          presets: [{ label: "2 points", value: 2 }],
        },
      ];
    }

    if (activeTab === "receiving") {
      return [
        {
          label: "Receptions",
          value: scoring.receiving.reception,
          onChange: (value) => updateSection("receiving", "reception", value),
          presets: [
            { label: "0.5 points", value: 0.5 },
            { label: "1 point", value: 1 },
          ],
        },
        {
          label: "Receiving Yards",
          value: scoring.receiving.receivingYardsPerPoint,
          helper: `1 point every ${scoring.receiving.receivingYardsPerPoint} yards`,
          onChange: (value) => updateSection("receiving", "receivingYardsPerPoint", value),
          presets: [
            { label: "10 yards", value: 10 },
            { label: "5 yards", value: 5 },
          ],
        },
        {
          label: "Receiving Touchdowns",
          value: scoring.receiving.receivingTd,
          onChange: (value) => updateSection("receiving", "receivingTd", value),
          presets: [{ label: "6 points", value: 6 }],
        },
        {
          label: "2-Point Receiving Conversion",
          value: scoring.receiving.twoPointConversion,
          onChange: (value) => updateSection("receiving", "twoPointConversion", value),
          presets: [{ label: "2 points", value: 2 }],
        },
      ];
    }

    if (activeTab === "defense") {
      return [
        {
          label: "Sacks",
          value: scoring.defense.sack,
          onChange: (value) => updateSection("defense", "sack", value),
          presets: [{ label: "1 point", value: 1 }],
        },
        {
          label: "Interceptions",
          value: scoring.defense.interception,
          onChange: (value) => updateSection("defense", "interception", value),
          presets: [{ label: "2 points", value: 2 }],
        },
        {
          label: "Fumble Recovery",
          value: scoring.defense.fumbleRecovery,
          onChange: (value) => updateSection("defense", "fumbleRecovery", value),
          presets: [{ label: "2 points", value: 2 }],
        },
        {
          label: "Touchdown",
          value: scoring.defense.touchdown,
          onChange: (value) => updateSection("defense", "touchdown", value),
          presets: [{ label: "6 points", value: 6 }],
        },
        {
          label: "Safety",
          value: scoring.defense.safety,
          onChange: (value) => updateSection("defense", "safety", value),
          presets: [{ label: "2 points", value: 2 }],
        },
        {
          label: "Blocked Kick",
          value: scoring.defense.blockedKick,
          onChange: (value) => updateSection("defense", "blockedKick", value),
          presets: [{ label: "2 points", value: 2 }],
        },
        {
          label: "Kickoff / Punt Return TD",
          value: scoring.defense.returnTouchdown,
          onChange: (value) => updateSection("defense", "returnTouchdown", value),
          presets: [{ label: "6 points", value: 6 }],
        },
      ];
    }

    if (activeTab === "kicking") {
      return [
        {
          label: "Made Extra Point",
          value: scoring.kicking.extraPoint,
          onChange: (value) => updateSection("kicking", "extraPoint", value),
          presets: [{ label: "1 point", value: 1 }],
          enabled: scoring.includeKickers,
        },
        {
          label: "Field Goal",
          value: scoring.kicking.fieldGoal,
          onChange: (value) => updateSection("kicking", "fieldGoal", value),
          presets: [{ label: "3 points", value: 3 }],
          enabled: scoring.includeKickers,
        },
        {
          label: "50+ Yard FG Bonus",
          value: scoring.kicking.fieldGoal50Bonus,
          onChange: (value) => updateSection("kicking", "fieldGoal50Bonus", value),
          presets: [{ label: "2 points", value: 2 }],
          enabled: scoring.includeKickers,
        },
      ];
    }

    return [
      {
        label: "2-Point Conversions",
        value: scoring.passing.twoPointConversion,
        onChange: (value) => {
          updateSection("passing", "twoPointConversion", value);
          updateSection("rushing", "twoPointConversion", value);
          updateSection("receiving", "twoPointConversion", value);
        },
        presets: [{ label: "2 points", value: 2 }],
      },
      {
        label: "Fumbles Lost",
        value: scoring.passing.fumbleLost,
        onChange: (value) => updateSection("passing", "fumbleLost", value),
        presets: [
          { label: "-1 point", value: -1 },
          { label: "-2 points", value: -2 },
        ],
      },
    ];
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
          Roster + Scoring Setup
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          {pool.poolName} • {pool.season}
        </p>

        <div className="mt-10 grid gap-6">
          <section className="rounded-3xl border border-white/5 bg-[#111827] p-8 shadow-xl shadow-black/40">
            <div className="grid gap-4 md:grid-cols-3">
              <SwitchCard
                label="Fractional Points"
                checked={scoring.fractionalPoints}
                onChange={(checked) =>
                  setScoring((current) => ({ ...current, fractionalPoints: checked }))
                }
              />
              <SwitchCard
                label="Negative Points"
                checked={scoring.negativePoints}
                onChange={(checked) =>
                  setScoring((current) => ({ ...current, negativePoints: checked }))
                }
              />
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Available Players
                </label>
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

          <section className="rounded-3xl border border-slate-700/60 bg-[#1F2937] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Roster Positions</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Active roster spots that will be drafted and scored for each team.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300">
                {rosterTotal} Active Spots
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-[#030712]">
              {rosterRows.map((row) => (
                <RosterStepper
                  key={row.key}
                  label={row.label}
                  value={scoring.roster[row.key]}
                  min={0}
                  max={row.max}
                  onChange={(value) => updateRoster(row.key, value)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-700/60 bg-[#1F2937] p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Scoring Settings</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Start from familiar defaults, then adjust only the values your group cares about.
                </p>
              </div>
              <SwitchCard
                label="Kickers"
                checked={scoring.includeKickers}
                onChange={(checked) =>
                  setScoring((current) => ({
                    ...current,
                    includeKickers: checked,
                    roster: { ...current.roster, K: checked ? Math.max(1, current.roster.K) : 0 },
                  }))
                }
                compact
              />
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl bg-[#111827] p-1">
              <div className="flex min-w-max gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl px-5 py-3 text-sm font-black transition ${
                      activeTab === tab.key
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-[#030712]">
              {getRules().map((rule) => (
                <ScoringRuleRow key={rule.label} rule={rule} />
              ))}
            </div>
          </section>

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

function SwitchCard({
  label,
  checked,
  onChange,
  compact = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#1F2937] ${
        compact ? "min-w-[180px] p-3" : "p-4"
      }`}
    >
      <span className="font-bold">{label}</span>
      <span
        className={`relative h-8 w-14 rounded-full transition ${
          checked ? "bg-emerald-400" : "bg-slate-600"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </span>
    </label>
  );
}

function RosterStepper({
  label,
  value,
  min,
  max,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-white/5 p-4 last:border-b-0 ${
        disabled ? "opacity-45" : ""
      }`}
    >
      <div>
        <p className="font-bold">{label}</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= min}
          className="flex h-10 w-14 items-center justify-center rounded-xl border border-white/15 text-xl font-black text-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
        >
          -
        </button>
        <span className="w-8 text-center text-xl font-black">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={disabled || value >= max}
          className="flex h-10 w-14 items-center justify-center rounded-xl border border-white/15 text-xl font-black text-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ScoringRuleRow({ rule }: { rule: ScoringRule }) {
  const enabled = rule.enabled ?? true;

  return (
    <div className={`border-b border-white/5 p-5 last:border-b-0 ${enabled ? "" : "opacity-45"}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-black">{rule.label}</h3>
          {rule.helper && (
            <p className="mt-1 text-sm font-semibold text-slate-400">{rule.helper}</p>
          )}
          {rule.presets && (
            <div className="mt-4 flex flex-wrap gap-3">
              {rule.presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={!enabled}
                  onClick={() => rule.onChange(preset.value)}
                  className={`rounded-xl border px-4 py-2 text-sm font-black ${
                    rule.value === preset.value
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : "border-white/15 text-emerald-300 hover:bg-white/5"
                  } disabled:cursor-not-allowed`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.1"
            value={rule.value}
            disabled={!enabled}
            onChange={(event) => rule.onChange(Number(event.target.value))}
            onFocus={(event) => event.target.select()}
            className="w-24 rounded-xl border border-white/10 bg-[#1F2937] px-4 py-3 text-right text-lg font-black text-white outline-none disabled:cursor-not-allowed"
          />
          <span className="text-sm font-bold text-slate-400">points</span>
        </div>
      </div>
    </div>
  );
}
