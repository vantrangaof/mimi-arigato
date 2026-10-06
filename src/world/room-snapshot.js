// What a friend sees when they visit: just the room. The snapshot never holds good things,
// diary pages, photos or theories. Your things from your life are left out when
// "Show my things to friends" is off.

import { store, catName, totalThings } from "../core/store.js";
import { dayKey } from "../core/dates.js";
import { validWear, MAX_THINGS } from "./world.js";
import { SEASONS, seasonOn } from "./seasons.js";
import { roomThingIds } from "../memory/themes.js";

export function roomSnapshot() {
  const total = totalThings();
  const { fur, customFur, wear, shareThings } = store.settings;
  return {
    v: 1,
    catName: catName(),
    fur,
    customFur: fur === "custom" ? customFur : null,
    wear: validWear(wear, total),
    total,
    treasures: store.treasures.map((t) => t.id),
    things: shareThings ? roomThingIds(MAX_THINGS) : [],
    season: seasonOn()?.id ?? null,
    day: dayKey(),
  };
}

// The friend's season: theirs if the snapshot is from today (it may be their anniversary),
// otherwise whatever the calendar says.
export function snapshotSeason(snap) {
  if (snap?.day === dayKey()) return snap.season ?? null;
  return SEASONS.find((s) => s.id !== "anniversary" && s.active(dayKey()))?.id ?? null;
}
