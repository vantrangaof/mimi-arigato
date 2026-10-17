// Today's challenge: one small thing to go and do, the same one on every device. Most are
// photos ("Take photos of 3 different cats"), which Mimi's AI looks at when you're signed in
// (honor system otherwise). Finishing it earns a treat bag: one fish, one water and one cuddle.

import { KEYS, read, write, dailyCount, setDailyCount, entriesToday } from "../core/store.js";
import { dayKey } from "../core/dates.js";
import { hash } from "./insights.js";

const STATE = "challenge"; // { day, found: [photo ids], seen: [fingerprints] } on this device

// text: (cat name) → what to do. look: what the photo must show (LOOK_FOR in api/mimi.mjs).
export const CHALLENGES = [
  { id: "three-cats", text: () => "Take photos of 3 different cats", count: 3, look: "cat" },
  { id: "silly-cat", text: (n) => `Catch ${n} being silly on camera`, count: 1, look: "cat" },
  { id: "cat-selfie", text: (n) => `Take a selfie with ${n}`, count: 1, look: "person-and-cat" },
  { id: "sleepy-cat", text: (n) => `Take 2 photos of ${n} napping`, count: 2, look: "cat" },
  { id: "two-cats", text: () => "Find 2 cats you've never met", count: 2, look: "cat" },
  { id: "sky", text: () => "Look up! Take a photo of the sky", count: 1, look: "sky" },
  { id: "flowers", text: () => "Find 2 flowers", count: 2, look: "flower" },
  { id: "snack", text: () => "Photograph something delicious", count: 1, look: "food" },
  { id: "pink", text: () => "Find 3 pink things", count: 3, look: "pink" },
  { id: "round", text: () => "Find 3 round things", count: 3, look: "round" },
  { id: "dog", text: (n) => `Spot a dog (${n} is curious)`, count: 1, look: "dog" },
  { id: "tree", text: () => "Say hi to a tree", count: 1, look: "tree" },
  { id: "cozy", text: (n) => `Show ${n} your coziest spot`, count: 1, look: "cozy" },
  { id: "outside", text: () => "What's outside your window?", count: 1, look: "outside" },
  { id: "shoes", text: (n) => `Show ${n} your shoes (${n} wants to sniff them)`, count: 1, look: "shoes" },
  { id: "book", text: (n) => `Show ${n} a book you like`, count: 1, look: "book" },
  { id: "mug", text: () => "Photograph your favorite mug", count: 1, look: "mug" },
  { id: "three-good", text: (n) => `Tell ${n} 3 good things today`, count: 3, goodThings: true },
];

export function todaysChallenge(day = dayKey()) {
  return CHALLENGES[hash(`challenge-${day}`) % CHALLENGES.length];
}

function state() {
  const s = read(STATE, null);
  return s && s.day === dayKey() ? s : { day: dayKey(), found: [], seen: [] };
}

// How many done of today's challenge.
export function challengeProgress(c = todaysChallenge()) {
  const done = c.goodThings ? entriesToday().length : state().found.length;
  return Math.min(done, c.count);
}

export const challengeComplete = (c = todaysChallenge()) => challengeProgress(c) >= c.count;

// The treat bag was given today (see ui/play.js: one more fish, water and cuddle to give).
export const challengeRewarded = () => dailyCount(KEYS.challengeBonus) > 0;
export const rewardChallenge = () => setDailyCount(KEYS.challengeBonus, 1);

export const foundToday = () => state().found;

export const alreadySeen = (fingerprint) => state().seen.includes(fingerprint);

export function markFound(photoId, fingerprint) {
  const s = state();
  write(STATE, { ...s, found: [...s.found, photoId], seen: [...s.seen, fingerprint] });
}

export function markSeen(fingerprint) {
  const s = state();
  write(STATE, { ...s, seen: [...s.seen, fingerprint] });
}
