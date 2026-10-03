// Mimi's own good thing of the day: the journal turned around. Picked once per day from
// lines that fit the room (only things Mimi actually has) and kept for the rest of the day.

import { store, read, write, totalThings } from "../core/store.js";
import { dayKey } from "../core/dates.js";
import { pick } from "../core/dom.js";
import { isUnlocked, TREASURES } from "../world/world.js";
import { seasonOn } from "../world/seasons.js";

const KEY = "mimiGood";

const EVERYDAY = [
  "A very good stretch.",
  "My tail did exactly what I wanted.",
  "I heard a can open somewhere.",
  "I napped in the perfect position.",
  "The floor was warm.",
  "I caught a dust bunny.",
  "A long, slow blink with you.",
  "I chased my tail and almost got it.",
  "A crinkly paper bag appeared.",
  "I sat in a box. It fit.",
  "A treat. Obviously.",
  "You came back.",
  "I purred so hard I fell asleep.",
  "Watching you write your good things.",
  "A fly. I didn't catch it, but I tried.",
  "My whiskers felt extra fancy.",
  "I sat on something warm you left behind.",
  "Yarn. That's it. Yarn.",
  "Someone said my name in a soft voice.",
  "I washed my face and it went well.",
];

const ROOM = {
  plant: "The plant grew a new leaf.",
  cushion: "A sunbeam moved onto the cushion.",
  picture: "I looked at the picture on the wall for a long time.",
  window: "A bird sat outside the window for a whole minute.",
  bookshelf: "I found a warm spot on top of a book.",
  aquarium: "The fish waved at me. I think.",
  starry: "I counted eleven stars.",
};

function candidates() {
  const total = totalThings();
  const lines = [...EVERYDAY];
  for (const [id, line] of Object.entries(ROOM)) if (isUnlocked(id, total)) lines.push(line, line);
  for (const t of store.treasures) if (TREASURES[t.id]) lines.push(`I looked at my ${TREASURES[t.id].label} again.`);
  const season = seasonOn();
  if (season) lines.push(season.good, season.good, season.good);
  return lines;
}

export function mimiGoodThing(day = dayKey()) {
  const saved = read(KEY, null);
  if (saved?.day === day) return saved.text;
  const text = pick(candidates());
  write(KEY, { day, text });
  return text;
}

// The same line as a status line after Mimi's name: "wants to share theirs: a sunbeam…"
export const goodThingLine = (text) =>
  `wants to share theirs: ${/^I\b/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1)}`;
