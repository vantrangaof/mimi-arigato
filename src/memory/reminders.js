// Sticky notes: things you asked Mimi to remind you of ("text Mom tomorrow at 6").
// Mimi holds them and mentions them in the app; each can also go to your calendar app,
// which does the actual alert. Mimi never scolds: an old note is just "still on the note".
// Reminder: { id, text, due: "YYYY-MM-DD", time: "HH:MM" | null, repeat: null | "day" | "week" | "month" | "year",
//             done: "YYYY-MM-DD" | null, createdAt, updatedAt, deleted }

import { store } from "../core/store.js";
import { dayKey, parseDay } from "../core/dates.js";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_RE = "(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10 };

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayIndex = (word) => DAYS.findIndex((d) => d.startsWith(word.toLowerCase().slice(0, 3)));
const pad = (n) => String(n).padStart(2, "0");

function addMonths(d, n, dom = d.getDate()) {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(dom, last));
}

// The next date with this weekday (today counts unless `skipToday`).
function nextWeekday(from, index, skipToday = false) {
  let n = (index - from.getDay() + 7) % 7;
  if (n === 0 && skipToday) n = 7;
  return addDays(from, n);
}

// "6" → 18:00 (a bare 1–7 means evening), "6am" → 06:00, "12pm" → 12:00, "18:30" → 18:30.
function clockTime(h, m = 0, ampm = "") {
  let hour = Number(h);
  const min = Number(m || 0);
  if (hour > 23 || min > 59) return null;
  const mark = ampm.toLowerCase();
  if (mark === "pm" && hour < 12) hour += 12;
  if (mark === "am" && hour === 12) hour = 0;
  if (!mark && hour >= 1 && hour <= 7) hour += 12;
  return `${pad(hour)}:${pad(min)}`;
}

function dateIn(today, monthWord, dayNumber) {
  const month = MONTHS.indexOf(monthWord.toLowerCase().slice(0, 3));
  const day = Number(dayNumber);
  if (month < 0 || day < 1 || day > 31) return null;
  const d = new Date(today.getFullYear(), month, day);
  return d < today ? new Date(today.getFullYear() + 1, month, day) : d;
}

// Reads "text Mom tomorrow at 6" → { text: "Text Mom", due, time: "18:00", repeat: null }.
// Anything not understood stays in the text; with no day the note is for today
// (or tomorrow, if only a time is given and it has already passed).
export function parseReminder(input, now = new Date()) {
  let s = ` ${input.trim()} `;
  let due = null;
  let time = null;
  let repeat = null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const take = (re, fn) => {
    const m = s.match(re);
    if (!m) return false;
    s = s.replace(m[0], " ");
    fn(m);
    return true;
  };

  s = s.replace(/^\s*(please\s+)?(remind me (to\s+|about\s+)?|don['’]?t (let me )?forget (to\s+)?|remember to\s+)/i, " ");

  // How often
  take(/\b(every ?day|daily|each day)\b/i, () => { repeat = "day"; });
  take(new RegExp(`\\b(?:every|each) ${DAY_RE}\\b`, "i"), (m) => { repeat = "week"; due = nextWeekday(today, dayIndex(m[1])); });
  take(/\b(every week|each week|weekly)\b/i, () => { repeat = "week"; });
  take(/\b(every month|each month|monthly)\b/i, () => { repeat = "month"; });
  take(/\b(every year|each year|yearly|annually)\b/i, () => { repeat = "year"; });

  // What time
  take(/\b(?:at\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i, (m) => { time = clockTime(m[1], m[2], m[3]); })
    || take(/\bat\s+(\d{1,2})(?:[:.](\d{2}))?\b/i, (m) => { time = clockTime(m[1], m[2]); })
    || take(/\b(\d{1,2}):(\d{2})\b/, (m) => { time = clockTime(m[1], m[2]); });
  take(/\b(at |by )?noon\b/i, () => { time = "12:00"; });
  take(/\b(in the |this )morning\b/i, () => { time ??= "09:00"; });
  take(/\b(in the |this )afternoon\b/i, () => { time ??= "15:00"; });
  take(/\b(in the |this )evening\b/i, () => { time ??= "19:00"; });

  // Which day
  take(/\btonight\b/i, () => { due = today; time ??= "20:00"; })
    || take(/\b(the )?day after tomorrow\b/i, () => { due = addDays(today, 2); })
    || take(/\btomorrow\b/i, () => { due = addDays(today, 1); })
    || take(/\btoday\b/i, () => { due = today; })
    || take(/\bin (\d+|an?|one|two|three|four|five|six|seven|ten) (day|week|month)s?\b/i, (m) => {
      const n = NUMBERS[m[1].toLowerCase()] ?? Number(m[1]);
      const unit = m[2].toLowerCase();
      due = unit === "day" ? addDays(today, n) : unit === "week" ? addDays(today, 7 * n) : addMonths(today, n);
    })
    || take(/\bnext week\b/i, () => { due = nextWeekday(today, 1, true); })
    || take(/\b(this )?weekend\b/i, () => { due = nextWeekday(today, 6); })
    || take(new RegExp(`\\b(?:on )?(next )?${DAY_RE}\\b`, "i"), (m) => { due = nextWeekday(today, dayIndex(m[2]), Boolean(m[1])); })
    || take(new RegExp(`\\b(?:on )?${MONTH_RE} (\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"), (m) => { due = dateIn(today, m[1], m[2]); })
    || take(new RegExp(`\\b(?:on )?(?:the )?(\\d{1,2})(?:st|nd|rd|th)? (?:of )?${MONTH_RE}`, "i"), (m) => { due = dateIn(today, m[2], m[1]); })
    || take(/\b(?:on )?the (\d{1,2})(?:st|nd|rd|th)?\b(?: of (the|each|every) month)?/i, (m) => {
      const n = Number(m[1]);
      if (n >= 1 && n <= 31) due = addMonths(today, n >= today.getDate() ? 0 : 1, n);
      if (m[2]) repeat = "month";
    });

  if (!due) due = time && time < `${pad(now.getHours())}:${pad(now.getMinutes())}` ? addDays(today, 1) : today;

  let text = s.replace(/\s+/g, " ").trim();
  while (/\s(on|at|by|in|every|of|the)$/i.test(text)) text = text.replace(/\s\S+$/, "");
  return { text: text.charAt(0).toUpperCase() + text.slice(1), due: dayKey(due), time, repeat };
}

// The next due day after `key` for a repeating note.
export function nextDue(key, repeat) {
  const d = parseDay(key);
  if (repeat === "day") return dayKey(addDays(d, 1));
  if (repeat === "week") return dayKey(addDays(d, 7));
  if (repeat === "month") return dayKey(addMonths(d, 1));
  if (repeat === "year") return dayKey(addMonths(d, 12));
  return key;
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const soonest = (a, b) => a.due.localeCompare(b.due) || (a.time ?? "99").localeCompare(b.time ?? "99");

export const liveReminders = () => store.reminders.filter((r) => !r.deleted);

// Notes for today or earlier that aren't done yet, soonest first.
export const dueReminders = (today = dayKey()) => liveReminders().filter((r) => !r.done && r.due <= today).sort(soonest);
export const doneToday = (today = dayKey()) => liveReminders().filter((r) => r.done === today);
export const upcomingReminders = (today = dayKey()) => liveReminders().filter((r) => !r.done && r.due > today).sort(soonest);

export function addReminder({ text, due, time = null, repeat = null }) {
  const now = Date.now();
  const r = { id: newId(), text: text.slice(0, 140), due, time, repeat, done: null, createdAt: now, updatedAt: now, deleted: false };
  store.reminders.push(r);
  return r;
}

export function updateReminder(r, changes) {
  Object.assign(r, changes, { updatedAt: Date.now() });
}

// Done: a repeating note moves on to its next day; a one-off is checked off (and hidden tomorrow).
export function completeReminder(r, today = dayKey()) {
  if (r.repeat) {
    let due = nextDue(r.due, r.repeat);
    while (due <= today) due = nextDue(due, r.repeat);
    updateReminder(r, { due });
  }
  else updateReminder(r, { done: today });
}

// "Later": the note moves to tomorrow.
export const snoozeReminder = (r, today = dayKey()) => updateReminder(r, { due: dayKey(addDays(parseDay(today), 1)) });

export const removeReminder = (r) => updateReminder(r, { deleted: true });

// Notes done or removed more than a month ago are dropped to keep the list small.
export function tidyReminders(now = Date.now()) {
  const before = store.reminders.length;
  store.reminders = store.reminders.filter((r) => !((r.deleted || r.done) && now - r.updatedAt > 30 * 86_400_000));
  return store.reminders.length !== before;
}

// Mimi's line when you check a note off.
export function doneLine(r) {
  const t = r.text.toLowerCase();
  if (/\b(mom|mum|mother|mama)\b/.test(t)) return "hopes Mom says hi back.";
  if (/\b(dad|father|papa)\b/.test(t)) return "hopes Dad says hi back.";
  if (/\b(bills?|rent|tax(es)?|invoices?|pay)\b/.test(t)) return "doesn't understand money, but is proud of you.";
  if (/\b(water|plants?)\b/.test(t)) return "says the plants thank you.";
  if (/\b(call|text|message|email|write)\b/.test(t)) return "thinks they'll be happy to hear from you.";
  const lines = ["crosses it off with a paw.", "is proud of you.", "says that's one less thing.", "is very impressed."];
  return lines[Math.floor(Math.random() * lines.length)];
}
