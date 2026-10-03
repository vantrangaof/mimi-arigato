// Wishes: when a good thing says "I want to…", "someday I'll…", "I'd love to…", Mimi folds
// that wish into the jar. When a later good thing mentions the same thing, the wish came true.
// Matching is keyword-based, so Mimi asks rather than declares ("did you just do it?!").

import { store } from "../core/store.js";
import { dayKey, formatShort, formatShortYear } from "../core/dates.js";

const WISH = /\b(?:i (?:really )?(?:want|wanna|hope|plan) to|i(?:'d| would) (?:really )?love to|(?:i )?wish i could|some ?day i(?:'ll| will)?|one day i(?:'ll| will)?|my (?:dream|goal) is to|bucket list:?)\s+(.+)/i;
const STOP_AT = /(?:[.!?,;:]|\s(?:someday|one day|soon|this year|next year|eventually|but|because|and then)\b)/i;

// Words that don't say what the wish is about.
const STOP = new Set(("a an the to and or of in on at for with my me i it this that be is am are was some more "
  + "learn try go going get make start do have take buy find see visit really finally again maybe how "
  + "someday day one again also just very much lot lots new first time there here our your their "
  + "mom mum mother dad father sister brother grandma grandpa family friends friend partner").split(" "));

const wordsOf = (t) => t.toLowerCase().match(/\p{L}[\p{L}'’]*/gu) ?? [];

// The wish in a good thing ("learn pottery"), with the words that identify it, or null.
export function wishIn(text) {
  const m = text.replace(/’/g, "'").match(WISH); // phones type curly apostrophes
  if (!m) return null;
  const what = m[1].split(STOP_AT)[0].trim().replace(/\s+/g, " ").slice(0, 60);
  const words = [...new Set(wordsOf(what).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 6);
  return words.length ? { what, words } : null;
}

// "pottery" matches "potter", "japan" matches "japanese": compare the first 5 letters of longer words.
const matches = (word, inText) => inText.some((w) => (word.length <= 5 ? w === word : w.startsWith(word.slice(0, 5))));

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Called after a good thing is added. Returns { made, cameTrue } and saves any change:
// made = a new wish found in this good thing; cameTrue = earlier wishes this one fulfils.
export function noticeWish(text, day = dayKey()) {
  const found = wishIn(text);
  if (found) {
    const made = { id: newId(), key: day, text, what: found.what, words: found.words, done: null };
    store.wishes.push(made);
    return { made, cameTrue: [] };
  }
  const words = wordsOf(text);
  const cameTrue = openWishes().filter((w) => w.key < day && w.words.some((x) => matches(x, words)));
  for (const w of cameTrue) w.done = { key: day, text };
  return { made: null, cameTrue };
}

export const openWishes = () => store.wishes.filter((w) => !w.done);
export const wishesCameTrue = () => store.wishes.filter((w) => w.done);

// Mimi's lines when a wish is made or comes true.
export const madeLine = (wish) => `folded your wish into the jar: “${wish.what}.”`;
const when = (key) => (key.slice(0, 4) === dayKey().slice(0, 4) ? formatShort(key) : formatShortYear(key));
export const cameTrueLine = (wish) => `remembers you wished to “${wish.what}” on ${when(wish.key)}. Did you just do it?!`;

// When the good thing that made a wish is removed (a typo, say), the wish goes too.
export function forgetWish(day, text) {
  const before = store.wishes.length;
  store.wishes = store.wishes.filter((w) => w.done || w.key !== day || w.text !== text);
  return store.wishes.length !== before;
}
