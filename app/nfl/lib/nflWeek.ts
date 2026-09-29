const millisecondsPerDay = 24 * 60 * 60 * 1000;
const millisecondsPerWeek = 7 * millisecondsPerDay;

function easternDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    weekday: value("weekday"),
  };
}

function dateValue(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day);
}

function firstMondayOfSeptember(year: number) {
  const septemberFirst = new Date(Date.UTC(year, 8, 1));
  const weekday = septemberFirst.getUTCDay();
  const daysUntilMonday = (8 - weekday) % 7;
  return Date.UTC(year, 8, 1 + daysUntilMonday);
}

function weekdayIndex(weekday: string) {
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    weekday
  );
  return weekdayIndex;
}

export function getCurrentNflSeasonYear(date = new Date()) {
  const { year, month } = easternDateParts(date);
  return month < 3 ? year - 1 : year;
}

export function getCurrentNflWeek(date = new Date()) {
  const current = easternDateParts(date);
  const seasonYear = getCurrentNflSeasonYear(date);
  // NFL weeks run from Tuesday through Monday. Week 1 opens on the Tuesday
  // after Labor Day, and the default advances after Monday Night Football.
  const seasonWeekOneTuesday = firstMondayOfSeptember(seasonYear) + millisecondsPerDay;
  const currentDate = dateValue(current.year, current.month, current.day);
  const dayIndex = weekdayIndex(current.weekday);
  const currentTuesday = currentDate - ((dayIndex + 5) % 7) * millisecondsPerDay;
  const calculatedWeek =
    Math.floor((currentTuesday - seasonWeekOneTuesday) / millisecondsPerWeek) + 1;
  return Math.min(18, Math.max(1, calculatedWeek));
}
