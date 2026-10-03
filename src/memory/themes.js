// Themes in your life that Mimi notices: things you keep mentioning. A theme that comes up
// in a few good things puts a small object in Mimi's room (drawn in world/world.js) and
// feeds Mimi's theories. Once an object appears it stays, like everything in the room.

import { store, allEntries } from "../core/store.js";
import { dayKey } from "../core/dates.js";

export const THEME_MIN = 3; // good things that mention a theme before its object appears

// about: how Mimi talks about it ("You've loved coffee for a long time").
// thing: the object that appears in the room.
export const THEMES = [
  { id: "coffee", about: "coffee", thing: "coffee mug", re: /\b(coffee|latte|espresso|cappuccino|americano|caf[eé]s?)\b/ },
  { id: "tea", about: "tea", thing: "little teapot", re: /\b(tea|matcha|boba|oolong|chai)\b/ },
  { id: "books", about: "books", thing: "stack of books", re: /\b(books?|reading|novel|library)\b/ },
  { id: "music", about: "music", thing: "little radio", re: /\b(music|songs?|concert|playlist|album|sang|singing)\b/ },
  { id: "cats", about: "cats", thing: "toy mouse", re: /\b(cats?|kittens?|kitty)\b/ },
  { id: "dogs", about: "dogs", thing: "dog bone", re: /\b(dogs?|pupp(y|ies)|doggo)\b/ },
  { id: "rain", about: "rainy days", thing: "umbrella", re: /\b(rain\w*|drizzl\w*)\b/ },
  { id: "flowers", about: "flowers", thing: "vase of flowers", re: /\b(flowers?|plants?|garden\w*|bloom\w*|blossoms?)\b/ },
  { id: "cooking", about: "cooking", thing: "little pot", re: /\b(cook(ed|ing)?|bak(e|ed|ing)|recipe)\b/ },
  { id: "noodles", about: "noodles", thing: "noodle bowl", re: /\b(pho|noodles?|ramen|udon|soba)\b/ },
  { id: "sweets", about: "sweet things", thing: "cupcake", re: /\b(cakes?|cupcakes?|desserts?|ice cream|cookies?|chocolate|pastr(y|ies)|donuts?)\b/ },
  { id: "travel", about: "travel", thing: "suitcase", re: /\b(travel\w*|trip|flight|airport|vacation|holiday)\b/ },
  { id: "sea", about: "the sea", thing: "beach ball", re: /\b(beach|ocean|sea|seaside|swim\w*)\b/ },
  { id: "walks", about: "walks", thing: "pair of sneakers", re: /\b(walk\w*|run|ran|running|jog\w*|hik(e|ed|ing))\b/ },
  { id: "photos", about: "taking photos", thing: "camera", re: /\b(photos?|camera|photograph\w*|pictures?)\b/ },
  { id: "games", about: "games", thing: "game controller", re: /\b(games?|gaming)\b/ },
  { id: "art", about: "making art", thing: "paint palette", re: /\b(draw(ing|n)?|drew|paint(ed|ing)?|sketch\w*|art)\b/ },
  { id: "movies", about: "movies", thing: "bucket of popcorn", re: /\b(movies?|films?|cinema|netflix)\b/ },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) ?? null;
export const themesIn = (text) => THEMES.filter((t) => t.re.test(text.toLowerCase()));

// How many good things mention each theme: { coffee: 4, ... }
export function themeCounts(entries = allEntries()) {
  const counts = {};
  for (const e of entries) for (const t of themesIn(e.text)) counts[t.id] = (counts[t.id] ?? 0) + 1;
  return counts;
}

// Themes that just reached THEME_MIN and get an object in the room. Saves them; returns the new ones.
export function claimRoomThings(day = dayKey()) {
  const counts = themeCounts();
  const fresh = THEMES.filter((t) => (counts[t.id] ?? 0) >= THEME_MIN && !store.roomThings.some((r) => r.id === t.id));
  for (const t of fresh) store.roomThings.push({ id: t.id, key: day });
  return fresh;
}

// What Mimi says when a new object appears.
export const roomThingLine = (theme) =>
  `has been noticing a theme. ${/^[aeiou]/.test(theme.thing) ? "An" : "A"} ${theme.thing} appeared in the room.`;

// The things shown in the room (it has room for `max`): the most-mentioned ones, kept in the
// order they appeared so nothing jumps around.
export function roomThingIds(max) {
  const counts = themeCounts();
  const top = [...store.roomThings].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)).slice(0, max);
  return store.roomThings.filter((r) => top.includes(r)).map((r) => r.id);
}
