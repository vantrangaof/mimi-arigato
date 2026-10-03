// "One year ago today": a small card at the top of the journal with what you told Mimi on
// this date in earlier years, and what Mimi makes of it.

import { el } from "../core/dom.js";
import { dayKey, formatShortYear } from "../core/dates.js";
import { store, catName, read, write, photoForEntry } from "../core/store.js";
import { onThisDay, agoLabel, yearAgoRemark } from "../memory/year-ago.js";
import { photoThumb } from "./photos.js";

const GREETED = "yearAgoGreeted";

// A greeting for opening the app on a day with a memory (once per day), or null.
export function yearAgoGreeting(today = dayKey()) {
  const found = onThisDay(today)[0];
  if (!found || read(GREETED, null) === today) return null;
  write(GREETED, today);
  const when = found.years === 1 ? "one year ago today" : `${found.years} years ago today`;
  return ["remember?", `found something from ${when}. It's by the journal.`, { hearts: 2, hold: 3400 }];
}

export function wireYearAgo(card) {
  function render() {
    const today = dayKey();
    const found = onThisDay(today);
    card.hidden = !found.length;
    if (!found.length) return;
    card.replaceChildren(...found.map((year) => el("figure", { class: "year-ago-year" },
      el("figcaption", {},
        el("span", { class: "year-ago-label", text: agoLabel(year.years) }),
        el("span", { class: "entry-date", text: formatShortYear(year.key) }),
      ),
      el("ul", { class: "year-ago-list" }, ...year.entries.map((e) => {
        const photo = photoForEntry(e.key, e.text);
        return el("li", {}, photo && photoThumb(photo, "photo-thumb small"), el("span", { text: e.text }));
      })),
      el("p", { class: "year-ago-remark", text: `${catName()}: “${yearAgoRemark(year, today)}”` }),
    )));
  }
  store.on(render);
  render();
  setInterval(render, 10 * 60_000); // a new day may have started
}
