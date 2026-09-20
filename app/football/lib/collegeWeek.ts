const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

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

function sundayForDate(year: number, month: number, day: number, weekday: string) {
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    weekday
  );
  return Date.UTC(year, month - 1, day - weekdayIndex);
}

export function getCurrentCollegeFootballSeasonYear(date = new Date()) {
  const { year, month } = easternDateParts(date);
  return month < 3 ? year - 1 : year;
}

export function getCurrentCollegeFootballWeek(date = new Date()) {
  const current = easternDateParts(date);
  const seasonYear = getCurrentCollegeFootballSeasonYear(date);
  const septemberFirst = new Date(Date.UTC(seasonYear, 8, 1));
  const septemberFirstWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(septemberFirst);
  // New pools roll to the next college-football week as soon as Sunday begins
  // in Eastern time. The first Sunday-to-Saturday window containing September 1
  // is Week 1, and every subsequent Sunday advances the default week.
  const seasonWeekOneSunday = sundayForDate(
    seasonYear,
    9,
    1,
    septemberFirstWeekday
  );
  const currentSunday = sundayForDate(
    current.year,
    current.month,
    current.day,
    current.weekday
  );
  const calculatedWeek =
    Math.floor((currentSunday - seasonWeekOneSunday) / millisecondsPerWeek) + 1;
  return Math.min(18, Math.max(1, calculatedWeek));
}
