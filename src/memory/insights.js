// How Mimi "understands" entries, entirely on-device: keyword rules for reactions and
// categories, plus pattern finding (favorite things, people) across everything written.

import { store, allEntries, catName } from "../core/store.js";
import { formatShort } from "../core/dates.js";

export const CATEGORIES = {
  people: { label: "People", one: "people moment", many: "people moments" },
  food: { label: "Food", one: "food moment", many: "food moments" },
  proud: { label: "Things you were proud of", one: "thing you were proud of", many: "things you were proud of" },
  laugh: { label: "Things that made you laugh", one: "thing that made you laugh", many: "things that made you laugh" },
  beauty: { label: "Beautiful moments", one: "beautiful moment", many: "beautiful moments" },
  kindness: { label: "Kindness", one: "kind moment", many: "kind moments" },
  rest: { label: "Rest", one: "restful moment", many: "restful moments" },
  move: { label: "Moving your body", one: "time you moved your body", many: "times you moved your body" },
  hard: { label: "Hard days you got through", one: "hard day you got through", many: "hard days you got through" },
  tiny: { label: "Little things", one: "tiny thing", many: "tiny things" },
};

// First matching rule decides Mimi's reaction: [bubble, status line]. Order matters.
const RULES = [
  { re: /\b(surviv\w*|hard day|difficult|tough|rough|exhausted|stress\w*|anxious|anxiety|sad|cried|sick|lonely)\b/, say: ["♡", "says that counts too."], cat: "hard" },
  { re: /\b(tax(es)?|paperwork|bills?|invoices?)\b/, say: ["?!", "doesn't understand taxes, but is proud of you."], cat: "proud" },
  { re: /\b(finish(ed)?|finally|did it|passed|shipped|complete(d)?|won|achiev\w*|proud|promot\w*|got the job|accomplish\w*)\b/, say: ["you did it!", "is so proud of you."], cat: "proud" },
  { re: /\b(bought me|gave me|helped me|made me|surprised me|kind(ness)?|hug(ged|s)?|gifts?|thanked|compliment\w*|treated me)\b/, say: ["aww", "loves a little kindness."], cat: "kindness" },
  { re: /\b(fish|salmon|tuna|sushi)\b/, say: ["fish?!", "perks up at the word fish."], cat: "food" },
  { re: /\b(cats?|kitten|kitty)\b/, say: ["nya!", "thinks that's an excellent choice of topic."], cat: "tiny" },
  { re: /\b(dogs?|puppy)\b/, say: ["…", "will allow it."], cat: "tiny" },
  { re: /\b(coffee|latte|espresso|cappuccino|americano)\b/, say: ["mrrp!", "approves."], cat: "food" },
  { re: /\b(tea|matcha|boba)\b/, say: ["sip~", "would like a sip."], cat: "food" },
  { re: /\b(sleep|slept|nap(ped)?|rest(ed)?|lie-in|bed)\b/, say: ["zzz~", "says rest is important."], cat: "rest" },
  { re: /\b(laugh\w*|funny|jokes?|lol|haha\w*|giggl\w*)\b/, say: ["hehe", "is giggling too."], cat: "laugh" },
  { re: /\b(friends?|bestie|buddy)\b/, say: ["♡", "is glad someone made your day."], cat: "people" },
  { re: /\b(mom|mum|mother|dad|father|sister|brother|grandma|grandpa|grandmother|grandfather|family|parents|son|daughter|wife|husband|partner|boyfriend|girlfriend|aunt|uncle|cousin)\b/, say: ["♡", "thinks that sounds special."], cat: "people" },
  { re: /\b(rain\w*|storm|thunder)\b/, say: ["pitter~", "likes rainy windows too."], cat: "beauty" },
  { re: /\b(sunset|sunrise|sky|stars?|moon|flowers?|beautiful|pretty|rainbow|ocean|sea|beach|snow|autumn|leaves|view)\b/, say: ["oooh", "is glad you noticed something beautiful."], cat: "beauty" },
  { re: /\b(pho|noodles?|ramen|pizza|cake|ice cream|dinner|lunch|breakfast|brunch|delicious|tasty|yummy|ate|cook(ed|ing)?|food|rice|bread|soup|mango|chocolate|snacks?|dessert|banh mi|dumplings?|burger|pasta|fruit)\b/, say: ["nom!", "is hungry now."], cat: "food" },
  { re: /\b(walk\w*|run|ran|gym|yoga|bike|biked|hike|hiked|swim\w*|exercis\w*|workout|park|danc\w*)\b/, say: ["prrr", "says that's good for your body and your heart."], cat: "move" },
  { re: /\b(music|songs?|concert|sang|sing\w*|playlist)\b/, say: ["la la~", "is humming along."], cat: "tiny" },
  { re: /\b(books?|read|reading|novel)\b/, say: ["…", "loves a good book too."], cat: "tiny" },
  { re: /\b(work|meeting|project|client|office|boss|deadline|presentation|code|coding|bug)\b/, say: ["mrr", "admires such a hardworking human."], cat: null },
];

const TINY_LENGTH = 30;
const FALLBACKS = [
  ["arigato!", "loves hearing that."],
  ["nya!", "is smiling with you."],
  ["mrrp~", "tucks that one away."],
  ["purr~", "thinks that's lovely."],
];

// Favorite things Mimi can learn about when they come up often.
const FAVORITES = [
  { re: /\b(coffee|latte|espresso|cappuccino)\b/, label: "coffee", fact: "thinks you really like coffee." },
  { re: /\b(tea|matcha|boba)\b/, label: "tea", fact: "noticed tea keeps showing up." },
  { re: /\b(rain\w*)\b/, label: "rainy days", fact: "remembers… you like rainy days." },
  { re: /\b(sunset|sunrise|sky)\b/, label: "the sky", fact: "noticed you look at the sky a lot." },
  { re: /\b(pho|noodles?|ramen)\b/, label: "noodles", fact: "knows noodles make you happy." },
  { re: /\b(cats?|kitten)\b/, label: "cats", fact: "is flattered you talk about cats so much." },
  { re: /\b(walk\w*)\b/, label: "walks", fact: "thinks walks make you happy." },
  { re: /\b(sleep|slept|nap)\b/, label: "good sleep", fact: "knows good sleep matters to you." },
  { re: /\b(music|songs?|concert)\b/, label: "music", fact: "hears music in a lot of your good days." },
  { re: /\b(books?|reading)\b/, label: "books", fact: "knows you love a good book." },
  { re: /\b(cook(ed|ing)?|baked?)\b/, label: "cooking", fact: "thinks you enjoy cooking." },
  { re: /\b(friends?)\b/, label: "your friends", fact: "notices your friends show up a lot." },
];

const FAMILY = { mom: /\b(mom|mum|mother)\b/, dad: /\b(dad|father)\b/, sister: /\bsister\b/, brother: /\bbrother\b/, grandma: /\b(grandma|grandmother)\b/, grandpa: /\b(grandpa|grandfather)\b/, partner: /\b(partner|wife|husband|boyfriend|girlfriend)\b/ };

const NOT_NAMES = new Set([
  "I", "I'm", "I've", "I'd", "I'll", "OK", "TV", "The", "A", "An", "My", "We", "It", "This", "That", "And", "But", "So", "Then",
  "Today", "Tonight", "Yesterday", "Tomorrow", "Christmas", "Mimi", "God", "English",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
]);

const lower = (t) => t.toLowerCase();

export function categorize(text) {
  const t = lower(text);
  const cats = new Set(RULES.filter((r) => r.cat && r.re.test(t)).map((r) => r.cat));
  if (namesIn(text).length) cats.add("people");
  if (!cats.size && text.length <= TINY_LENGTH) cats.add("tiny");
  return [...cats];
}

export function reactionFor(text, n) {
  const t = lower(text);
  const rule = RULES.find((r) => r.re.test(t));
  if (rule) return rule.say;
  if (text.length <= TINY_LENGTH) return ["small & good", "loves tiny good things."];
  return FALLBACKS[(n - 1) % FALLBACKS.length];
}

// Capitalized words that aren't sentence starts are probably names (works best in English).
export function namesIn(text) {
  const words = text.match(/\p{L}[\p{L}'’-]*/gu) ?? [];
  return words.slice(1)
    .map((w) => w.replace(/['’]s$/u, ""))
    .filter((w) => /^\p{Lu}\p{Ll}+$/u.test(w) && !NOT_NAMES.has(w) && w !== catName());
}

// Names in a good thing, including a first word that shows up as a name in other entries
// ("Anna made me laugh"). Pass known = knownNames() when checking many entries.
export const knownNames = (entries = allEntries()) => new Set(entries.flatMap((e) => namesIn(e.text)));
export function peopleIn(text, known = knownNames()) {
  const first = text.match(/^\p{Lu}\p{Ll}+/u)?.[0];
  const names = namesIn(text);
  return first && known.has(first) && !names.includes(first) ? [first, ...names] : names;
}

const FAMILY_TITLES = { mom: "Mom", dad: "Dad", sister: "Sis", brother: "Bro", grandma: "Grandma", grandpa: "Grandpa" };

// Who a good thing could be a thank-you to: a name in it, or a family member. "" if no one.
// A first word counts as a name only if it shows up as a name in other entries ("Lin called").
export function thankee(text) {
  const name = namesIn(text)[0];
  if (name) return name;
  const first = text.match(/^\p{Lu}\p{Ll}+/u)?.[0];
  if (first && !NOT_NAMES.has(first) && allEntries().some((e) => namesIn(e.text).includes(first))) return first;
  const t = lower(text);
  const family = Object.keys(FAMILY_TITLES).find((who) => FAMILY[who].test(t));
  return family ? FAMILY_TITLES[family] : "";
}

const countEntries = (entries, test) => entries.filter((e) => test(e.text)).length;

export function topFavorite(entries = allEntries()) {
  return FAVORITES
    .map((f) => ({ ...f, count: countEntries(entries, (t) => f.re.test(lower(t))) }))
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count)[0] ?? null;
}

// Sentences about what Mimi has picked up from your entries.
export function learnedFacts(entries = allEntries()) {
  const name = catName();
  const facts = [];

  for (const f of FAVORITES) {
    const n = countEntries(entries, (t) => f.re.test(lower(t)));
    if (n >= 3) facts.push({ n, text: `${name} ${f.fact}` });
  }

  const people = new Map();
  const known = knownNames(entries);
  for (const e of entries) for (const who of new Set(peopleIn(e.text, known))) people.set(who, (people.get(who) ?? 0) + 1);
  for (const [who, n] of people) {
    if (n >= 2) facts.push({ n: n + 0.5, text: `You talked about ${who} ${n} times. ${name} knows ${who} must be important.` });
  }

  for (const [who, re] of Object.entries(FAMILY)) {
    const n = countEntries(entries, (t) => re.test(lower(t)));
    if (n >= 2) facts.push({ n, text: `Your ${who} came up ${n} times. That sounds special.` });
  }

  const beauty = entries.filter((e) => categorize(e.text).includes("beauty")).length;
  if (beauty >= 3) facts.push({ n: beauty, text: `You've noticed ${beauty} beautiful moments. ${name} likes that about you.` });
  const hard = entries.filter((e) => categorize(e.text).includes("hard")).length;
  if (hard >= 2) facts.push({ n: hard, text: `You found something good on ${hard} hard days. That takes heart.` });

  return facts.sort((a, b) => b.n - a.n).slice(0, 6).map((f) => f.text);
}

export function shelves(entries = allEntries()) {
  const out = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, []]));
  for (const e of [...entries].reverse()) for (const cat of categorize(e.text)) out[cat].push(e);
  return out;
}

export function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export const FAVORITE_CATS = ["beauty", "kindness", "proud", "laugh", "people"];

export function monthRecap(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const entries = allEntries().filter((e) => e.key.startsWith(prefix));
  if (!entries.length) return null;

  const counts = {};
  for (const e of entries) for (const cat of categorize(e.text)) counts[cat] = (counts[cat] ?? 0) + 1;
  const special = entries.filter((e) => categorize(e.text).some((c) => FAVORITE_CATS.includes(c)));
  const pool = special.length ? special : entries;

  return {
    total: entries.length,
    days: new Set(entries.map((e) => e.key)).size,
    categories: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topThing: topFavorite(entries),
    favorite: pool[hash(prefix) % pool.length],
  };
}

const words = (t) => new Set(lower(t).match(/\p{L}+/gu) ?? []);

// An earlier entry (before today) that says nearly the same thing.
export function echoOf(text, todayKey) {
  const a = words(text);
  if (a.size < 2) return null;
  for (const e of allEntries()) {
    if (e.key >= todayKey) break;
    const b = words(e.text);
    const shared = [...a].filter((w) => b.has(w)).length;
    if (shared / new Set([...a, ...b]).size >= 0.6) return e;
  }
  return null;
}

export const echoLine = (e) => `remembers you wrote about this on ${formatShort(e.key)} too.`;

// Mimi's scrapbook prefers warm moments and never picks the same entry twice.
export function pickKeepsake() {
  const taken = new Set(store.scrapbook.map((p) => `${p.key}|${p.text}`));
  const fresh = allEntries().filter((e) => !taken.has(`${e.key}|${e.text}`));
  const warm = fresh.filter((e) => categorize(e.text).some((c) => FAVORITE_CATS.includes(c)));
  const pool = warm.length ? warm : fresh;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
