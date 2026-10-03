// "A year ago today": good things from this date in earlier years, and what Mimi makes of them.

import { store, allEntries, catName } from "../core/store.js";
import { dayKey, daysBetween } from "../core/dates.js";
import { capitalize } from "../core/dom.js";
import { categorize, knownNames, peopleIn, hash } from "./insights.js";
import { themesIn } from "./themes.js";

const RECENT_DAYS = 60;

// Good things from this month and day in earlier years, closest year first:
// [{ years: 1, key: "2025-10-04", entries: [{ key, text }] }]
export function onThisDay(today = dayKey()) {
  const [year, rest] = [Number(today.slice(0, 4)), today.slice(4)];
  const byYear = new Map();
  for (const e of allEntries()) {
    if (e.key.slice(4) !== rest || e.key >= today) continue;
    const years = year - Number(e.key.slice(0, 4));
    if (!byYear.has(years)) byYear.set(years, { years, key: e.key, entries: [] });
    byYear.get(years).entries.push(e);
  }
  return [...byYear.values()].sort((a, b) => a.years - b.years);
}

export const agoLabel = (years) => (years === 1 ? "One year ago today" : `${years} years ago today`);

// What Mimi says about it: a wish that came true, a thing or a person that's still around,
// or something warm.
export function yearAgoRemark(found, today = dayKey()) {
  const name = catName();
  const recent = allEntries().filter((e) => daysBetween(e.key, today) <= RECENT_DAYS);
  const old = found.entries;

  const wish = store.wishes.find((w) => w.done && w.key === found.key && old.some((e) => e.text === w.text));
  if (wish) return `You wished to ‘${wish.what}’ that day. And then you did it.`;

  const stillThemes = new Set(recent.flatMap((e) => themesIn(e.text).map((t) => t.id)));
  const theme = old.flatMap((e) => themesIn(e.text)).find((t) => stillThemes.has(t.id));
  if (theme) return `You still like ${theme.about}. Some things are very reliable.`;

  const known = knownNames();
  const stillPeople = new Set(recent.flatMap((e) => peopleIn(e.text, known)));
  const who = old.flatMap((e) => peopleIn(e.text, known)).find((n) => stillPeople.has(n));
  if (who) return `${who} is still around. ${capitalize(name)} is glad.`;

  if (old.some((e) => categorize(e.text).includes("hard"))) return "That was a hard day, and here you are.";

  const lines = [
    `${capitalize(name)} remembers this one.`,
    "Look how far you've come.",
    `${found.years === 1 ? "A whole year" : `${found.years} whole years`}. ${capitalize(name)}'s whiskers got longer.`,
    "Some days are worth keeping. This was one.",
  ];
  return lines[hash(found.key) % lines.length];
}
