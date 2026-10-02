// "Your October": a monthly look back at your good things.

import { el, plural } from "../core/dom.js";
import { formatMonth, formatShort } from "../core/dates.js";
import { store, catName } from "../core/store.js";
import { CATEGORIES, monthRecap } from "../memory/insights.js";

// Months that have entries, newest first, as [year, monthIndex].
function monthsWithEntries() {
  const seen = new Set(Object.keys(store.days).map((k) => k.slice(0, 7)));
  return [...seen].sort().reverse().map((ym) => [Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1]);
}

export function wireMonth(panel) {
  let index = 0;

  function render() {
    const months = monthsWithEntries();
    const name = catName();
    if (!months.length) {
      panel.replaceChildren(el("p", { class: "muted", text: "Your first monthly look back appears once you've shared a good thing." }));
      return;
    }
    index = Math.min(index, months.length - 1);
    const [year, month] = months[index];
    const recap = monthRecap(year, month);
    const label = formatMonth(new Date(year, month, 1));

    // Optional parts are written as `cond && el(...)`; drop the falsy ones.
    panel.replaceChildren(...[
      el("div", { class: "panel-row" },
        el("h3", { class: "panel-heading flush", text: `Your ${label}${year !== new Date().getFullYear() ? ` ${year}` : ""}` }),
        el("div", { class: "cal-nav" },
          el("button", { type: "button", class: "icon-button small", "aria-label": "Earlier month", disabled: index === months.length - 1, text: "‹", onclick: () => { index += 1; render(); } }),
          el("button", { type: "button", class: "icon-button small", "aria-label": "Later month", disabled: index === 0, text: "›", onclick: () => { index -= 1; render(); } }),
        ),
      ),
      el("p", { class: "recap-total" },
        el("strong", { text: String(recap.total) }),
        ` little good ${recap.total === 1 ? "thing" : "things"} across ${plural(recap.days, "day")}`,
      ),
      recap.categories.length && el("ul", { class: "recap-list" },
        ...recap.categories.map(([cat, n]) => el("li", {}, el("strong", { text: String(n) }), ` ${n === 1 ? CATEGORIES[cat].one : CATEGORIES[cat].many}`)),
      ),
      recap.topThing && el("p", { text: `You mentioned ${recap.topThing.label} ${recap.topThing.count} times.` }),
      el("figure", { class: "favorite" },
        el("figcaption", { text: `${name}'s favorite memory` }),
        el("blockquote", { text: `“${recap.favorite.text}”` }),
        el("p", { class: "muted small", text: formatShort(recap.favorite.key) }),
      ),
    ].filter(Boolean));
  }

  store.on(render);
  render();
}
