"use client";

import { useEffect } from "react";
import type { FootballScoring } from "../lib/storage";

type ScoringSummaryRule = {
  label: string;
  value: string;
};

type ScoringSummarySection = {
  title: string;
  rules: ScoringSummaryRule[];
};

function formatScoringNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatPointsPer(value: number, event: string) {
  const pointLabel = Math.abs(value) === 1 ? "pt" : "pts";
  return `${formatScoringNumber(value)} ${pointLabel} / ${event}`;
}

function buildScoringSummary(scoring: FootballScoring) {
  const pointRule = (
    label: string,
    value: number,
    event: string
  ): ScoringSummaryRule | null =>
    value === 0 ? null : { label, value: formatPointsPer(value, event) };
  const yardRule = (
    label: string,
    yardsPerPoint: number
  ): ScoringSummaryRule | null =>
    yardsPerPoint <= 0
      ? null
      : {
          label,
          value: `1 pt / ${formatScoringNumber(yardsPerPoint)} yds`,
        };
  const rules = (...items: Array<ScoringSummaryRule | null>) =>
    items.filter((item): item is ScoringSummaryRule => item !== null);

  const sections: ScoringSummarySection[] = [
    {
      title: "Passing",
      rules: rules(
        yardRule("Pass Yards", scoring.passing.passingYardsPerPoint),
        pointRule("Passing TD", scoring.passing.passingTd, "TD"),
        pointRule("Completion", scoring.passing.completion, "completion"),
        pointRule("Interception Thrown", scoring.passing.interception, "INT")
      ),
    },
    {
      title: "Rushing",
      rules: rules(
        yardRule("Rush Yards", scoring.rushing.rushingYardsPerPoint),
        pointRule("Rushing TD", scoring.rushing.rushingTd, "TD"),
        pointRule("Rush Attempt", scoring.rushing.attempt, "attempt")
      ),
    },
    {
      title: "Receiving",
      rules: rules(
        yardRule("Receiving Yards", scoring.receiving.receivingYardsPerPoint),
        pointRule("Receiving TD", scoring.receiving.receivingTd, "TD"),
        pointRule("Reception", scoring.receiving.reception, "reception")
      ),
    },
    ...(scoring.roster.DST > 0
      ? [
          {
            title: "Defense / Special Teams",
            rules: rules(
              pointRule("Sack", scoring.defense.sack, "sack"),
              pointRule("Interception", scoring.defense.interception, "INT"),
              pointRule("Fumble Recovery", scoring.defense.fumbleRecovery, "recovery"),
              pointRule("Touchdown", scoring.defense.touchdown, "TD"),
              pointRule("Safety", scoring.defense.safety, "safety"),
              pointRule("Blocked Kick", scoring.defense.blockedKick, "block"),
              pointRule("Kick/Punt Return TD", scoring.defense.returnTouchdown, "TD")
            ),
          },
        ]
      : []),
    ...(scoring.roster.K > 0
      ? [
          {
            title: "Kicking",
            rules: rules(
              pointRule("Made Extra Point", scoring.kicking.extraPoint, "XP"),
              pointRule("Missed Extra Point", scoring.kicking.missedExtraPoint, "miss"),
              pointRule("Field Goal", scoring.kicking.fieldGoal, "FG"),
              pointRule("Missed Field Goal", scoring.kicking.missedFieldGoal, "miss"),
              pointRule("50+ Yard FG Bonus", scoring.kicking.fieldGoal50Bonus, "FG")
            ),
          },
        ]
      : []),
    {
      title: "More",
      rules: rules(
        pointRule(
          "2-Point Conversion",
          scoring.passing.twoPointConversion,
          "conversion"
        ),
        pointRule("Fumble Lost", scoring.passing.fumbleLost, "fumble")
      ),
    },
  ];

  return sections.filter((section) => section.rules.length > 0);
}

export default function ScoringSettingsModal({
  poolName,
  scoring,
  onClose,
}: {
  poolName: string;
  scoring: FootballScoring;
  onClose: () => void;
}) {
  const sections = buildScoringSummary(scoring);
  const rosterLabels: Record<keyof FootballScoring["roster"], string> = {
    QB: "QB",
    RB: "RB",
    WR: "WR",
    TE: "TE",
    FLEX: "Flex",
    DST: "D/ST",
    K: "K",
  };
  const roster = (Object.entries(scoring.roster) as Array<
    [keyof FootballScoring["roster"], number]
  >).filter(([, count]) => count > 0);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scoring settings"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#030712]/80 px-2 pb-3 backdrop-blur-sm md:items-center md:p-6"
    >
      <div className="flex min-w-0 max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60">
        <div className="min-w-0 shrink-0 border-b border-white/10 bg-[#1F2937] p-4 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            {poolName}
          </p>
          <h2 className="mt-2 break-words text-2xl font-black text-white sm:text-4xl">
            Scoring Settings
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            The points and roster rules used by this pool.
          </p>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-7">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-[#030712] p-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Active Roster
              </p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                {roster.map(([position, count]) => (
                  <span
                    key={position}
                    className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm font-black text-emerald-200"
                  >
                    {count} {rosterLabels[position]}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#030712] p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Point Precision
                </p>
                <p className="mt-2 text-base font-black text-white">
                  Fractional Scoring
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-black ${
                  scoring.fractionalPoints
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {scoring.fractionalPoints ? "On" : "Off"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <section
                key={section.title}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#030712]"
              >
                <h3 className="border-b border-white/10 bg-[#1F2937] px-4 py-3 text-sm font-black uppercase tracking-wide text-white">
                  {section.title}
                </h3>
                <div className="divide-y divide-white/5">
                  {section.rules.map((rule) => (
                    <div
                      key={rule.label}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="font-bold text-slate-400">{rule.label}</span>
                      <span className="shrink-0 text-right font-black text-emerald-300">
                        {rule.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 p-4 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-white/15 px-5 py-3 font-black text-slate-200 transition hover:bg-white/5 sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
