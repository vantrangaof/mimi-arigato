// Fish and water as little needs: Mimi gets a bit sad when they haven't had either today.
// Gentle on purpose: no sadness on your first day, before 9 am, or at night (Mimi's asleep), and
// one fish or drink cheers them right up. Nothing is ever lost, and "Nothing special today"
// still earns a fish, so there's always a way to feed them.
// If a bowl stayed empty all of yesterday, Mimi is waiting from the moment they wake up.

import { KEYS, read, write } from "../core/store.js";
import { dayKey } from "../core/dates.js";
import { firstMet } from "./relationship.js";

const MORNING = 9;

export function markFed(kind) {
  write(KEYS.fed, { ...read(KEYS.fed, {}), [kind]: dayKey() });
}

// { food, water }: true when given today (the bowls are full).
export function fedToday() {
  const fed = read(KEYS.fed, {});
  return { food: fed.food === dayKey(), water: fed.water === dayKey() };
}

// { food, water }: true when that bowl was forgotten all of yesterday (and you'd already met).
export function missedYesterday(now = new Date()) {
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  if (firstMet() > yesterday) return { food: false, water: false };
  const fed = read(KEYS.fed, {});
  const missed = (kind) => !fed[kind] || fed[kind] < yesterday;
  return { food: missed("food"), water: missed("water") };
}

// { food, water }: true when Mimi is waiting for that one today.
export function needs(now = new Date()) {
  if (firstMet() === dayKey(now)) return { food: false, water: false };
  const fed = fedToday();
  const late = now.getHours() >= MORNING;
  const missed = missedYesterday(now);
  return { food: !fed.food && (late || missed.food), water: !fed.water && (late || missed.water) };
}

// What Mimi says while waiting, or null when they're all set.
export function needsLine({ food, water }) {
  if (food && water) return "is sitting by their empty bowls…";
  if (food) return "is looking sadly at their empty food bowl.";
  if (water) return "is looking at their empty water bowl. A bit thirsty.";
  return null;
}

// A greeting for opening the app while a bowl is empty, or null.
export function needsGreeting(now = new Date()) {
  const need = needs(now);
  if (!need.food && !need.water) return null;
  const missed = missedYesterday(now);
  const forgot = (need.food && missed.food) || (need.water && missed.water);
  return ["…", forgot ? "missed you yesterday. The bowls stayed empty." : needsLine(need), { hearts: 0, hold: 3200 }];
}
