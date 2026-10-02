// Rare little surprises (at most about three a week): a found treasure or a dream.

import { store, KEYS, read, write, totalThings } from "../core/store.js";
import { dayKey, daysBetween } from "../core/dates.js";
import { pick } from "../core/dom.js";
import { TREASURES } from "./world.js";
import { topFavorite } from "../memory/insights.js";

const CHANCE = 0.35;

// Returns a reaction [sound, line, options] or null. Saves anything found.
export function maybeSurprise() {
  const today = dayKey();
  const log = read(KEYS.surprises, []);
  const last = log.at(-1);
  const thisWeek = log.filter((d) => daysBetween(d, today) < 7).length;
  if (totalThings() < 3 || log.includes(today) || thisWeek >= 3) return null;
  if (last && daysBetween(last, today) < 2) return null;
  if (Math.random() > CHANCE) return null;

  write(KEYS.surprises, [...log.slice(-20), today]);

  const hour = new Date().getHours();
  const unfound = Object.keys(TREASURES).filter((id) => !store.treasures.some((t) => t.id === id));
  if (!unfound.length || (hour >= 5 && hour < 11 && Math.random() < 0.5)) {
    const dreams = ["dreamed about fish last night.", "dreamed you were a giant cat.", "dreamed about a sky full of yarn."];
    const fav = topFavorite();
    if (fav) dreams.push(`dreamed about ${fav.label} last night.`);
    return ["a dream…", pick(dreams), { hearts: 1, hold: 3600 }];
  }

  const id = pick(unfound);
  store.treasures.push({ id, key: today });
  store.save("treasures");
  return ["look!", `found a ${TREASURES[id].label} today. It's in the room now.`, { hearts: 2, hold: 3800 }];
}
