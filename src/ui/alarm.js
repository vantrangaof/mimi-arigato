// Wake-up alarm: Mimi sings you awake with one of their songs (cat/music.js), their real
// meows, or a song file you picked. Web apps can't ring while closed, so it rings while the
// app is open; tucked in at night, Mimi keeps the screen awake until the alarm. "Add to
// calendar" sets a backup alert in your calendar app. Everything here stays on this device.

import { el, download, pick } from "../core/dom.js";
import { calendarEvent } from "../core/ics.js";
import { dayKey } from "../core/dates.js";
import { pixelSVG } from "../core/pixel.js";
import { store, read, write, catName, userName, deviceFile, saveDeviceFile, removeDeviceFile } from "../core/store.js";
import { renderCat, applyLook, FURS } from "../cat/sprite.js";
import { SONGS, playSong, stopSong } from "../cat/music.js";
import { currentWear } from "./habitat.js";

const KEY = "alarm"; // { on, time, days: [0..6], song, gentle, ownName }
const RANG = "alarmRang"; // the last occurrence that rang ("YYYY-MM-DD HH:MM")
const SNOOZE = "alarmSnooze"; // ring again at this time (ms), or null
const SONG_FILE = "alarm:song";
const DEFAULT = { on: false, time: "07:00", days: [0, 1, 2, 3, 4, 5, 6], song: "morning", gentle: true, ownName: null };
const SNOOZE_MIN = 5;
const LATE_MS = 3 * 60_000; // opening the app later than this doesn't ring a missed alarm
const GIVE_UP_MS = 10 * 60_000; // stops singing after 10 minutes
const AWAKE_BEFORE_MS = 14 * 3600_000; // keeps the screen on when the alarm is within 14 hours
const MAX_FILE = 15 * 1024 * 1024;

const BELL = ["..o.o..", ".ooooo.", "ooo.ooo", "ooo.ooo", "oooo.oo", ".ooooo.", "o.....o"];
const CLOCK = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const WEEKDAY_LONG = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first

export const alarmSettings = () => ({ ...DEFAULT, ...read(KEY, {}) });
let changed = false; // since the sheet opened
const save = (changes) => {
  changed = true;
  const next = { ...alarmSettings(), ...changes };
  // Setting a time that already passed today (or turning the alarm on after it) waits for the next one.
  const today = at(new Date(), next.time);
  if ((changes.time || changes.on) && today <= new Date()) write(RANG, occurrenceKey(today));
  write(KEY, next);
  document.dispatchEvent(new Event("mimi:alarm"));
};

const at = (day, time) => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};
const occurrenceKey = (d) => `${dayKey(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const clock = (d) => CLOCK.format(d);

// The next time the alarm rings after `from`. No days picked = once.
export function nextRing(a = alarmSettings(), from = new Date()) {
  if (!a.on) return null;
  const snooze = read(SNOOZE, null);
  if (snooze && snooze > from.getTime()) return new Date(snooze);
  for (let i = 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const ring = at(d, a.time);
    if (ring > from && (!a.days.length || a.days.includes(ring.getDay()))) return ring;
  }
  return null;
}

function whenText(d, now = new Date()) {
  const days = Math.round((at(d, "00:00") - at(now, "00:00")) / 86_400_000);
  const day = days === 0 ? "today" : days === 1 ? "tomorrow" : WEEKDAY_LONG.format(d);
  return `${day} at ${clock(d)}`;
}

function daysText(days) {
  if (!days.length) return "once";
  if (days.length === 7) return "every day";
  const key = [...days].sort().join("");
  if (key === "12345") return "on weekdays";
  if (key === "06") return "on weekends";
  return `on ${WEEK.filter((d) => days.includes(d)).map((d) => WEEKDAY.format(new Date(2024, 0, 7 + d))).join(", ")}`;
}

// Keeps the screen on overnight so the page is still running when it's time to ring.
function screenKeeper() {
  let lock = null;
  let asking = false;
  return {
    supported: "wakeLock" in navigator,
    async want(on) {
      if (!this.supported) return;
      if (!on) {
        lock?.release().catch(() => {});
        lock = null;
        return;
      }
      if ((lock && !lock.released) || asking || document.hidden) return;
      asking = true;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {}
      asking = false;
    },
    get on() {
      return Boolean(lock && !lock.released);
    },
  };
}

export function wireAlarm(mimi, { open, dialog, body, ring }) {
  const screen = screenKeeper();
  let ownURL = null;
  let ringing = null; // { player, timers }
  let previewing = null;

  async function ownSongURL() {
    if (ownURL) return ownURL;
    const blob = await deviceFile(SONG_FILE).catch(() => null);
    ownURL = blob ? URL.createObjectURL(blob) : null;
    return ownURL;
  }

  // ---- the top bar button ----
  function renderButton() {
    const a = alarmSettings();
    const next = nextRing(a);
    const label = next ? clock(next) : "";
    open.replaceChildren(pixelSVG(BELL, { o: "currentColor" }), ...(label ? [el("span", { text: label })] : []));
    open.classList.toggle("is-on", Boolean(next));
    open.setAttribute("aria-label", next ? `Alarm: ${whenText(next)}` : "Alarm: off");
    open.title = next ? `${catName()} will wake you ${whenText(next)}` : "Wake-up alarm";
  }

  // ---- the alarm sheet ----
  function stopPreview() {
    previewing?.stop();
    previewing = null;
    body.querySelectorAll(".song-play[aria-pressed='true']").forEach((b) => {
      b.setAttribute("aria-pressed", "false");
      b.textContent = "▶";
    });
  }

  async function preview(id, button) {
    const was = button.getAttribute("aria-pressed") === "true";
    stopPreview();
    if (was) return;
    button.setAttribute("aria-pressed", "true");
    button.textContent = "■";
    previewing = playSong(id, { volume: 0.7, fileURL: id === "own" ? await ownSongURL() : null, loop: id === "own" || id === "meows" });
    if (id !== "own" && id !== "meows") setTimeout(() => previewing && button.getAttribute("aria-pressed") === "true" && stopPreview(), 9000);
  }

  function songRow(id, label, about, a, extra = []) {
    const play = el("button", {
      type: "button",
      class: "icon-button small song-play",
      "aria-pressed": "false",
      "aria-label": `Listen to ${label}`,
      text: "▶",
      onclick: (e) => preview(id, e.currentTarget),
    });
    return el("div", { class: "song-row" },
      el("label", { class: "choice song-choice" },
        el("input", { type: "radio", name: "alarmSong", value: id, checked: a.song === id, onchange: () => save({ song: id }) }),
        el("span", {}, el("span", { class: "song-name", text: label }), el("span", { class: "muted small song-about", text: about })),
      ),
      play,
      ...extra,
    );
  }

  let fileNote = "";
  async function pickSong(input) {
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    if (file.size > MAX_FILE) {
      fileNote = "That song is too big. Try one under 15 MB.";
      return render();
    }
    try {
      await saveDeviceFile(SONG_FILE, file);
      if (ownURL) URL.revokeObjectURL(ownURL);
      ownURL = null;
      fileNote = "";
      save({ song: "own", ownName: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "your song" });
    } catch {
      fileNote = "That song couldn't be saved on this device.";
      render();
    }
  }

  async function removeSong() {
    stopPreview();
    await removeDeviceFile(SONG_FILE).catch(() => {});
    if (ownURL) URL.revokeObjectURL(ownURL);
    ownURL = null;
    const a = alarmSettings();
    save({ ownName: null, song: a.song === "own" ? DEFAULT.song : a.song });
  }

  function render() {
    const a = alarmSettings();
    const next = nextRing(a);
    const name = catName();

    const onBox = el("input", { type: "checkbox", checked: a.on, onchange: (e) => save({ on: e.target.checked }) });
    const time = el("input", { class: "text-input time", type: "time", value: a.time, required: true, "aria-label": "Alarm time" });
    time.addEventListener("change", () => time.value && save({ time: time.value, on: true }));

    const days = el("div", { class: "choices day-choices" }, ...WEEK.map((d) => el("label", { class: "choice day-choice", title: WEEKDAY_LONG.format(new Date(2024, 0, 7 + d)) },
      el("input", {
        type: "checkbox",
        checked: a.days.includes(d),
        onchange: (e) => save({ days: e.target.checked ? [...a.days, d] : a.days.filter((x) => x !== d) }),
      }),
      el("span", { text: WEEKDAY.format(new Date(2024, 0, 7 + d)) }),
    )));

    const songInput = el("input", { type: "file", accept: "audio/*", class: "visually-hidden", onchange: (e) => pickSong(e.target) });
    const own = a.ownName
      ? songRow("own", a.ownName, "your own song, on this device", a, [el("button", { type: "button", class: "remove", "aria-label": "Remove your song", title: "Remove your song", text: "×", onclick: removeSong })])
      : null;

    body.replaceChildren(
      el("div", { class: "sheet-section alarm-top" },
        el("label", { class: "choice alarm-on" }, onBox, el("span", { text: "Wake me up" })),
        time,
        el("p", { class: "alarm-next", "aria-live": "polite", text: next ? `${name} will sing you awake ${whenText(next)}.` : a.on ? "Pick a day for the alarm." : `The alarm is off.` }),
      ),
      el("fieldset", { class: "sheet-section" },
        el("legend", { class: "sheet-label", text: "Days" }),
        days,
        el("p", { class: "muted small", text: a.days.length ? `Rings ${daysText(a.days)}.` : "No days picked: rings once, then turns off." }),
      ),
      el("fieldset", { class: "sheet-section" },
        el("legend", { class: "sheet-label", text: `${name}'s song` }),
        el("div", { class: "song-list" },
          ...SONGS.map((s) => songRow(s.id, s.label, s.about, a)),
          own,
        ),
        el("label", { class: "pixel-button song-file" }, a.ownName ? "Use another song…" : "Use my own song…", songInput),
        fileNote && el("p", { class: "muted small error", text: fileNote }),
      ),
      el("div", { class: "sheet-section" },
        el("label", { class: "choice" },
          el("input", { type: "checkbox", checked: a.gentle, onchange: (e) => save({ gentle: e.target.checked }) }),
          el("span", { text: "Start soft and get louder" }),
        ),
      ),
      el("div", { class: "sheet-section" },
        el("span", { class: "sheet-label", text: "So it really rings" }),
        el("p", { class: "muted", text: `${name} can only sing while the app is open on screen. At night, tap Tuck in and leave your phone open and charging: ${screen.supported ? `${name} keeps the screen awake until the alarm.` : "keep the screen from locking (this browser can't keep it awake)."} The alarm plays even with ${name}'s sound off, but on iPhone the silent switch mutes it.` }),
        el("p", { class: "muted", text: "For a backup, add the alarm to your calendar app too." }),
        el("div", { class: "row" },
          el("button", { type: "button", class: "pixel-button", text: "Try it now", onclick: () => { stopPreview(); dialog.close(); startRing({ test: true }); } }),
          el("button", { type: "button", class: "pixel-button", text: "Add to calendar", onclick: toCalendar }),
        ),
      ),
    );
  }

  function toCalendar() {
    const a = alarmSettings();
    const next = nextRing({ ...a, on: true }) ?? new Date();
    download("mimi-alarm.ics", new Blob([calendarEvent({
      uid: `mimi-alarm-${Date.now()}`,
      day: dayKey(next),
      time: a.time,
      repeat: a.days.length ? "week" : null,
      weekdays: a.days.length ? a.days : null,
      summary: `Good morning from ${catName()} ♪`,
      description: `${catName()} is waking you up.`,
    })], { type: "text/calendar" }));
  }

  // ---- ringing ----
  function renderRing(now) {
    const sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sprite.setAttribute("class", "cat");
    sprite.setAttribute("viewBox", "0 0 32 29");
    sprite.setAttribute("shape-rendering", "crispEdges");
    sprite.setAttribute("aria-hidden", "true");
    renderCat(sprite);
    const stage = el("div", { class: "cat-preview ring-cat" },
      el("span", { class: "ring-notes", "aria-hidden": "true" }, el("span", { text: "♪" }), el("span", { text: "♫" }), el("span", { text: "♪" })),
      sprite,
    );
    applyLook(stage, { fur: FURS[store.settings.fur] ? store.settings.fur : "pink", wear: currentWear(), customFur: store.settings.customFur });
    const you = userName() ? `, ${userName()}` : "";
    ring.body.replaceChildren(
      el("p", { class: "ring-time", text: clock(now) }),
      stage,
      el("p", { class: "ring-line", text: pick([`${catName()} is singing you awake${you}! ♪`, `Good morning${you}! ${catName()} is standing on your pillow.`, `rise and shine${you}! ${catName()} saved you a sunbeam.`]) }),
      el("div", { class: "row ring-actions" },
        el("button", { type: "button", class: "pixel-button primary", text: "I'm up!", onclick: () => endRing("up") }),
        el("button", { type: "button", class: "pixel-button", text: `${SNOOZE_MIN} more minutes`, onclick: () => endRing("snooze") }),
      ),
    );
  }

  async function startRing({ test = false } = {}) {
    if (ringing) return;
    const a = alarmSettings();
    const now = new Date();
    ringing = { test, timers: [], player: null };
    renderRing(now);
    if (!ring.dialog.open) ring.dialog.showModal();
    ring.body.querySelector(".pixel-button.primary")?.focus();
    mimi.setActivity("is singing you awake ♪");
    document.body.classList.add("is-ringing");

    const loud = 0.9;
    const start = a.gentle ? 0.12 : loud;
    const fileURL = a.song === "own" ? await ownSongURL() : null;
    if (!ringing) return; // dismissed while the song loaded
    ringing.player = playSong(fileURL ? "own" : a.song === "own" ? DEFAULT.song : a.song, { loop: true, volume: start, fileURL });
    if (a.gentle) {
      // Gets louder over about 40 seconds.
      for (let i = 1; i <= 8; i++) ringing.timers.push(setTimeout(() => ringing?.player?.setVolume(start + ((loud - start) * i) / 8), i * 5000));
    }
    if (navigator.vibrate) {
      const buzz = () => navigator.vibrate([400, 200, 400]);
      buzz();
      ringing.timers.push(setInterval(buzz, 2500));
    }
    ringing.timers.push(setTimeout(() => endRing("gave-up"), GIVE_UP_MS));
  }

  function endRing(how) {
    if (!ringing) return;
    const { test, timers, player } = ringing;
    ringing = null;
    for (const t of timers) { clearTimeout(t); clearInterval(t); }
    player?.stop();
    stopSong();
    navigator.vibrate?.(0);
    document.body.classList.remove("is-ringing");
    if (ring.dialog.open) ring.dialog.close();
    mimi.setActivity(null);
    if (test) {
      mimi.react(["♪", "will sound just like that."], { hearts: 1, hold: 2200 });
      return;
    }
    const a = alarmSettings();
    if (how === "snooze") {
      write(SNOOZE, Date.now() + SNOOZE_MIN * 60_000);
      mimi.react(["mrr…", `curls up next to you. ${SNOOZE_MIN} more minutes.`], { hearts: 1, hold: 2600 });
    }
    else {
      write(SNOOZE, null);
      if (!a.days.length) save({ on: false });
      if (mimi.isTucked()) mimi.tuck(false);
      const you = userName() ? `, ${userName()}` : "";
      mimi.react(how === "up" ? ["good morning!", `stretches. Good morning${you}! ☀`] : ["mrrp", "let you sleep in. They'll sing again next time."], { hearts: how === "up" ? 3 : 0, hold: 3000 });
    }
    renderButton();
    if (dialog.open) render();
  }

  // Checks every few seconds whether it's time to ring, and keeps the screen on overnight.
  function tick() {
    const a = alarmSettings();
    const now = new Date();
    const snooze = read(SNOOZE, null);
    if (!ringing && a.on) {
      if (snooze && now.getTime() >= snooze) {
        write(SNOOZE, null);
        if (now.getTime() - snooze < LATE_MS) startRing();
      }
      else {
        const today = at(now, a.time);
        const due = (!a.days.length || a.days.includes(today.getDay())) && now >= today && now - today < LATE_MS;
        if (due && read(RANG, null) !== occurrenceKey(today)) {
          write(RANG, occurrenceKey(today));
          startRing();
        }
      }
    }
    const next = nextRing(a, now);
    screen.want(Boolean(ringing || (mimi.isTucked() && next && next - now < AWAKE_BEFORE_MS)));
  }

  // When Mimi is tucked in with the alarm on: what they say about it.
  function bedtimeLine() {
    const next = nextRing();
    if (!next || next - new Date() > AWAKE_BEFORE_MS) return null;
    const song = alarmSettings().song === "own" ? "your song" : SONGS.find((s) => s.id === alarmSettings().song)?.label ?? "a song";
    return ["♪", `will wake you at ${clock(next)} with ${song}. Leave ${catName()} open by your bed.`, { hearts: 0, hold: 3400 }];
  }

  open.addEventListener("click", () => {
    changed = false;
    render();
    dialog.showModal();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    stopPreview();
    if (ringing || !changed) return;
    const next = nextRing();
    if (next) mimi.react(["♪", `will sing you awake ${whenText(next)}.`], { hearts: 1, hold: 2600 });
  });
  // Escape on the ringing alarm counts as "I'm up".
  ring.dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    endRing("up");
  });
  document.addEventListener("mimi:alarm", () => {
    renderButton();
    if (dialog.open) render();
  });
  document.addEventListener("visibilitychange", () => !document.hidden && tick());
  store.on(renderButton);

  renderButton();
  setInterval(tick, 5000);
  setInterval(renderButton, 60_000);
  setTimeout(tick, 1500);

  return { bedtimeLine, ring: startRing };
}
