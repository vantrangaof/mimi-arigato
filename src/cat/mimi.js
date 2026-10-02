// Mimi's behavior: time-of-day moods, sleeping at night, reactions with hearts,
// a queue for several reactions in a row, and small idle behaviors between them.

import { pixelSVG } from "../core/pixel.js";
import { pick } from "../core/dom.js";
import { userName } from "../core/store.js";

const HEART = ["dd.dd", "dHHHd", "dHHHd", ".dHd.", "..d.."];
export const heartSVG = (className, filled = true) =>
  pixelSVG(HEART, filled ? { d: "var(--cat-nose)", H: "var(--cat-blush)" } : { d: "var(--cat-nose)" }, className);

function spawnHeart(wrap, delay) {
  const svg = heartSVG("heart");
  svg.style.setProperty("--drift", `${Math.round((Math.random() - 0.5) * 6)}`);
  svg.style.animationDelay = `${delay}ms`;
  svg.addEventListener("animationend", () => svg.remove());
  wrap.appendChild(svg);
}

const isNight = (h = new Date().getHours()) => h >= 22 || h < 6;

function restingLine(h) {
  const you = userName() ? `, ${userName()}` : "";
  if (h < 10) return `is stretching. Good morning${you}!`;
  if (h >= 12 && h < 14) return "is thinking about lunch.";
  if (h >= 18) return `is ready to hear about your day${you}.`;
  return "is sitting peacefully.";
}

// Each idle: optional CSS class on the wrapper, a glance direction, and a status line.
const IDLES = [
  { cls: "is-grooming", line: "is grooming a paw.", ms: 2600 },
  { cls: "is-yawning", line: "yawns.", ms: 1400 },
  { cls: "is-dozing", line: "dozes off for a second.", ms: 3000 },
  { cls: "is-stretching", line: "stretches.", ms: 1500 },
  { cls: "is-chasing", line: "is chasing their tail.", ms: 1800 },
  { cls: "is-staring", line: "is staring at you.", ms: 2400 },
  { look: [-1, 0], then: [1, 0], line: "is looking around.", ms: 2200 },
  { when: (c) => c.window, look: [-1, -1], line: "is looking out the window.", ms: 3000 },
  { when: (c) => c.aquarium, look: [1, -1], line: "is watching the fish.", ms: 3000 },
  { when: (c) => c.cushion, cls: "is-dozing", line: "is comfy on the cushion.", ms: 2600 },
  { when: (c) => c.accessory, look: [1, -1], line: (c) => `is admiring their ${c.accessory}.`, ms: 2200 },
  { when: (c) => c.entriesToday === 0 && !isNight(), look: [0, 1], line: "is waiting to hear about your day.", ms: 3600, weight: 3 },
  { when: (c) => c.entriesToday > 0, look: [1, 1], line: "is looking at today's hearts.", ms: 2600 },
];

const AWAKE_MS = 90_000;

export function makeMimi({ wrap, bubble, state, look, context }) {
  const live = state.closest("[aria-live]");
  let reactTimer, queueTimer, idleTimer;
  let reacting = false;
  let queued = false;
  let idling = null;
  let awakeUntil = 0;
  let full = false;
  let activity = null;

  const asleep = () => !activity && isNight() && Date.now() > awakeUntil;
  const busy = () => reacting || queued || activity || asleep() || document.hidden;

  function speak(text, { announce = true } = {}) {
    live?.setAttribute("aria-live", announce ? "polite" : "off");
    state.textContent = text;
  }

  function settle() {
    if (reacting) return;
    endIdle();
    const sleeping = asleep();
    wrap.classList.toggle("is-asleep", sleeping);
    wrap.classList.toggle("is-talking", sleeping);
    if (sleeping) bubble.textContent = "z z z";
    speak(activity ?? (sleeping ? "is asleep. Tap gently to wake them."
      : full ? "is glowing with thanks."
      : restingLine(new Date().getHours())), { announce: false });
  }

  function endIdle() {
    if (!idling) return;
    if (idling.cls) wrap.classList.remove(idling.cls);
    look.dir(0, 0);
    idling = null;
  }

  function startIdle() {
    const ctx = context();
    const options = IDLES.filter((i) => !i.when || i.when(ctx));
    const weighted = options.flatMap((i) => Array(i.weight ?? 1).fill(i));
    const idle = pick(weighted);
    idling = idle;
    if (idle.cls) wrap.classList.add(idle.cls);
    if (idle.look) look.dir(...idle.look);
    if (idle.then) setTimeout(() => idling === idle && look.dir(...idle.then), idle.ms / 2);
    speak(typeof idle.line === "function" ? idle.line(ctx) : idle.line, { announce: false });
    setTimeout(() => {
      if (idling !== idle) return;
      endIdle();
      settle();
    }, idle.ms);
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!busy() && !idling) startIdle();
      scheduleIdle();
    }, 9000 + Math.random() * 7000);
  }

  function react([sound, text], { hearts = 1, hold = 1800 } = {}) {
    endIdle();
    awakeUntil = Date.now() + AWAKE_MS;
    reacting = true;
    bubble.textContent = sound;
    speak(text);
    wrap.classList.remove("is-asleep", "is-squish");
    void wrap.offsetWidth;
    wrap.classList.add("is-happy", "is-squish", "is-talking");
    for (let i = 0; i < hearts; i++) spawnHeart(wrap, i * 140);
    clearTimeout(reactTimer);
    reactTimer = setTimeout(() => {
      reacting = false;
      wrap.classList.remove("is-happy", "is-talking");
      settle();
    }, hold + hearts * 140);
  }

  // Plays reactions one after another: [[sound, text, options], ...]
  function announce(items) {
    clearTimeout(queueTimer);
    const run = (i) => {
      queued = i < items.length - 1;
      if (i >= items.length) return;
      const [sound, text, options = {}] = items[i];
      react([sound, text], options);
      const wait = (options.hold ?? 1800) + (options.hearts ?? 1) * 140 + 300;
      queueTimer = setTimeout(() => run(i + 1), wait);
    };
    run(0);
  }

  setInterval(settle, 30_000);
  scheduleIdle();

  return {
    settle,
    react,
    announce,
    isAsleep: asleep,
    setFull(value) {
      full = value;
      settle();
    },
    setActivity(text) {
      activity = text;
      if (text) awakeUntil = Date.now() + AWAKE_MS;
      settle();
    },
  };
}
