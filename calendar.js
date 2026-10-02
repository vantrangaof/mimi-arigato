// Month view of good things, plus search across every day.

import { store, dayKey, entriesFor, parseDay } from "./store.js";

const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const monthOnlyFmt = new Intl.DateTimeFormat(undefined, { month: "long" });
const longFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const shortFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function highlighted(text, query) {
  const frag = document.createDocumentFragment();
  const lower = text.toLowerCase();
  let at = 0;
  for (let i = lower.indexOf(query, at); i !== -1; i = lower.indexOf(query, at)) {
    frag.append(text.slice(at, i));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(i, i + query.length);
    frag.append(mark);
    at = i + query.length;
  }
  frag.append(text.slice(at));
  return frag;
}

export function wireCalendar(els) {
  const now = new Date();
  let view = new Date(now.getFullYear(), now.getMonth(), 1);
  let selected = dayKey();

  // Monday-first week; 2024-01-01 was a Monday.
  els.weekdays.replaceChildren(...Array.from({ length: 7 }, (_, i) => {
    const span = document.createElement("span");
    span.textContent = weekdayFmt.format(new Date(2024, 0, 1 + i));
    return span;
  }));

  function renderMonth() {
    const today = dayKey();
    const year = view.getFullYear();
    const month = view.getMonth();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    let monthTotal = 0;

    els.title.textContent = monthFmt.format(view);
    const thisMonth = new Date();
    els.next.disabled = year === thisMonth.getFullYear() && month === thisMonth.getMonth();

    const cells = Array.from({ length: lead }, () => document.createElement("span"));
    for (let day = 1; day <= count; day++) {
      const date = new Date(year, month, day);
      const key = dayKey(date);
      const n = entriesFor(key).length;
      monthTotal += n;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      btn.textContent = day;
      btn.dataset.level = Math.min(n, 5);
      btn.disabled = key > today;
      btn.classList.toggle("is-today", key === today);
      btn.setAttribute("aria-pressed", String(key === selected));
      btn.setAttribute("aria-label", `${longFmt.format(date)}: ${plural(n, "good thing")}`);
      btn.addEventListener("click", () => {
        selected = key;
        els.search.value = "";
        renderMonth();
        renderDetail();
      });
      cells.push(btn);
    }
    els.grid.replaceChildren(...cells);
    els.stats.textContent = monthTotal
      ? `${plural(monthTotal, "good thing")} in ${monthOnlyFmt.format(view)}`
      : `Nothing yet in ${monthOnlyFmt.format(view)}.`;
  }

  function renderDetail() {
    const query = els.search.value.trim().toLowerCase();
    if (query) return renderResults(query);

    const heading = document.createElement("h3");
    heading.textContent = longFmt.format(parseDay(selected));
    const list = entriesFor(selected);
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = selected === dayKey() ? "Nothing written yet today." : "Nothing written this day.";
      els.detail.replaceChildren(heading, p);
      return;
    }
    const ul = document.createElement("ul");
    ul.append(...list.map((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    }));
    els.detail.replaceChildren(heading, ul);
  }

  function renderResults(query) {
    const hits = Object.keys(store.days).sort().reverse()
      .flatMap((key) => entriesFor(key).filter((t) => t.toLowerCase().includes(query)).map((text) => ({ key, text })));
    const summary = document.createElement("p");
    summary.className = "muted";
    summary.textContent = hits.length === 1 ? "1 match"
      : hits.length ? `${hits.length} matches`
      : `No good things mention “${els.search.value.trim()}” yet.`;
    const ul = document.createElement("ul");
    ul.className = "results";
    ul.append(...hits.slice(0, 50).map(({ key, text }) => {
      const li = document.createElement("li");
      const date = document.createElement("span");
      date.className = "result-date";
      date.textContent = shortFmt.format(parseDay(key));
      const body = document.createElement("span");
      body.append(highlighted(text, query));
      li.append(date, body);
      return li;
    }));
    els.detail.replaceChildren(summary, ul);
  }

  els.prev.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderMonth();
  });
  els.next.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderMonth();
  });
  els.search.addEventListener("input", renderDetail);

  store.on(() => {
    renderMonth();
    renderDetail();
  });
  renderMonth();
  renderDetail();
}
