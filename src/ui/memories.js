// Memory Cabinet: what Mimi has learned, and drawers of entries Mimi sorted on their own.

import { el } from "../core/dom.js";
import { formatShortYear } from "../core/dates.js";
import { store, catName, totalThings } from "../core/store.js";
import { CATEGORIES, learnedFacts, shelves } from "../memory/insights.js";
import { TREASURES } from "../world/world.js";

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
    if (store.treasures.length) {
      drawers.push(drawer(`Treasures ${name} found`, store.treasures
        .map((t) => ({ key: t.key, text: TREASURES[t.id]?.label ?? t.id }))
        .reverse()));
    }

    panel.replaceChildren(
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
