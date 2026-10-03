// Mimi's weekly postcard: a few lines about the week's good things (Monday to Sunday).
// It arrives on Sunday and stays on the floor until the next one.

import { allEntries, catName, read, write } from "../core/store.js";
import { dayKey, parseDay } from "../core/dates.js";
import { plural } from "../core/dom.js";
import { categorize, namesIn, topFavorite, hash, FAVORITE_CATS } from "./insights.js";

const SEEN = "postcardSeen";

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const times = (n) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);

// The week the current postcard is about: this week on Sunday, otherwise last week.
export function postcardWeek(today = dayKey()) {
  const d = parseDay(today);
  const sunday = d.getDay() === 0 ? d : addDays(d, -d.getDay());
  return { from: dayKey(addDays(sunday, -6)), to: dayKey(sunday) };
}

// The postcard for the current week, or null if nothing was written that week.
export function weekPostcard(today = dayKey()) {
  const { from, to } = postcardWeek(today);
  const entries = allEntries().filter((e) => e.key >= from && e.key <= to);
  if (!entries.length) return null;

  const cats = (cat) => entries.filter((e) => categorize(e.text).includes(cat)).length;
  const lines = [`You told me ${plural(entries.length, "good thing")} on ${plural(new Set(entries.map((e) => e.key)).size, "day")}.`];

  const laughs = cats("laugh");
  if (laughs) lines.push(`You laughed ${times(laughs)}.`);
  const people = new Map();
  for (const e of entries) for (const who of new Set(namesIn(e.text))) people.set(who, (people.get(who) ?? 0) + 1);
  const [who, n] = [...people].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (who && n >= 2) lines.push(`${who} came up ${times(n)}.`);
  else if (who) lines.push(`${who} was in one of your good things.`);
  const fav = topFavorite(entries);
  if (fav) lines.push(`${fav.label.charAt(0).toUpperCase()}${fav.label.slice(1)} showed up ${times(fav.count)}.`);
  if (fav?.label !== "rainy days" && entries.some((e) => /\brain\w*/i.test(e.text))) lines.push("It rained, and you noticed.");
  const beauty = cats("beauty");
  if (beauty >= 2) lines.push(`You noticed ${beauty} beautiful things.`);
  if (cats("hard")) lines.push("Something was hard, and you still found a good thing.");
  if (cats("proud")) lines.push("You did something to be proud of.");

  const warm = entries.filter((e) => categorize(e.text).some((c) => FAVORITE_CATS.includes(c)));
  const pool = warm.length ? warm : entries;
  return {
    from,
    to,
    lines: lines.slice(0, 5),
    favorite: pool[hash(from) % pool.length],
    sign: `Love, ${catName()}`,
  };
}

export const postcardSeen = (card) => read(SEEN, null) === card.from;
export const markPostcardSeen = (card) => write(SEEN, card.from);
