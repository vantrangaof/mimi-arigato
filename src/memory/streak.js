// Paw prints: a day gets one when you tell Mimi a good thing (or "Nothing special today").
// A gentle streak: missed days are naps, and a run keeps going through up to two naps a week.
// Nothing here ever says you lost anything; the numbers shown only count what you did.

import { store, KEYS, read } from "../core/store.js";
import { dayKey, parseDay } from "../core/dates.js";
import { firstMet } from "./relationship.js";

export const NAPS_PER_WEEK = 2;
const RUN_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

const pawDays = () => new Set([...Object.keys(store.days), ...read(KEYS.quietDays, [])]);

function addDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// Monday of the week `key` is in.
const weekStart = (key) => addDays(key, -((parseDay(key).getDay() + 6) % 7));

// { run, longest }: paw days in the current run (today counts once it has a paw; a day
// that's still going is never a nap) and the longest run ever.
function runs(paws, today) {
  const days = [...paws].filter((d) => d <= today).sort();
  if (!days.length) return { run: 0, longest: 0 };
  let run = 0;
  let longest = 0;
  let naps = 0;
  let week = null;
  for (let day = days[0]; day <= today; day = addDays(day, 1)) {
    if (weekStart(day) !== week) {
      week = weekStart(day);
      naps = 0;
    }
    if (paws.has(day)) run += 1;
    else if (day !== today && ++naps > NAPS_PER_WEEK) run = 0;
    longest = Math.max(longest, run);
  }
  return { run, longest };
}

// This week, Monday first: [{ key, state: "paw" | "nap" | "today" | "later" | "before" }],
// plus counts for the line under it.
export function pawWeek(today = dayKey()) {
  const paws = pawDays();
  const start = weekStart(today);
  const met = firstMet();
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    const state = paws.has(key) ? "paw"
      : key > today ? "later"
      : key === today ? "today"
      : key < met ? "before"
      : "nap";
    return { key, state };
  });
  const month = today.slice(0, 7);
  return {
    week,
    thisWeek: week.filter((d) => d.state === "paw").length,
    thisMonth: [...paws].filter((d) => d.startsWith(month) && d <= today).length,
    ...runs(paws, today),
  };
}

// A run milestone reached today (3, 7, 14…), or null.
export function runMilestone(today = dayKey()) {
  const { run } = runs(pawDays(), today);
  return pawDays().has(today) && RUN_MILESTONES.includes(run) ? run : null;
}
