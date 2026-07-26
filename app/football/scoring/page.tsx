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
  kind?: "points" | "yards";
  options?: number[];
  enabled?: boolean;
  integerOnly?: boolean;
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

function mergeScoring(savedScoring?: FootballScoring): FootballScoring {
  if (!savedScoring) return defaultScoring;

  const merged = {
    ...defaultScoring,
    ...savedScoring,
    roster: { ...defaultScoring.roster, ...savedScoring.roster },
    passing: { ...defaultScoring.passing, ...savedScoring.passing },
    rushing: { ...defaultScoring.rushing, ...savedScoring.rushing },
    receiving: { ...defaultScoring.receiving, ...savedScoring.receiving },
    defense: { ...defaultScoring.defense, ...savedScoring.defense },
    kicking: { ...defaultScoring.kicking, ...savedScoring.kicking },
  };

  return {
    ...merged,
    passing: {
      ...merged.passing,
      completion: merged.passing.completion === 0.2 ? 0 : merged.passing.completion,
    },
    rushing: {
      ...merged.rushing,
      attempt: merged.rushing.attempt === 0.2 ? 0 : merged.rushing.attempt,
    },
    kicking: {
      ...merged.kicking,
      missedExtraPoint:
        savedScoring.negativePoints === false && merged.kicking.missedExtraPoint === -1
          ? 0
          : merged.kicking.missedExtraPoint,
      missedFieldGoal:
        savedScoring.negativePoints === false && merged.kicking.missedFieldGoal === -1
          ? 0
          : merged.kicking.missedFieldGoal,
      fieldGoal50Bonus:
        savedScoring.negativePoints === false && merged.kicking.fieldGoal50Bonus === 2
          ? 0
          : merged.kicking.fieldGoal50Bonus,
    },
  };
}

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
      setScoring(mergeScoring(savedPool.scoring));
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
    const passingEnabled = scoring.roster.QB > 0;
    const rushingEnabled = scoring.roster.RB > 0 || scoring.roster.FLEX > 0;
    const receivingEnabled =
      scoring.roster.WR > 0 || scoring.roster.TE > 0 || scoring.roster.FLEX > 0;
    const defenseEnabled = scoring.roster.DST > 0;
    const kickingEnabled = scoring.roster.K > 0;

    if (activeTab === "passing") {
      return [
        {
          label: "Pass Yds",
          value: scoring.passing.passingYardsPerPoint,
          kind: "yards",
          onChange: (value) => updateSection("passing", "passingYardsPerPoint", value),
          options: [25],
          enabled: passingEnabled,
          integerOnly: true,
        },
        {
          label: "Passing TD",
          value: scoring.passing.passingTd,
          onChange: (value) => updateSection("passing", "passingTd", value),
          options: [4],
          enabled: passingEnabled,
          integerOnly: true,
        },
        {
          label: "Int Thrown",
          value: scoring.passing.interception,
          onChange: (value) => updateSection("passing", "interception", value),
          options: [-2],
          enabled: passingEnabled,
          integerOnly: true,
        },
        {
          label: "Pass Completion",
          value: scoring.passing.completion,
          onChange: (value) => updateSection("passing", "completion", value),
          options: [0.2],
          enabled: passingEnabled,
        },
      ];
    }

    if (activeTab === "rushing") {
      return [
        {
          label: "Rush Yds",
          value: scoring.rushing.rushingYardsPerPoint,
          kind: "yards",
          onChange: (value) => updateSection("rushing", "rushingYardsPerPoint", value),
          options: [10],
          enabled: rushingEnabled,
          integerOnly: true,
        },
        {
          label: "Rushing TD",
          value: scoring.rushing.rushingTd,
          onChange: (value) => updateSection("rushing", "rushingTd", value),
          options: [6],
          enabled: rushingEnabled,
          integerOnly: true,
        },
        {
          label: "Rush Attempt",
          value: scoring.rushing.attempt,
          onChange: (value) => updateSection("rushing", "attempt", value),
          options: [0.2],
          enabled: rushingEnabled,
        },
      ];
    }

    if (activeTab === "receiving") {
      return [
        {
          label: "Reception",
          value: scoring.receiving.reception,
          onChange: (value) => updateSection("receiving", "reception", value),
          options: [0.5, 1],
          enabled: receivingEnabled,
        },
        {
          label: "Rec Yds",
          value: scoring.receiving.receivingYardsPerPoint,
          kind: "yards",
          onChange: (value) => updateSection("receiving", "receivingYardsPerPoint", value),
          options: [10],
          enabled: receivingEnabled,
          integerOnly: true,
        },
        {
          label: "Receiving TD",
          value: scoring.receiving.receivingTd,
          onChange: (value) => updateSection("receiving", "receivingTd", value),
          options: [6],
          enabled: receivingEnabled,
          integerOnly: true,
        },
      ];
    }

    if (activeTab === "defense") {
      return [
        {
          label: "Sack",
          value: scoring.defense.sack,
          onChange: (value) => updateSection("defense", "sack", value),
          options: [1],
          enabled: defenseEnabled,
          integerOnly: true,
        },
        {
          label: "Interception",
          value: scoring.defense.interception,
          onChange: (value) => updateSection("defense", "interception", value),
          options: [2],
          enabled: defenseEnabled,
          integerOnly: true,
        },
        {
          label: "Fumble Recovery",
          value: scoring.defense.fumbleRecovery,
          onChange: (value) => updateSection("defense", "fumbleRecovery", value),
          options: [2],
          enabled: defenseEnabled,
          integerOnly: true,
        },
        {
          label: "Touchdown",
          value: scoring.defense.touchdown,
          onChange: (value) => updateSection("defense", "touchdown", value),
          options: [6],
          enabled: defenseEnabled,
          integerOnly: true,
        },
        {
          label: "Safety",
          value: scoring.defense.safety,
          onChange: (value) => updateSection("defense", "safety", value),
          options: [2],
          enabled: defenseEnabled,
          integerOnly: true,
        },
        {
          label: "Blocked Kick",
          value: scoring.defense.blockedKick,
          onChange: (value) => updateSection("defense", "blockedKick", value),
          options: [2],
          enabled: defenseEnabled,
          integerOnly: true,
        },
        {
          label: "Kickoff/Punt Return TD",
          value: scoring.defense.returnTouchdown,
          onChange: (value) => updateSection("defense", "returnTouchdown", value),
          options: [6],
          enabled: defenseEnabled,
          integerOnly: true,
        },
      ];
    }

    if (activeTab === "kicking") {
      return [
        {
          label: "Made Extra Point",
          value: scoring.kicking.extraPoint,
          onChange: (value) => updateSection("kicking", "extraPoint", value),
          options: [1],
          enabled: kickingEnabled,
          integerOnly: true,
        },
        {
          label: "Missed Extra Point",
          value: scoring.kicking.missedExtraPoint,
          onChange: (value) => updateSection("kicking", "missedExtraPoint", value),
          options: [-1],
          enabled: kickingEnabled,
          integerOnly: true,
        },
        {
          label: "Field Goal",
          value: scoring.kicking.fieldGoal,
          onChange: (value) => updateSection("kicking", "fieldGoal", value),
          options: [3],
          enabled: kickingEnabled,
          integerOnly: true,
        },
        {
          label: "Missed Field Goal",
          value: scoring.kicking.missedFieldGoal,
          onChange: (value) => updateSection("kicking", "missedFieldGoal", value),
          options: [-1, -3],
          enabled: kickingEnabled,
          integerOnly: true,
        },
        {
          label: "50+ Yard FG Bonus",
          value: scoring.kicking.fieldGoal50Bonus,
          onChange: (value) => updateSection("kicking", "fieldGoal50Bonus", value),
          options: [2],
          enabled: kickingEnabled,
          integerOnly: true,
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
        options: [2],
        enabled: passingEnabled || rushingEnabled || receivingEnabled,
        integerOnly: true,
      },
      {
        label: "Fumbles Lost",
        value: scoring.passing.fumbleLost,
        onChange: (value) => updateSection("passing", "fumbleLost", value),
        options: [-2],
        enabled: passingEnabled || rushingEnabled || receivingEnabled,
        integerOnly: true,
      },
    ];
  }

  function saveAndContinue() {
    if (!pool) return;

    const nextPool = { ...pool, scoring };
    saveFootballPool(nextPool);
    window.location.href = `/football/pool?id=${pool.id}`;
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
    <main className="min-h-screen w-full overflow-x-hidden bg-[#030712] pb-24 text-white sm:pb-0">
      <div className="mx-auto w-full max-w-5xl px-2.5 py-5 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Draft With Friends home">
            <BrandMark size="lg" />
          </Link>
          <Link href={`/football/create`} className="text-sm font-medium text-emerald-300">
            Back to Setup
          </Link>
        </div>

        <h1 className="mt-5 text-2xl font-black leading-tight sm:mt-7 sm:text-4xl md:text-5xl">
          Roster + Scoring Setup
        </h1>
        <p className="mt-2 break-words text-sm font-semibold text-slate-400 sm:mt-3 sm:text-lg">
          {pool.poolName} • {pool.season}
        </p>

        <div className="mt-5 grid min-w-0 gap-4 sm:mt-10 sm:gap-6">
          <section className="min-w-0 rounded-2xl border border-slate-700/60 bg-[#1F2937] p-3 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-bold sm:text-2xl">Roster Positions</h2>
                <p className="mt-1 max-w-full text-xs text-slate-400 sm:mt-2 sm:text-sm">
                  Active roster spots that will be drafted and scored for each team.
                </p>
              </div>
              <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-300 sm:px-4 sm:py-3 md:w-auto">
                {rosterTotal} Active Spots
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-[#030712] sm:mt-6">
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

          <section className="min-w-0 rounded-2xl border border-slate-700/60 bg-[#1F2937] p-3 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-bold sm:text-2xl">Scoring Settings</h2>
                <p className="mt-1 max-w-full text-xs text-slate-400 sm:mt-2 sm:text-sm">
                  Start from familiar defaults, then adjust only the values your group cares about.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#111827] p-1 sm:mt-6">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`min-w-0 rounded-xl px-2 py-2.5 text-xs font-black transition sm:px-5 sm:py-3 sm:text-sm ${
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

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-[#030712] sm:mt-6">
              {activeTab === "misc" && (
                <div className="grid gap-3 border-b border-white/5 p-4 sm:gap-4 sm:p-5">
                  <SwitchCard
                    label="Fractional Points"
                    checked={scoring.fractionalPoints}
                    onChange={(checked) =>
                      setScoring((current) => ({ ...current, fractionalPoints: checked }))
                    }
                  />
                </div>
              )}
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
            Save Changes
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
      className={`flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#1F2937] ${
        compact ? "min-w-[180px] p-3" : "p-3 sm:p-4"
      }`}
    >
      <span className="min-w-0 text-sm font-bold sm:text-base">{label}</span>
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
      className={`grid grid-cols-[minmax(0,1fr)_124px] items-center gap-3 border-b border-white/5 px-3 py-3 last:border-b-0 sm:flex sm:flex-row sm:justify-between sm:gap-4 sm:p-4 ${
        disabled ? "opacity-45" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-bold leading-snug sm:text-lg">{label}</p>
      </div>
      <div className="grid w-full shrink-0 grid-cols-[40px_1fr_40px] items-center gap-2 sm:w-auto sm:grid-cols-[56px_40px_56px] sm:gap-4">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= min}
          className="flex h-9 w-full items-center justify-center rounded-xl border border-white/15 text-lg font-black text-emerald-300 disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:text-xl"
        >
          -
        </button>
        <span className="text-center text-lg font-black sm:text-xl">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={disabled || value >= max}
          className="flex h-9 w-full items-center justify-center rounded-xl border border-white/15 text-lg font-black text-emerald-300 disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:text-xl"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ScoringRuleRow({ rule }: { rule: ScoringRule }) {
  const [customMode, setCustomMode] = useState(false);
  const enabled = rule.enabled ?? true;
  const hasOption = rule.options?.includes(rule.value);
  const isActive = enabled && rule.value !== 0;
  const showCustom = customMode || !hasOption;
  const fallbackValue = rule.options?.find((option) => option !== 0) ?? 1;

  function toggleRule() {
    if (!enabled) return;
    rule.onChange(isActive ? 0 : fallbackValue);
    if (!isActive) {
      setCustomMode(false);
    }
  }

  return (
    <div className={`border-b border-white/5 p-3 last:border-b-0 sm:p-5 ${enabled ? "" : "opacity-45"}`}>
      <div className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] gap-3 sm:grid-cols-[auto_1fr] sm:gap-4 md:items-start">
        <button
          type="button"
          onClick={toggleRule}
          disabled={!enabled}
          className={`relative mt-0.5 h-7 w-12 rounded-full transition disabled:cursor-not-allowed sm:mt-1 sm:h-8 sm:w-14 ${
            isActive ? "bg-emerald-400" : "bg-slate-700"
          }`}
          aria-label={`${isActive ? "Disable" : "Enable"} ${rule.label}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition sm:h-6 sm:w-6 ${
              isActive ? "left-6 sm:left-7" : "left-1"
            }`}
          />
        </button>

        <div className="min-w-0 grid gap-3 sm:gap-4 lg:grid-cols-[220px_1fr] lg:items-start">
          <div className="min-w-0">
            <h3 className="text-base font-black sm:text-lg">{rule.label}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
              {isActive
                ? rule.kind === "yards"
                  ? `1 point per ${rule.value} yards`
                  : `${rule.value} ${rule.value === 1 ? "point" : "points"} per ${rule.label}`
                : "Off"}
            </p>
          </div>

          <div className="min-w-0 flex w-full flex-wrap items-center gap-1.5 sm:gap-3 lg:justify-end">
            {rule.kind === "yards" ? (
              <>
                <span className="text-xs font-bold text-slate-400 sm:text-sm">1 point per</span>
                <OptionButtons
                  value={rule.value}
                  options={rule.options}
                  enabled={enabled && isActive}
                  customMode={showCustom}
                  onCustom={() => setCustomMode(true)}
                  onChange={(value) => {
                    setCustomMode(false);
                    rule.onChange(value);
                  }}
                />
                {showCustom && (
                  <CustomValueInput
                    value={rule.value}
                    enabled={enabled && isActive}
                    integerOnly={rule.integerOnly}
                    onChange={rule.onChange}
                  />
                )}
                <span className="text-xs font-bold text-slate-400 sm:text-sm">yards</span>
              </>
            ) : (
              <>
                <OptionButtons
                  value={rule.value}
                  options={rule.options}
                  enabled={enabled && isActive}
                  customMode={showCustom}
                  onCustom={() => setCustomMode(true)}
                  onChange={(value) => {
                    setCustomMode(false);
                    rule.onChange(value);
                  }}
                />
                {showCustom && (
                  <CustomValueInput
                    value={rule.value}
                    enabled={enabled && isActive}
                    integerOnly={rule.integerOnly}
                    onChange={rule.onChange}
                  />
                )}
                <span className="min-w-0 break-words text-xs font-bold text-slate-400 sm:text-sm">
                  points per {rule.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionButtons({
  value,
  options,
  enabled,
  onChange,
  customMode,
  onCustom,
}: {
  value: number;
  options?: number[];
  enabled: boolean;
  onChange: (value: number) => void;
  customMode: boolean;
  onCustom: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
      {options?.map((option) => (
        <button
          key={option}
          type="button"
          disabled={!enabled}
          onClick={() => onChange(option)}
          className={`min-w-10 rounded-xl border px-2.5 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-14 sm:px-4 sm:text-base ${
            !customMode && value === option
              ? "border-emerald-400 bg-emerald-400 text-slate-950"
              : "border-white/15 bg-[#111827] text-slate-200 hover:border-emerald-400/40"
          }`}
        >
          {option}
        </button>
      ))}
      <button
        type="button"
        disabled={!enabled}
        onClick={onCustom}
        className={`rounded-xl border px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-base ${
          customMode
            ? "border-emerald-400 bg-emerald-400 text-slate-950"
            : "border-white/15 bg-[#111827] text-emerald-300 hover:border-emerald-400/40"
        }`}
      >
        Custom
      </button>
    </div>
  );
}

function CustomValueInput({
  value,
  enabled,
  integerOnly = false,
  onChange,
}: {
  value: number;
  enabled: boolean;
  integerOnly?: boolean;
  onChange: (value: number) => void;
}) {
  function handleChange(rawValue: string) {
    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue)) return;
    onChange(integerOnly ? Math.round(nextValue) : nextValue);
  }

  return (
    <input
      type="number"
      step={integerOnly ? "1" : "0.1"}
      inputMode={integerOnly ? "numeric" : "decimal"}
      value={value}
      disabled={!enabled}
      onChange={(event) => handleChange(event.target.value)}
      onFocus={(event) => event.target.select()}
      className="w-20 rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-right text-base font-black text-white outline-none disabled:cursor-not-allowed sm:w-24"
    />
  );
}
