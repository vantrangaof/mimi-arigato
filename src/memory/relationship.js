// How long you and Mimi have known each other, and the milestones along the way.
// Deliberately no streaks: missing a day never takes anything away.

import { store, KEYS, read, write, totalThings } from "../core/store.js";
import { dayKey, daysBetween } from "../core/dates.js";

export function firstMet() {
  const saved = read(KEYS.firstMet, null);
  const first = [saved, Object.keys(store.days).sort()[0], dayKey()].filter(Boolean).sort()[0];
  if (first !== saved) write(KEYS.firstMet, first);
  return first;
}

export const daysTogether = () => daysBetween(firstMet(), dayKey()) + 1;

const MILESTONES = [
  { id: "day-1", reached: () => true, say: ["hello!", "says nice to meet you!"] },
  { id: "day-7", reached: () => daysTogether() >= 7, say: ["mrrp!", "recognizes you now."] },
  { id: "day-30", reached: () => daysTogether() >= 30, say: ["♡", "knows some of your favorite things now."] },
  { id: "day-100", reached: () => daysTogether() >= 100, say: ["100 days!", "has been with you for 100 days."] },
  { id: "day-365", reached: () => daysTogether() >= 365, say: ["one year!", "has been with you for a whole year."] },
  { id: "things-50", reached: () => totalThings() >= 50, say: ["50!", "has heard 50 good things from you."] },
  { id: "things-100", reached: () => totalThings() >= 100, say: ["100!", "has heard 100 good things from you."] },
  { id: "things-250", reached: () => totalThings() >= 250, say: ["250!", "has heard 250 good things. What a life!"] },
  { id: "things-500", reached: () => totalThings() >= 500, say: ["500!", "has filled their little world with 500 good things."] },
  { id: "things-1000", reached: () => totalThings() >= 1000, say: ["1000!", "has kept 1,000 good things for you."] },
];

// Milestones reached but not yet celebrated; marks them as celebrated.
export function newMilestones() {
  const reached = MILESTONES.filter((m) => m.reached());
  let seen = read(KEYS.milestones, null);
  if (seen === null) {
    // First run of this feature: existing friends skip what they've already passed;
    // brand-new friends still get "nice to meet you".
    seen = totalThings() === 0 ? [] : reached.map((m) => m.id);
  }
  const fresh = reached.filter((m) => !seen.includes(m.id));
  write(KEYS.milestones, [...seen, ...fresh.map((m) => m.id)]);
  return fresh.map((m) => [...m.say, { hearts: 3, hold: 3200 }]);
}
