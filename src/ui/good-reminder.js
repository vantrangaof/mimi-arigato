// A good thing to remember: every time you open the app (or come back to it after a while),
// Mimi brings back one of your past good things in a little pop-up. A memory from this day in an
// earlier year comes first; otherwise one from the jar, not the same as last time.

import { el, pick } from "../core/dom.js";
import { dayKey, daysBetween, formatShortYear } from "../core/dates.js";
import { allEntries, entriesToday, catName, read, write, photoForEntry } from "../core/store.js";
import { onThisDay, agoLabel, yearAgoRemark } from "../memory/year-ago.js";
import { photoThumb } from "./photos.js";

const LAST = "goodReminderLast";
const AWAY_MS = 30 * 60_000; // coming back to the app after this long counts as landing again

const AGO = (key) => {
  const days = daysBetween(key, dayKey());
  if (key.slice(4) === dayKey().slice(4)) return agoLabel(Math.round(days / 365)).toLowerCase();
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "a week ago";
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `on ${formatShortYear(key)}`;
};

// One past good thing (never today's): { entry, line }, or null when there's nothing yet.
function choose(skip) {
  const today = dayKey();
  const year = onThisDay(today)[0];
  if (year && !year.entries.some((e) => `${e.key}|${e.text}` === skip)) {
    return { entry: pick(year.entries), line: yearAgoRemark(year, today) };
  }
  const past = allEntries().filter((e) => e.key < today);
  const pool = past.filter((e) => `${e.key}|${e.text}` !== skip);
  const entry = pick(pool.length ? pool : past);
  if (!entry) return null;
  return { entry, line: pick(["Still a good thing.", "Mimi kept this one safe.", "Remember this?", "This one made Mimi purr."]) };
}

export function wireGoodReminder({ dialog, body, another, tell, input }) {
  let current = null;
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  function render() {
    const name = catName();
    const { entry, line } = current;
    const photo = photoForEntry(entry.key, entry.text);
    body.replaceChildren(
      el("p", { class: "good-reminder-when", text: `You told ${name} this ${AGO(entry.key)}` }),
      el("blockquote", { class: "good-reminder-text" }, photo && photoThumb(photo, "photo-thumb"), el("span", { text: `“${entry.text}”` })),
      el("p", { class: "good-reminder-mimi", text: `${name}: “${line.replaceAll("Mimi", name)}”` }),
    );
    tell.hidden = entriesToday().length > 0;
    tell.textContent = `Tell ${name} about today`;
  }

  function show() {
    const skip = read(LAST, null);
    current = choose(skip);
    if (!current) return false;
    write(LAST, `${current.entry.key}|${current.entry.text}`);
    render();
    if (!dialog.open) dialog.showModal();
    return true;
  }

  another.addEventListener("click", () => {
    const next = choose(`${current.entry.key}|${current.entry.text}`);
    if (!next) return;
    current = next;
    write(LAST, `${current.entry.key}|${current.entry.text}`);
    render();
  });

  tell.addEventListener("click", () => {
    dialog.close();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  });

  // Coming back to the app (a Home Screen app resumes instead of reloading) after a while.
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS && !document.querySelector("dialog[open]")) show();
  });

  return { show };
}
