import { renderCat, applyLook, pixelSVG, FURS, ACCESSORIES } from "./sprite.js";
import { store, KEYS, catName, catTitle, streak, totalThings, randomMemory, formatShort, daysAway } from "./store.js";
import { makeMimi } from "./mimi.js";
import { wireJournal } from "./journal.js";
import { wireCalendar } from "./calendar.js";
import { wireTreat, wirePlay } from "./play.js";
import { wireSettings } from "./settings.js";
import { wireShare } from "./share.js";
import { meow } from "./sound.js";

const $ = (id) => document.getElementById(id);

const wide = matchMedia("(min-width: 960px)");

// Graph-paper squares match one sprite pixel, aligned so Mimi sits on the grid.
function fitGrid(svg) {
  const basis = wide.matches
    ? Math.min($("mimiPanel").clientWidth * 0.85, innerHeight - 400)
    : Math.min(innerWidth * 0.68, 416);
  const px = Math.max(6, Math.min(18, Math.floor(basis / 32)));
  document.documentElement.style.setProperty("--px", `${px}px`);
  const r = svg.getBoundingClientRect();
  const mod = (n) => ((Math.round(n) % px) + px) % px;
  document.body.style.backgroundPosition = `${mod(r.left + scrollX)}px ${mod(r.top + scrollY)}px`;
}

const PET_REACTIONS = [
  ["purr~", "is purring softly."],
  ["mrrp!", "wiggles their ears."],
  ["♥", "leans into your hand."],
  ["nya~", "closes their eyes happily."],
  ["prrr", "stretches a little paw."],
];

function wirePetting(mimi, wrap, tally) {
  let last = -1;
  let count = store.daily(KEYS.pets);

  const render = () => {
    const name = catName();
    tally.textContent = count === 0 ? `Tap ${name} to say hello.`
      : count === 1 ? `You petted ${name} once today.`
      : `You petted ${name} ${count} times today.`;
  };

  const say = (options) => {
    if (store.settings.sound) meow(options);
  };

  wrap.addEventListener("click", () => {
    count += 1;
    store.setDaily(KEYS.pets, count);
    render();

    if (mimi.isAsleep()) {
      say({ sleepy: true });
      mimi.react(["mrr…?", "wakes up and blinks at you."], { hearts: 0, hold: 2400 });
      return;
    }
    const memory = Math.random() < 0.25 ? randomMemory() : null;
    if (memory) {
      say();
      mimi.react(["remember?", `remembers “${memory.text}” from ${formatShort(memory.key)}.`], { hold: 4200 });
      return;
    }
    let i;
    do i = Math.floor(Math.random() * PET_REACTIONS.length); while (i === last);
    last = i;
    say({ trill: PET_REACTIONS[i][0] === "mrrp!" });
    mimi.react(PET_REACTIONS[i]);
  });

  store.on(render);
  render();
}

const PAW = [".o.o.", "o...o", ".ooo.", "ooooo", ".ooo."];
const GEAR = ["...o...", ".ooooo.", ".oo.oo.", "oo...oo", ".oo.oo.", ".ooooo.", "...o..."];

function wireStreak(el) {
  const render = () => {
    const { days, doneToday } = streak();
    const paw = pixelSVG(PAW, { o: "currentColor" }, "paw");
    const text = document.createElement("span");
    text.textContent = days === 0 ? "No streak yet" : `${days}-day streak`;
    el.replaceChildren(paw, text);
    el.classList.toggle("is-done", doneToday);
    el.title = doneToday ? "You wrote today."
      : days ? "Write one good thing today to keep it going."
      : "Write one good thing to start a streak.";
  };
  store.on(render);
  render();
}

const SPEAKER_ON = ["...o.....", "..oo...o.", "oooo.o..o", "oooo.o..o", "oooo.o..o", "..oo...o.", "...o....."];
const SPEAKER_OFF = ["...o.....", "..oo.....", "oooo.o.o.", "oooo..o..", "oooo.o.o.", "..oo.....", "...o....."];

function wireSoundToggle(btn) {
  const render = () => {
    const on = store.settings.sound;
    btn.replaceChildren(pixelSVG(on ? SPEAKER_ON : SPEAKER_OFF, { o: "currentColor" }));
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Sound on" : "Sound off");
    btn.title = on ? "Sound on. Click to mute." : "Sound off. Click to hear meows.";
  };
  btn.addEventListener("click", () => {
    store.settings.sound = !store.settings.sound;
    store.saveSettings();
    if (store.settings.sound) meow({ length: 0.7 });
  });
  store.on(render);
  render();
}

function wireIdentity(wrap) {
  const render = () => {
    const s = store.settings;
    const fur = FURS[s.fur] ? s.fur : "pink";
    const accessory = ACCESSORIES.some((a) => a.id === s.accessory && totalThings() >= a.need) ? s.accessory : "none";
    applyLook(wrap, { fur, accessory });
    $("catTitle").textContent = catTitle();
    document.title = catTitle();
    wrap.setAttribute("aria-label", `Pet ${catName()}`);
  };
  store.on(render);
  render();
}

$("settingsOpen").append(pixelSVG(GEAR, { o: "currentColor" }));

const sprite = $("catSprite");
const wrap = $("catWrap");
const look = renderCat(sprite);
fitGrid(sprite);
addEventListener("resize", () => fitGrid(sprite));
// On desktop Mimi stays put while the page scrolls, so keep the paper lined up under her.
let gridFrame = 0;
addEventListener("scroll", () => {
  cancelAnimationFrame(gridFrame);
  gridFrame = requestAnimationFrame(() => fitGrid(sprite));
}, { passive: true });
document.fonts?.ready.then(() => fitGrid(sprite));

const mimi = makeMimi({ wrap, bubble: $("bubble"), state: $("stateText") });

wireIdentity(wrap);
wireStreak($("streak"));
wireSoundToggle($("soundToggle"));
wirePetting(mimi, wrap, $("tally"));
wireJournal(mimi, {
  title: $("thanksTitle"),
  hearts: $("hearts"),
  progress: $("progress"),
  list: $("thanksList"),
  form: $("thanksForm"),
  input: $("thanksInput"),
  send: $("thanksSend"),
  done: $("thanksDone"),
  share: $("shareOpen"),
});
wireCalendar({
  title: $("calTitle"),
  prev: $("calPrev"),
  next: $("calNext"),
  weekdays: $("calWeekdays"),
  grid: $("calGrid"),
  stats: $("calStats"),
  search: $("calSearch"),
  detail: $("calDetail"),
});
wireTreat($("treatBtn"), mimi, wrap);
const play = wirePlay($("playBtn"), mimi, wrap, $("habitat"), look);
wireSettings({
  dialog: $("settings"),
  open: $("settingsOpen"),
  name: $("catName"),
  fur: $("furChoices"),
  wardrobe: $("wardrobe"),
  wardrobeNote: $("wardrobeNote"),
  reminder: $("reminderTime"),
  addReminder: $("reminderAdd"),
  backup: $("backupDownload"),
  restore: $("backupRestore"),
  backupNote: $("backupNote"),
});
wireShare({
  open: $("shareOpen"),
  dialog: $("shareDialog"),
  img: $("shareImg"),
  save: $("shareSave"),
  share: $("shareSend"),
});

// Mimi's eyes follow the mouse.
addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse" && !play.isPlaying()) look(e.clientX, e.clientY);
});

mimi.settle();
if (daysAway() >= 2) {
  setTimeout(() => mimi.react(["you're back!", "missed you so much."], { hearts: 3, hold: 3200 }), 600);
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
