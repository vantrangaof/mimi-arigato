// Days are stored as local "YYYY-MM-DD" keys so a day ends at the user's midnight.

export function dayKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const daysBetween = (fromKey, toKey) => Math.round((parseDay(toKey) - parseDay(fromKey)) / 86_400_000);

const fmt = (options) => new Intl.DateTimeFormat(undefined, options);
const SHORT = fmt({ month: "short", day: "numeric" });
const SHORT_YEAR = fmt({ month: "short", day: "numeric", year: "numeric" });
const LONG = fmt({ weekday: "long", month: "long", day: "numeric" });
const MONTH_YEAR = fmt({ month: "long", year: "numeric" });
const MONTH = fmt({ month: "long" });
const WEEKDAY_NARROW = fmt({ weekday: "narrow" });

const asDate = (d) => (d instanceof Date ? d : parseDay(d));

export const formatShort = (d) => SHORT.format(asDate(d));
export const formatShortYear = (d) => SHORT_YEAR.format(asDate(d));
export const formatLong = (d) => LONG.format(asDate(d));
export const formatMonthYear = (d) => MONTH_YEAR.format(asDate(d));
export const formatMonth = (d) => MONTH.format(asDate(d));
export const formatWeekdayNarrow = (d) => WEEKDAY_NARROW.format(asDate(d));
