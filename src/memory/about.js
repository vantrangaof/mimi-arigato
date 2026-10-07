// Memory pages: everything Mimi remembers about one person, place or thing from your life
// (a room object's theme). Pure logic; ui/about.js shows it.

import { allEntries, tagsFor, catName } from "../core/store.js";
import { capitalize } from "../core/dom.js";
import { knownNames, peopleIn } from "./insights.js";
import { themeById, themesIn } from "./themes.js";
import { shownTheories } from "./theories.js";

const TOP = 3;
const lower = (s) => s.toLowerCase();

// Places Mimi's AI found, by how many good things mention them: [{ name, n }], most first.
export function knownPlaces(entries = allEntries()) {
  const names = new Map();
  for (const e of entries) for (const place of tagsFor(e.text)?.places ?? []) if (!names.has(lower(place))) names.set(lower(place), place);
  return [...names.values()]
    .map((name) => ({ name, n: entries.filter((e) => mentionsPlace(e.text, name)).length }))
    .sort((a, b) => b.n - a.n);
}

// People in your good things: [{ name, n }], most first.
export function knownPeople(entries = allEntries()) {
  const known = knownNames(entries);
  const counts = new Map();
  for (const e of entries) for (const who of new Set(peopleIn(e.text, known))) counts.set(who, (counts.get(who) ?? 0) + 1);
  return [...counts].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
}

// Does a good thing mention this place? Its AI tags say so, or (if it wasn't tagged) the name is in it.
function mentionsPlace(text, place) {
  const tagged = tagsFor(text);
  if (tagged) return tagged.places.some((p) => lower(p) === lower(place));
  const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "iu").test(text);
}

const top = (counts, skip) => [...counts].filter(([k]) => k !== skip).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k]) => k);
const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

// subject: { kind: "theme" | "person" | "place", id }. Returns null if nothing mentions it.
// { title, about, entries (newest first), first, people, places, things, theories }
export function aboutSubject({ kind, id }, entries = allEntries()) {
  const theme = kind === "theme" ? themeById(id) : null;
  if (kind === "theme" && !theme) return null;
  const known = knownNames(entries);
  const matches = entries.filter((e) => kind === "theme" ? themesIn(e.text).includes(theme)
    : kind === "person" ? peopleIn(e.text, known).includes(id)
    : mentionsPlace(e.text, id));
  if (!matches.length) return null;

  const people = new Map();
  const places = new Map();
  const things = new Map();
  for (const e of matches) {
    for (const who of new Set(peopleIn(e.text, known))) bump(people, who);
    for (const p of new Set(tagsFor(e.text)?.places ?? [])) bump(places, p);
    for (const t of themesIn(e.text)) bump(things, t.about);
  }

  // Theories that are about this subject (their ids name it: "with:Anna:coffee", "pair:coffee+rain").
  const theories = shownTheories().filter((t) => t.id.split(/[:+]/).slice(1)
    .some((part) => kind === "place" ? lower(part) === lower(id) : part === id));

  return {
    title: theme ? capitalize(theme.thing) : id,
    about: theme ? theme.about : id,
    entries: [...matches].reverse(),
    first: matches[0].key,
    people: top(people, kind === "person" ? id : null),
    places: top(new Map([...places].filter(([p]) => kind !== "place" || lower(p) !== lower(id)))),
    things: top(things, theme?.about),
    theories,
  };
}

// Mimi's one-line summary at the top of a page.
export function aboutLine({ kind }, info) {
  const n = info.entries.length;
  const cat = catName();
  if (kind === "person") {
    return n >= 8 ? `${cat} thinks ${info.about} might secretly be a happiness delivery service.`
      : n >= 3 ? `${cat} thinks ${info.about} is important.`
      : `${cat} would like to hear more about ${info.about}.`;
  }
  if (kind === "place") {
    return n >= 5 ? `${cat} is starting to think ${info.about} is one of your places.`
      : `${cat} has never been to ${info.about}, but likes hearing about it.`;
  }
  return n >= 10 ? `${capitalize(info.about)} is clearly a big part of your life. ${cat} has noticed.`
    : `${cat} keeps track of ${info.about} for you.`;
}
