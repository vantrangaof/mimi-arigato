// Memories: Mimi's theories, what Mimi has learned, and the Memory cabinet: drawers of
// entries Mimi sorted on their own, treasures, and wishes.

import { el } from "../core/dom.js";
import { dayKey, daysBetween, formatShortYear } from "../core/dates.js";
import { store, catName, totalThings } from "../core/store.js";
import { CATEGORIES, learnedFacts, shelves } from "../memory/insights.js";
import { TREASURES } from "../world/world.js";
import { theoryText } from "../memory/theories.js";
import { openWishes, wishesCameTrue } from "../memory/wishes.js";

function theoryCards(name) {
  if (!store.theories.length) return null;
  const today = dayKey();
  const cards = store.theories.map((t, i) => el("li", { class: `theory${daysBetween(t.key, today) < 3 ? " is-new" : ""}` },
    el("div", { class: "theory-head" },
      el("span", { class: "theory-number", text: `${name}'s theory #${i + 1}` }),
      el("span", { class: "entry-date", text: formatShortYear(t.key) }),
    ),
    el("span", { text: theoryText(t) }),
  )).reverse();
  return el("ol", { class: "theories" }, ...cards);
}

const DRAWER_LIMIT = 30;

function drawer(label, items) {
  return el("details", { class: "drawer" },
    el("summary", {}, el("span", { text: label }), el("span", { class: "count", text: String(items.length) })),
    el("ul", {}, ...items.slice(0, DRAWER_LIMIT).map((item) => el("li", {},
      el("span", { class: "entry-date", text: formatShortYear(item.key) }),
      el("span", { text: item.text }),
    ))),
  );
}

export function wireMemories(panel) {
  function render() {
    const name = catName();
    if (totalThings() === 0) {
      panel.replaceChildren(el("p", { class: "muted", text: `${name} remembers everything you share. Tell them a good thing to start.` }));
      return;
    }

    const facts = learnedFacts();
    const learned = facts.length
      ? el("ul", { class: "facts" }, ...facts.map((f) => el("li", { text: f })))
      : el("p", { class: "muted", text: `${name} is still getting to know you. Patterns show up after a few days of good things.` });

    const sorted = shelves();
    const drawers = Object.entries(CATEGORIES)
      .filter(([id]) => sorted[id].length)
      .map(([id, c]) => drawer(c.label, sorted[id]));
    const wishes = openWishes();
    if (wishes.length) drawers.push(drawer("Wishes in the jar", [...wishes].reverse().map((w) => ({ key: w.key, text: w.what }))));
    const cameTrue = wishesCameTrue();
    if (cameTrue.length) {
      drawers.push(drawer("Wishes that came true", [...cameTrue].reverse()
        .map((w) => ({ key: w.done.key, text: `${w.what} (wished on ${formatShortYear(w.key)})` }))));
    }
    if (store.treasures.length) {
      drawers.push(drawer(`Treasures ${name} found`, store.treasures
        .map((t) => ({ key: t.key, text: TREASURES[t.id]?.label ?? t.id }))
        .reverse()));
    }

    const theories = theoryCards(name);
    panel.replaceChildren(
      el("h3", { class: "panel-heading", text: `${name}'s theories` }),
      theories ?? el("p", { class: "muted", text: `${name} is quietly working on some theories about you. They take a little while.` }),
      el("h3", { class: "panel-heading", text: `What ${name} has learned` }),
      learned,
      el("h3", { class: "panel-heading", text: "Memory cabinet" }),
      el("p", { class: "muted small", text: `${name} sorts your good things into drawers by themselves.` }),
      el("div", { class: "drawers" }, ...drawers),
    );
  }
  store.on(render);
  render();
}
