// Sticky notes card: tell Mimi what you don't want to forget ("text Mom tomorrow at 6").
// Mimi mentions due notes when you open the app and at their time if the app is open;
// "Add to calendar" hands a note to your calendar app for a real alert.

import { el, download, pick } from "../core/dom.js";
import { calendarEvent } from "../core/ics.js";
import { dayKey, daysBetween, formatShort, parseDay } from "../core/dates.js";
import { pixelSVG } from "../core/pixel.js";
import { store, catName, read, write } from "../core/store.js";
import { meow, purr } from "../cat/sound.js";
import {
  parseReminder, addReminder, completeReminder, snoozeReminder, removeReminder, tidyReminders,
  dueReminders, doneToday, upcomingReminders, doneLine,
} from "../memory/reminders.js";

const GREETED = "stickyGreeted";
const SAID = "stickySaid";
const UPCOMING_LIMIT = 8;
const CALENDAR = ["kkkkkkk", "k.k.k.k", "kkkkkkk", "k.....k", "k.k.k.k", "k.....k", "kkkkkkk"];
const REPEATS = { day: "every day", week: "every week", month: "every month", year: "every year" };
const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const CLOCK = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

const clock = (time) => {
  const [h, m] = time.split(":").map(Number);
  return CLOCK.format(new Date(2000, 0, 1, h, m));
};
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// "Today, 6:00 PM · every week", "Tomorrow", "Friday", "Oct 12", "from Oct 2" (still on the note).
export function whenLabel(r, today = dayKey()) {
  const days = daysBetween(today, r.due);
  const day = days < 0 ? `from ${formatShort(r.due)}`
    : days === 0 ? "Today"
    : days === 1 ? "Tomorrow"
    : days < 7 ? WEEKDAY.format(parseDay(r.due))
    : formatShort(r.due);
  return [day + (r.time ? `, ${clock(r.time)}` : ""), r.repeat && REPEATS[r.repeat]].filter(Boolean).join(" · ");
}

const shortText = (t) => (t.length > 40 ? `${t.slice(0, 38)}…` : t);

// A greeting for opening the app with notes due (once a day), or null.
export function stickyGreeting(today = dayKey()) {
  const due = dueReminders(today);
  if (!due.length || read(GREETED, null) === today) return null;
  write(GREETED, today);
  const first = `“${shortText(due[0].text)}.”`;
  return ["psst…", due.length === 1 ? `is holding a note for you: ${first}` : `is holding ${due.length} notes for you. First: ${first}`, { hearts: 0, hold: 3600 }];
}

export function wireReminders(mimi, { card, list, form, input, when, date, time, repeat }) {
  const touched = { date: false, time: false, repeat: false };
  const voice = (fn, options) => store.settings.sound && fn(options);

  const toCalendar = (r) => download(`mimi-${r.text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) || "note"}.ics`, new Blob([calendarEvent({
    uid: `mimi-note-${r.id}`,
    day: r.due,
    time: r.time,
    repeat: r.repeat,
    summary: r.text,
    description: `A note from ${catName()}.`,
  })], { type: "text/calendar" }));

  const button = (label, props, ...children) => el("button", { type: "button", class: "remove", title: label, "aria-label": label, ...props }, ...children);

  function item(r, today) {
    const isDone = r.done === today;
    const isDue = !r.done && r.due <= today;
    return el("li", { class: `sticky${isDone ? " is-done" : ""}${r.due < today && !r.done ? " is-old" : ""}` },
      el("span", { class: "sticky-text" },
        el("span", { text: r.text }),
        el("span", { class: "entry-date", text: isDone ? "done ♡" : whenLabel(r, today) }),
      ),
      el("span", { class: "entry-actions" },
        isDue && button(`Done: ${r.text}`, {
          class: "remove sticky-done",
          text: "✓",
          onclick: () => {
            completeReminder(r);
            store.save("reminders");
            voice(purr, { volume: 0.6 });
            mimi.react(["✓", doneLine(r)], { hearts: 2, hold: 2800 });
          },
        }),
        isDue && button(`Remind me tomorrow: ${r.text}`, {
          class: "remove sticky-later",
          text: "later",
          onclick: () => {
            snoozeReminder(r);
            store.save("reminders");
            mimi.react(["okay", "will hold on to it until tomorrow."], { hearts: 0, hold: 2200 });
          },
        }),
        !isDone && button(`Add to calendar: ${r.text}`, { onclick: () => toCalendar(r) }, pixelSVG(CALENDAR, { k: "currentColor" })),
        button(`Remove: ${r.text}`, {
          text: "×",
          onclick: () => {
            removeReminder(r);
            store.save("reminders");
          },
        }),
      ),
    );
  }

  function render() {
    const today = dayKey();
    const now = [...dueReminders(today), ...doneToday(today)];
    const later = upcomingReminders(today).slice(0, UPCOMING_LIMIT);
    list.replaceChildren(
      ...(now.length ? [el("ul", { class: "stickies" }, ...now.map((r) => item(r, today)))] : []),
      ...(later.length ? [el("h3", { class: "panel-heading", text: "Coming up" }), el("ul", { class: "stickies" }, ...later.map((r) => item(r, today)))] : []),
      ...(!now.length && !later.length ? [el("p", { class: "muted small", text: `${catName()} isn't holding any notes. Try “text Mom tomorrow at 6” or “pay rent on the 1st every month”.` })] : []),
    );
    input.placeholder = "Remind me to…";
  }

  // As you type, Mimi reads the day, time and repeat; you can change them before saving.
  function preview() {
    const text = input.value.trim();
    when.hidden = !text;
    if (!text) return;
    const parsed = parseReminder(text);
    if (!touched.date) date.value = parsed.due;
    if (!touched.time) time.value = parsed.time ?? "";
    if (!touched.repeat) repeat.value = parsed.repeat ?? "";
  }
  input.addEventListener("input", preview);
  for (const [name, field] of Object.entries({ date, time, repeat })) field.addEventListener("change", () => { touched[name] = true; });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const parsed = parseReminder(input.value);
    const text = parsed.text || input.value.trim();
    if (!text) return;
    const r = addReminder({ text, due: date.value || parsed.due, time: time.value || null, repeat: repeat.value || null });
    store.save("reminders");
    input.value = "";
    Object.keys(touched).forEach((k) => { touched[k] = false; });
    when.hidden = true;
    voice(meow, { volume: 0.6 });
    mimi.react(["got it!", `will hold on to “${shortText(r.text)}” (${whenLabel(r).replace(/^(Today|Tomorrow)/, (w) => w.toLowerCase())}).`], { hearts: 1, hold: 3200 });
  });

  // At a note's time, if the app is open, Mimi says so (once per note per day).
  function tick() {
    if (document.hidden) return;
    const today = dayKey();
    const said = read(SAID, []);
    const ready = dueReminders(today).filter((r) => r.time && r.due === today && r.time <= nowTime() && !said.includes(`${r.id}|${today}`));
    if (!ready.length) return;
    write(SAID, [...said.slice(-40), ...ready.map((r) => `${r.id}|${today}`)]);
    voice(meow);
    mimi.announce(ready.map((r) => ["psst!", `${pick(["taps your hand", "nudges the note", "points a paw"])}: “${shortText(r.text)}.”`, { hearts: 0, hold: 3600 }]));
  }

  if (tidyReminders()) store.save("reminders");
  store.on(render);
  render();
  setInterval(() => { tick(); render(); }, 30_000);
  setTimeout(tick, 4000);

  return {
    show() {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  };
}
