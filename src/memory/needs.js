// Fish and water as little needs: Mimi gets a bit sad when they haven't had either today.
// Gentle on purpose: no sadness on your first day, before 9 am, or at night (Mimi's asleep), and
// one fish or drink cheers them right up. Nothing is ever lost, and "Nothing special today"
// still earns a fish and water, so there's always a way to feed them.

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

// { food, water }: true when Mimi is waiting for that one today.
export function needs(now = new Date()) {
  if (firstMet() === dayKey(now) || now.getHours() < MORNING) return { food: false, water: false };
  const fed = fedToday();
  return { food: !fed.food, water: !fed.water };
}

// What Mimi says while waiting, or null when they're all set.
export function needsLine({ food, water }) {
  if (food && water) return "is sitting by their empty bowls…";
  if (food) return "is looking sadly at their empty food bowl.";
  if (water) return "is looking at their empty water bowl. A bit thirsty.";
  return null;
}
