// Mimi's theories: small, harmless conclusions Mimi draws by connecting your good things
// (who is around when good things happen, what goes together, what came back or went quiet).
// Mimi finds at most one every few days and keeps each one, numbered, in Memories.
// "{cat}" in a theory's text is replaced with the cat's current name when shown.

import { store, allEntries, catName, totalThings } from "../core/store.js";
import { dayKey, daysBetween, formatMonth, parseDay } from "../core/dates.js";
import { capitalize } from "../core/dom.js";
import { categorize, knownNames, peopleIn } from "./insights.js";
import { THEMES, themesIn } from "./themes.js";

const MIN_ENTRIES = 10; // before the first theory
const EVERY_DAYS = 3; // at most one new theory this often

const FAMILY = [
  ["mom", /\b(mom|mum|mother|mama)\b/],
  ["dad", /\b(dad|father|papa)\b/],
  ["sister", /\bsister\b/],
  ["brother", /\bbrother\b/],
  ["grandma", /\b(grandma|grandmother)\b/],
  ["grandpa", /\b(grandpa|grandfather)\b/],
  ["partner", /\b(partner|wife|husband|boyfriend|girlfriend)\b/],
];

// Pairs of themes with their own line; any other pair that keeps showing up gets the general one.
const PAIRS = {
  "coffee+rain": "Coffee on a rainy day might be your favorite thing in the world. Just a theory.",
  "books+rain": "Rain plus a book seems to be your ideal weather. {cat} agrees.",
  "books+coffee": "You don't just like coffee. You like coffee with a book. {cat} has noted the difference.",
  "books+tea": "Tea and a book. {cat} thinks you have this figured out.",
  "music+walks": "Your walks seem to come with a soundtrack.",
  "cooking+sweets": "You bake things and then you're happy. {cat} sees a pattern. {cat} also wants some.",
  "photos+travel": "When you go somewhere new, you take pictures. {cat} would like to see them all.",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Entries written at a real time of day (not imported or moved from an old version at noon).
const timed = (entries) => entries.filter((e) => {
  if (!e.at) return false;
  const d = new Date(e.at);
  return !(d.getHours() === 12 && d.getMinutes() === 0 && d.getSeconds() === 0);
});

const share = (n, of) => (of ? n / of : 0);

// Every theory that fits right now, strongest first: { id, kind, text, strength }.
export function candidateTheories(entries = allEntries(), today = dayKey()) {
  const out = [];
  const add = (kind, id, text, strength) => out.push({ kind, id, text, strength });
  const lower = entries.map((e) => ({ ...e, t: e.text.toLowerCase(), cats: categorize(e.text), themes: themesIn(e.text).map((t) => t.id) }));
  const total = lower.length;
  const count = (cat) => lower.filter((e) => e.cats.includes(cat)).length;

  // People: who is around when good things happen.
  const people = new Map();
  const known = knownNames(entries);
  for (const e of lower) {
    for (const who of new Set(peopleIn(e.text, known))) {
      const p = people.get(who) ?? { n: 0, laugh: 0, cats: new Set(), themes: {} };
      p.n += 1;
      if (e.cats.includes("laugh")) p.laugh += 1;
      e.cats.forEach((c) => p.cats.add(c));
      for (const th of e.themes) p.themes[th] = (p.themes[th] ?? 0) + 1;
      people.set(who, p);
    }
  }
  for (const [who, p] of people) {
    if (p.laugh >= 2) add("laugh", `laugh:${who}`, `${who} is very good at making you laugh. {cat} has checked.`, p.laugh + 3);
    if (p.n >= 4 && p.cats.size >= 3) add("person", `person:${who}`, `Good things happen suspiciously often when ${who} is around.`, p.n + 2);
    for (const [th, n] of Object.entries(p.themes)) {
      const about = THEMES.find((x) => x.id === th).about;
      if (n >= 3) add("with", `with:${who}:${th}`, `${capitalize(about)} is better with ${who}, apparently.`, n + 1);
    }
  }
  for (const [who, re] of FAMILY) {
    const n = lower.filter((e) => re.test(e.t)).length;
    const pronoun = { mom: "she", grandma: "she", sister: "she", dad: "he", grandpa: "he", brother: "he" }[who] ?? "they";
    const sounds = pronoun === "they" ? "sound" : "sounds";
    if (n >= 3) add("family", `family:${who}`, `Your ${who} keeps showing up in your good days. {cat} thinks ${pronoun} ${sounds} lovely.`, n + 1);
  }

  // Things that go together.
  const pairs = {};
  for (const e of lower) {
    const ids = [...new Set(e.themes)].sort();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const key = `${ids[i]}+${ids[j]}`;
      pairs[key] = (pairs[key] ?? 0) + 1;
    }
  }
  for (const [key, n] of Object.entries(pairs)) {
    if (n < 3) continue;
    const [a, b] = key.split("+").map((id) => THEMES.find((x) => x.id === id).about);
    add("pair", `pair:${key}`, PAIRS[key] ?? `${capitalize(a)} and ${b} seem to go together for you. {cat} approves of this combination.`, n + 2);
  }

  // Things you've liked for a long time, and things that went quiet.
  for (const theme of THEMES) {
    const hits = lower.filter((e) => e.themes.includes(theme.id));
    if (hits.length < 4) continue;
    const first = hits[0].key;
    const last = hits.at(-1).key;
    if (daysBetween(first, today) >= 180 && daysBetween(last, today) <= 30) {
      add("reliable", `reliable:${theme.id}`, `You've loved ${theme.about} for a long time. Some things are very reliable.`, hits.length);
    }
    const since = lower.filter((e) => e.key > last).length;
    if (daysBetween(last, today) >= 90 && since >= 10) {
      add("quiet", `quiet:${theme.id}:${last.slice(0, 7)}`,
        `You used to talk about ${theme.about} a lot. Not since ${formatMonth(last)}. {cat} is just noticing. No pressure.`, hits.length - 1);
    }
  }

  // What kind of person you are, according to a cat.
  if (total >= 15) {
    if (share(count("tiny"), total) >= 0.35) add("you", "you:tiny", "You notice tiny things. {cat} thinks that's a kind of superpower.", 4);
    if (share(count("food"), total) >= 0.35) add("you", "you:food", "A suspicious amount of your happiness is edible.", 4);
    if (share(count("beauty"), total) >= 0.25) add("you", "you:beauty", "You stop to look at things. The sky, the light, flowers. {cat} likes that about you.", 3);
  }
  if (count("hard") >= 3) add("you", "you:hard", "You find good things even on hard days. {cat} thinks you're tougher than you say.", count("hard"));
  if (count("kindness") >= 4) add("you", "you:kind", "People are kind to you a lot. {cat} suspects it's because you're kind first.", count("kindness"));
  if (count("proud") >= 5) add("you", "you:proud", "You get more done than you give yourself credit for. {cat} has been keeping count.", count("proud"));
  const cats = lower.filter((e) => e.themes.includes("cats")).length;
  const dogs = lower.filter((e) => e.themes.includes("dogs")).length;
  if (cats >= 3) add("you", "you:cats", "You talk about cats a lot. {cat} is flattered. Unless it's a different cat.", cats);
  if (dogs >= 3) add("you", "you:dogs", "You talk about dogs a lot. {cat} is choosing not to take this personally.", dogs);

  // When good things happen.
  const days = [...new Set(lower.map((e) => e.key))];
  if (total >= 25 && days.length >= 14) {
    const perWeekday = Array(7).fill(0);
    for (const e of lower) perWeekday[parseDay(e.key).getDay()] += 1;
    const best = perWeekday.indexOf(Math.max(...perWeekday));
    if (perWeekday[best] >= 6 && perWeekday[best] >= 1.6 * (total / 7)) {
      add("when", `weekday:${best}`, `${WEEKDAYS[best]}s seem quietly good to you. Nobody knows why. {cat} is investigating.`, 3);
    }
  }
  const clock = timed(lower);
  if (clock.length >= 20) {
    const morning = clock.filter((e) => new Date(e.at).getHours() < 12).length;
    const late = clock.filter((e) => new Date(e.at).getHours() >= 22 || new Date(e.at).getHours() < 4).length;
    if (share(morning, clock.length) >= 0.6) add("when", "clock:morning", "Most of your good things get told before noon. You might secretly be a morning person.", 3);
    else if (share(late, clock.length) >= 0.5) add("when", "clock:night", "Your good things come out late at night. {cat} thinks you're a night cat too.", 3);
  }

  return out.sort((a, b) => b.strength - a.strength);
}

// Finds a new theory if it's time (at most one every few days). Saves it; returns it or null.
export function discoverTheory(today = dayKey()) {
  if (totalThings() < MIN_ENTRIES) return null;
  const last = store.theories.at(-1);
  if (last && daysBetween(last.key, today) < EVERY_DAYS) return null;
  const known = new Set(store.theories.map((t) => t.id));
  const fresh = candidateTheories(allEntries(), today).filter((c) => !known.has(c.id));
  if (!fresh.length) return null;
  // Mix it up: prefer a different kind of theory than the last one.
  const lastKind = last?.id.split(":")[0];
  const pick = fresh.find((c) => c.id.split(":")[0] !== lastKind) ?? fresh[0];
  const theory = { id: pick.id, key: today, text: pick.text };
  store.theories.push(theory);
  return theory;
}

export const theoryText = (theory) => theory.text.replaceAll("{cat}", catName());

// Theories you haven't said "Nope" to (those stay gone, and Mimi never suggests them again).
export const shownTheories = () => store.theories.filter((t) => t.answer !== "no");

// Your answer to a theory: "yes" (you're onto something) or "no" (nope). Saves it; returns what Mimi says.
export function answerTheory(id, answer) {
  const theory = store.theories.find((t) => t.id === id);
  if (!theory) return null;
  Object.assign(theory, { answer, answeredAt: Date.now() });
  store.save("theories");
  return answer === "yes"
    ? ["knew it!", "adds a gold star to the evidence board."]
    : ["oh.", "has made an error. They quietly take it off the evidence board."];
}
export const theoryNumber = (theory) => store.theories.indexOf(theory) + 1;
