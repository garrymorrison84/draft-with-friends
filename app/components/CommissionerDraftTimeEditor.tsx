"use client";

import { useMemo, useState } from "react";
import {
  buildScheduledDraftAt,
  draftTimeZoneOptions,
  getAvailableDraftTimeValue,
  getDraftDateOptions,
  getDraftTimeOptions,
  normalizeDraftTiming,
  type DraftTimeZone,
  type DraftTiming,
} from "../lib/draftTiming";

function getScheduledFields(timing: DraftTiming) {
  const normalized = normalizeDraftTiming(timing);
  const scheduledDate = normalized.scheduledDraftAt
    ? new Date(normalized.scheduledDraftAt)
    : null;

  if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
    return { dateValue: "", timeValue: "" };
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: normalized.timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(scheduledDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    dateValue: `${parts.year}-${parts.month}-${parts.day}`,
    timeValue: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
  };
}

export default function CommissionerDraftTimeEditor({
  timing,
  onSave,
}: {
  timing: DraftTiming;
  onSave: (nextTiming: {
    scheduledDraftAt: string;
    timeZone: DraftTimeZone;
  }) => Promise<void>;
}) {
  const normalized = normalizeDraftTiming(timing);
  const initialFields = useMemo(() => getScheduledFields(timing), [timing]);
  const [isEditing, setIsEditing] = useState(false);
  const [dateValue, setDateValue] = useState(initialFields.dateValue);
  const [timeValue, setTimeValue] = useState(initialFields.timeValue);
  const [timeZone, setTimeZone] = useState<DraftTimeZone>(normalized.timeZone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const dateOptions = useMemo(() => getDraftDateOptions(), []);
  const timeOptions = useMemo(
    () => getDraftTimeOptions(dateValue, timeZone),
    [dateValue, timeZone]
  );

  async function save() {
    const scheduledDraftAt = buildScheduledDraftAt(dateValue, timeValue, timeZone);
    if (!scheduledDraftAt) {
      setStatus("error");
      setError("Choose an available future draft date and time.");
      return;
    }

    setStatus("saving");
    setError("");
    try {
      await onSave({ scheduledDraftAt, timeZone });
      setStatus("saved");
      setIsEditing(false);
    } catch (saveError) {
      setStatus("error");
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The draft time could not be updated."
      );
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          const currentFields = getScheduledFields(timing);
          setDateValue(currentFields.dateValue);
          setTimeValue(currentFields.timeValue);
          setTimeZone(normalizeDraftTiming(timing).timeZone);
          setStatus("idle");
          setError("");
          setIsEditing(true);
        }}
        className="rounded-xl border border-white/10 bg-[#1F2937] px-6 py-3 text-center font-black transition hover:border-emerald-300/60"
      >
        {status === "saved" ? "Draft Time Updated" : "Change Draft Time"}
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-emerald-400/20 bg-[#030712] p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold text-slate-300">
          Draft Date
          <select
            value={dateValue}
            onChange={(event) => {
              const nextDate = event.target.value;
              setDateValue(nextDate);
              setTimeValue((current) =>
                getAvailableDraftTimeValue(nextDate, current, timeZone)
              );
            }}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1F2937] px-4 py-3 text-white outline-none focus:border-emerald-300"
          >
            {dateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-slate-300">
          Draft Time
          <select
            value={timeValue}
            onChange={(event) => setTimeValue(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1F2937] px-4 py-3 text-white outline-none focus:border-emerald-300"
          >
            {timeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-slate-300">
          Time Zone
          <select
            value={timeZone}
            onChange={(event) => {
              const nextTimeZone = event.target.value as DraftTimeZone;
              setTimeZone(nextTimeZone);
              setTimeValue((current) =>
                getAvailableDraftTimeValue(dateValue, current, nextTimeZone)
              );
            }}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#1F2937] px-4 py-3 text-white outline-none focus:border-emerald-300"
          >
            {draftTimeZoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving" || !timeValue}
          className="rounded-xl bg-emerald-400 px-6 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save Draft Time"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          disabled={status === "saving"}
          className="rounded-xl border border-white/10 px-6 py-3 font-black text-slate-200 transition hover:border-white/30"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
