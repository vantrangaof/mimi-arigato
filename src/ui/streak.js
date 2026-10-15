// This week's paw prints, under "Tell Mimi something good" (see memory/streak.js).
// Missed days show as naps; the line underneath only counts paw prints.

import { el, plural } from "../core/dom.js";
import { formatWeekdayNarrow, formatLong, dayKey } from "../core/dates.js";
import { pixelSVG } from "../core/pixel.js";
import { store, catName, read, write } from "../core/store.js";
import { pawWeek, runMilestone, NAPS_PER_WEEK } from "../memory/streak.js";

const PAW = [".o.o.", "o...o", ".ooo.", "ooooo", ".ooo."];
const SAID = "runSaid"; // the last run milestone Mimi cheered: "YYYY-MM-DD:7"

const TITLES = {
  paw: "a paw print",
  nap: "Mimi napped",
  today: "no paw print yet today",
  later: "",
  before: "",
};

function line({ thisWeek, run, longest, thisMonth }) {
  if (!thisMonth && !run) return `Tell ${catName()} something good to leave your first paw print.`;
  const parts = [`${plural(thisWeek, "paw print")} this week`];
  if (run >= 2) parts.push(`a ${run}-day run`);
  if (longest > run && longest >= 2) parts.push(`longest ${longest}`);
  return parts.join(" · ");
}

export function wireStreak(box, mimi) {
  const render = () => {
    const today = dayKey();
    const info = pawWeek(today);
    box.replaceChildren(
      el("ol", { class: "paw-days" }, ...info.week.map((d) => el("li", {
        class: `paw-day is-${d.state}`,
        title: `${formatLong(d.key)}${TITLES[d.state] ? `: ${TITLES[d.state].replace("Mimi", catName())}` : ""}`,
      },
        el("span", { class: "paw-day-name", text: formatWeekdayNarrow(d.key), "aria-hidden": "true" }),
        el("span", { class: "paw-mark", "aria-hidden": "true" }, d.state === "paw" ? pixelSVG(PAW, { o: "currentColor" }) : d.state === "nap" ? "z" : ""),
        el("span", { class: "visually-hidden", text: `${formatLong(d.key)}: ${d.state === "paw" ? "paw print" : d.state === "nap" ? "nap" : d.state === "today" ? "not yet" : "—"}` }),
      ))),
      el("p", { class: "paw-line muted small", text: line(info), title: `${plural(info.thisMonth, "paw print")} this month. A run keeps going through up to ${NAPS_PER_WEEK} naps a week.` }),
    );

    // Cheer each run milestone once, the day it's reached.
    const milestone = runMilestone(today);
    const key = `${today}:${milestone}`;
    if (milestone && read(SAID, null) !== key) {
      write(SAID, key);
      mimi.later([[`${milestone} days!`, `is so happy: that's a ${milestone}-day run of paw prints. ♡`, { hearts: 4, hold: 3400 }]]);
    }
  };
  store.on(render);
  render();
  setInterval(render, 10 * 60_000); // a new day starts at midnight
}
