// Diary: one private page per day with an optional mood weather. Mimi keeps you company
// while you write (a small sleeping Mimi on the page) but never reads or reacts to it.

import { el } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { dayKey, formatLong, formatShortYear } from "../core/dates.js";
import { store, catName, diaryPage, diaryPages, saveDiaryPage, MOODS, DIARY_MAX } from "../core/store.js";
import { renderCat, applyLook, FURS } from "../cat/sprite.js";
import { currentWear } from "./habitat.js";

const SAVE_DELAY_MS = 700;

const MOOD_ART = {
  sunny: {
    label: "Sunny",
    rows: ["y..y..y", ".yyyyy.", ".yYYYy.", "yyYYYyy", ".yYYYy.", ".yyyyy.", "y..y..y"],
    colors: { y: "#e8962c", Y: "#ffd45e" },
  },
  cloudy: {
    label: "Cloudy",
    rows: [".......", "..ccc..", ".cCCCc.", "cCCCCCc", "cCCCCCc", ".ccccc.", "......."],
    colors: { c: "#8d8aa6", C: "#e6e4f0" },
  },
  rainy: {
    label: "Rainy",
    rows: ["..ccc..", ".cCCCc.", "cCCCCCc", ".ccccc.", ".b.b.b.", "b.b.b..", "......."],
    colors: { c: "#7a86a6", C: "#d3dbea", b: "#5b8fc9" },
  },
  stormy: {
    label: "Stormy",
    rows: ["..ddd..", ".dDDDd.", "dDDDDDd", ".ddzdd.", "...zz..", "..zz...", "...z..."],
    colors: { d: "#4c455c", D: "#857f97", z: "#ffc93c" },
  },
};

export const moodLabel = (mood) => MOOD_ART[mood]?.label ?? "";
export const moodIcon = (mood, className = "mood-icon") => pixelSVG(MOOD_ART[mood].rows, MOOD_ART[mood].colors, className);

let openDay = null; // set by wireDiary; lets the calendar open a page

export function openDiaryPage(day) {
  openDay?.(day);
}

const snippet = (text) => text.trim().split("\n").find((line) => line.trim())?.trim() ?? "";

export function wireDiary(mimi, { panel, tab }) {
  let day = dayKey();
  let loadedAt = -1; // updatedAt of the page currently in the editor
  let saveTimer;
  let twitchTimer;

  const heading = el("h3", { class: "panel-heading flush" });
  const today = el("button", { type: "button", class: "link-button", text: "Back to today", onclick: () => show(dayKey()) });
  const date = el("p", { class: "muted small diary-date" });

  const moodButtons = MOODS.map((mood) => el("button", {
    type: "button",
    class: "mood",
    "aria-pressed": "false",
    title: moodLabel(mood),
    onclick: () => {
      flush();
      const next = diaryPage(day).mood === mood ? null : mood;
      loadedAt = saveDiaryPage(day, { mood: next }).updatedAt;
      renderMoods(next);
    },
  }, moodIcon(mood), el("span", { text: moodLabel(mood) })));
  const moods = el("div", { class: "moods", role: "group", "aria-label": "How did the day feel?" }, ...moodButtons);

  const text = el("textarea", {
    class: "diary-text",
    id: "diaryText",
    maxlength: DIARY_MAX,
    rows: 8,
    spellcheck: "true",
  });
  const label = el("label", { class: "visually-hidden", for: "diaryText" });
  const status = el("p", { class: "muted small diary-status", "aria-live": "polite" });

  const catSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  catSvg.setAttribute("class", "cat");
  catSvg.setAttribute("viewBox", "0 0 32 29");
  catSvg.setAttribute("shape-rendering", "crispEdges");
  catSvg.setAttribute("aria-hidden", "true");
  renderCat(catSvg);
  const cat = el("div", { class: "diary-cat is-asleep" }, catSvg);

  const sheet = el("div", { class: "diary-sheet" }, label, text, cat);
  const pastHeading = el("h3", { class: "panel-heading", text: "Past pages" });
  const past = el("ul", { class: "diary-list" });
  const empty = el("p", { class: "muted small" });

  panel.replaceChildren(
    el("div", { class: "panel-row" }, heading, today),
    date,
    moods,
    sheet,
    status,
    pastHeading,
    past,
    empty,
  );

  function renderMoods(current) {
    moodButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(MOODS[i] === current)));
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (text.value === diaryPage(day).text) {
      status.textContent = "";
      return;
    }
    loadedAt = saveDiaryPage(day, { text: text.value }).updatedAt;
    status.textContent = "Saved.";
  }

  // Saves right away if there's a pending change (before switching pages or leaving).
  function flush() {
    if (saveTimer) save();
  }

  function load() {
    const page = diaryPage(day);
    const isToday = day === dayKey();
    heading.textContent = isToday ? "Today's page" : "A past page";
    date.textContent = `${formatLong(day)}. Just for you; ${catName()} won't read it.`;
    today.hidden = isToday;
    label.textContent = `Diary page for ${formatLong(day)}`;
    text.placeholder = isToday ? "What happened today? What's on your mind?" : "Nothing written this day.";
    text.value = page.text;
    renderMoods(page.mood);
    loadedAt = page.updatedAt;
    status.textContent = "";
  }

  function renderPast() {
    const pages = diaryPages().filter((p) => p.day !== day);
    past.replaceChildren(...pages.slice(0, 60).map((p) => el("li", {},
      el("button", { type: "button", class: "diary-entry", onclick: () => show(p.day) },
        el("span", { class: "diary-entry-date", text: formatShortYear(p.day) }),
        p.mood ? moodIcon(p.mood) : el("span", { class: "mood-icon" }),
        el("span", { class: "diary-entry-text", text: snippet(p.text) || moodLabel(p.mood) }),
      ))));
    pastHeading.hidden = !pages.length;
    empty.hidden = pages.length > 0;
    empty.textContent = "Your past pages will appear here.";
  }

  function renderCatLook() {
    applyLook(cat, { fur: FURS[store.settings.fur] ? store.settings.fur : "pink", wear: currentWear() });
  }

  function show(next) {
    flush();
    day = next;
    load();
    renderPast();
  }

  openDay = (next) => {
    show(next);
    tab.click();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  text.addEventListener("input", () => {
    status.textContent = "";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY_MS);
    // Little Mimi's tail flicks while you type.
    cat.classList.add("is-twitch");
    clearTimeout(twitchTimer);
    twitchTimer = setTimeout(() => cat.classList.remove("is-twitch"), 350);
  });
  text.addEventListener("focus", () => mimi.setActivity("is curled up next to your diary."));
  text.addEventListener("blur", () => {
    flush();
    mimi.setActivity(null);
  });
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.hidden && flush());

  store.on(() => {
    renderCatLook();
    renderPast();
    // A newer version of the open page arrived (another device, or a restored backup).
    const page = diaryPage(day);
    if (page.updatedAt !== loadedAt && !saveTimer && document.activeElement !== text) load();
  });

  load();
  renderPast();
  renderCatLook();
}
