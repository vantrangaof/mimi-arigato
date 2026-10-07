// "Mimi remembers before you do": now and then, when you open the app, Mimi brings up a person,
// place or thing you used to mention that hasn't come up in a while. Never a question you have to
// answer, never a nudge. At most once every two weeks, and the same thing at most twice a year.

import { allEntries, read, write, catName } from "../core/store.js";
import { dayKey, daysBetween, formatMonth, formatMonthYear } from "../core/dates.js";
import { knownPeople, knownPlaces, aboutSubject } from "./about.js";
import { THEMES } from "./themes.js";

const EVERY_DAYS = 14;
const AGAIN_DAYS = 180;
const QUIET_DAYS = 60; // not mentioned for this long…
const SINCE = 8; // …while you kept telling Mimi other good things

// The thing Mimi remembers today, or null. { kind, id, about, last, n }
export function rememberCandidate(today = dayKey(), entries = allEntries()) {
  const said = read("remembered", {});
  const subjects = [
    ...knownPeople(entries).filter((p) => p.n >= 3).map((p) => ({ kind: "person", id: p.name })),
    ...knownPlaces(entries).filter((p) => p.n >= 2).map((p) => ({ kind: "place", id: p.name })),
    ...THEMES.map((t) => ({ kind: "theme", id: t.id })),
  ];
  const found = [];
  for (const s of subjects) {
    const key = `${s.kind}:${s.id}`;
    if (said[key] && daysBetween(said[key], today) < AGAIN_DAYS) continue;
    const info = aboutSubject(s, entries);
    if (!info || info.entries.length < 3) continue;
    const last = info.entries[0].key;
    if (daysBetween(last, today) < QUIET_DAYS) continue;
    if (entries.filter((e) => e.key > last).length < SINCE) continue;
    found.push({ ...s, key, about: info.about, last, n: info.entries.length });
  }
  return found.sort((a, b) => b.n - a.n)[0] ?? null;
}

// A greeting for opening the app (see main.js), or null. Remembers that it was said.
export function rememberGreeting(today = dayKey()) {
  const lastAt = read("rememberedAt", null);
  if (lastAt && daysBetween(lastAt, today) < EVERY_DAYS) return null;
  const c = rememberCandidate(today);
  if (!c) return null;
  write("rememberedAt", today);
  write("remembered", { ...read("remembered", {}), [c.key]: today });
  const since = c.last.slice(0, 4) === today.slice(0, 4) ? formatMonth(c.last) : formatMonthYear(c.last);
  const cat = catName();
  const line = c.kind === "person"
    ? `was just thinking about ${c.about}. They haven't come up since ${since}. ${cat} hopes they're well.`
    : c.kind === "place"
      ? `remembers ${c.about}. You haven't talked about it since ${since}. ${cat} hopes you still go sometimes.`
      : `remembers how much you used to like ${c.about}. Not since ${since}. No pressure. Just remembering.`;
  return ["hey.", line, { hearts: 1, hold: 4600 }];
}
