export type DraftTiming = {
  draftType?: "unscheduled" | "scheduled";
  scheduledDraftAt?: string | null;
  timeZone?: DraftTimeZone;
  pickClockSeconds?: number;
  autoPickOnTimeout?: boolean;
};

export type DraftTimeZone =
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Los_Angeles";

export const defaultDraftTimeZone: DraftTimeZone = "America/New_York";
export const scheduledDraftOpeningBufferSeconds = 60;

export const draftTimeZoneOptions = [
  { value: "America/New_York", label: "Eastern (EST/EDT)" },
  { value: "America/Chicago", label: "Central (CST/CDT)" },
  { value: "America/Denver", label: "Mountain (MST/MDT)" },
  { value: "America/Los_Angeles", label: "Pacific (PST/PDT)" },
] satisfies { value: DraftTimeZone; label: string }[];

export const untimedDraftTiming: DraftTiming = {
  draftType: "unscheduled",
  scheduledDraftAt: null,
  timeZone: defaultDraftTimeZone,
  pickClockSeconds: 0,
  autoPickOnTimeout: false,
};

export const pickClockOptions = [
  { value: 0, label: "No Pick Clock" },
  { value: 30, label: "30 Seconds" },
  { value: 60, label: "1 Minute" },
  { value: 90, label: "90 Seconds" },
  { value: 120, label: "2 Minutes" },
  { value: 180, label: "3 Minutes" },
  { value: 300, label: "5 Minutes" },
];

function padTwo(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateValue(date = new Date()) {
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(
    date.getDate()
  )}`;
}

export function getDraftDateOptions(days = 45) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    const prefix = index === 0 ? "Today" : index === 1 ? "Tomorrow" : null;
    const formatted = formatter.format(date);

    return {
      value: getLocalDateValue(date),
      label: prefix ? `${prefix}, ${formatted}` : formatted,
    };
  });
}

export function getDraftTimeOptions(
  dateValue?: string,
  timeZone: DraftTimeZone = defaultDraftTimeZone,
  now = new Date()
) {
  const options = Array.from({ length: 96 }).map((_, index) => {
    const hour = Math.floor(index / 4);
    const minute = (index % 4) * 15;
    const displayHour = hour % 12 || 12;
    const meridiem = hour < 12 ? "AM" : "PM";

    return {
      value: `${padTwo(hour)}:${padTwo(minute)}`,
      label: `${displayHour}:${padTwo(minute)} ${meridiem}`,
    };
  });

  if (!dateValue) return options;

  return options.filter((option) => {
    const scheduledAt = buildScheduledDraftAt(dateValue, option.value, timeZone);
    return scheduledAt !== null && new Date(scheduledAt).getTime() > now.getTime();
  });
}

export function getAvailableDraftTimeValue(
  dateValue: string,
  timeValue: string,
  timeZone: DraftTimeZone = defaultDraftTimeZone,
  now = new Date()
) {
  const options = getDraftTimeOptions(dateValue, timeZone, now);
  return options.some((option) => option.value === timeValue)
    ? timeValue
    : options[0]?.value || "";
}

function getTimeZoneOffsetMs(date: Date, timeZone: DraftTimeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second
    ) - date.getTime()
  );
}

export function buildScheduledDraftAt(
  dateValue: string,
  timeValue: string,
  timeZone: DraftTimeZone = defaultDraftTimeZone
) {
  if (!dateValue || !timeValue) return null;

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  if (Number.isNaN(utcGuess.getTime())) return null;

  const firstPass = new Date(
    utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess, timeZone)
  );
  const secondPass = new Date(
    utcGuess.getTime() - getTimeZoneOffsetMs(firstPass, timeZone)
  );

  return Number.isNaN(secondPass.getTime()) ? null : secondPass.toISOString();
}

export function normalizeDraftTiming(timing?: DraftTiming | null): Required<DraftTiming> {
  const pickClockSeconds = Math.max(0, Number(timing?.pickClockSeconds) || 0);

  return {
    draftType: timing?.draftType || "unscheduled",
    scheduledDraftAt: timing?.scheduledDraftAt || null,
    timeZone: timing?.timeZone || defaultDraftTimeZone,
    pickClockSeconds,
    autoPickOnTimeout: pickClockSeconds > 0 || Boolean(timing?.autoPickOnTimeout),
  };
}

export function isDraftScheduled(timing?: DraftTiming | null) {
  return normalizeDraftTiming(timing).draftType === "scheduled";
}

export function getScheduledDraftDate(timing?: DraftTiming | null) {
  const scheduledDraftAt = normalizeDraftTiming(timing).scheduledDraftAt;
  if (!scheduledDraftAt) return null;

  const date = new Date(scheduledDraftAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDraftOpen(timing?: DraftTiming | null, now = new Date()) {
  const normalized = normalizeDraftTiming(timing);
  if (normalized.draftType !== "scheduled") return true;

  const scheduledDate = getScheduledDraftDate(normalized);
  if (!scheduledDate) return true;

  return now.getTime() >= scheduledDate.getTime();
}

export function formatDraftStart(timing?: DraftTiming | null) {
  const scheduledDate = getScheduledDraftDate(timing);
  if (!scheduledDate) return "Anytime draft";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: normalizeDraftTiming(timing).timeZone,
    timeZoneName: "short",
  }).format(scheduledDate);
}

export function formatPickClock(seconds?: number) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value === 0) return "No pick clock";
  if (value < 60) return `${value}s per pick`;

  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;

  return remainingSeconds === 0
    ? `${minutes}m per pick`
    : `${minutes}m ${remainingSeconds}s per pick`;
}

export function getDraftStartsIn(timing?: DraftTiming | null, now = new Date()) {
  const scheduledDate = getScheduledDraftDate(timing);
  if (!scheduledDate) return null;

  const remainingMs = scheduledDate.getTime() - now.getTime();
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function getDraftOpeningBufferStartedAt(poolId: string) {
  const startedAt = Date.now();

  if (typeof window === "undefined") return startedAt;

  const key = `dwf:draft-opening-buffer-started-at:${poolId}`;
  const savedValue = Number(window.localStorage.getItem(key));

  if (Number.isFinite(savedValue) && savedValue > 0) {
    return savedValue;
  }

  window.localStorage.setItem(key, String(startedAt));
  return startedAt;
}
