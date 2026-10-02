// Mimi's scrapbook: one keepsake page at a time.

import { el } from "../core/dom.js";
import { formatLong } from "../core/dates.js";
import { store, catName, totalThings, photoForEntry } from "../core/store.js";
import { photoThumb } from "./photos.js";
import { CATEGORIES, categorize } from "../memory/insights.js";
import { FIRST_PAGE, pageThresholds } from "../memory/scrapbook.js";

export function wireScrapbook(panel) {
  let index = -1; // -1 = newest page

  function render() {
    const pages = store.scrapbook;
    const name = catName();
    if (!pages.length) {
      const toGo = FIRST_PAGE - totalThings();
      panel.replaceChildren(el("p", { class: "muted", text: `${name} starts a scrapbook at ${FIRST_PAGE} good things. ${toGo} more to go.` }));
      return;
    }

    const i = index < 0 || index >= pages.length ? pages.length - 1 : index;
    const page = pages[i];
    const cat = categorize(page.text)[0];
    const nextAt = pageThresholds(totalThings() + 200).find((t) => t > totalThings());

    // Optional parts are written as `cond && el(...)`; drop the falsy ones.
    panel.replaceChildren(...[
      el("article", { class: "book-page", "aria-label": `Scrapbook page ${i + 1} of ${pages.length}` },
        el("span", { class: "tape", "aria-hidden": "true" }),
        photoForEntry(page.key, page.text) && photoThumb(photoForEntry(page.key, page.text), "photo-thumb taped"),
        cat && el("span", { class: "sticker", text: CATEGORIES[cat].label }),
        el("blockquote", { text: `“${page.text}”` }),
        el("p", { class: "page-date", text: formatLong(page.key) }),
        el("p", { class: "page-note", text: `Picked by ${name} at ${page.at} good things` }),
      ),
      el("div", { class: "book-nav" },
        el("button", { type: "button", class: "icon-button small", "aria-label": "Previous page", disabled: i === 0, text: "‹", onclick: () => { index = i - 1; render(); } }),
        el("span", { class: "muted small", text: `Page ${i + 1} of ${pages.length}` }),
        el("button", { type: "button", class: "icon-button small", "aria-label": "Next page", disabled: i === pages.length - 1, text: "›", onclick: () => { index = i + 1; render(); } }),
      ),
      nextAt && el("p", { class: "muted small center", text: `Next page at ${nextAt} good things.` }),
    ].filter(Boolean));
  }

  store.on(() => {
    index = -1;
    render();
  });
  render();
}
