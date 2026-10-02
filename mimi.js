// Mimi's moods: time-of-day resting lines, sleeping at night, reactions with hearts.

import { pixelSVG } from "./sprite.js";

const HEART = ["dd.dd", "dHHHd", "dHHHd", ".dHd.", "..d.."];
const HEART_FULL = { d: "var(--cat-nose)", H: "var(--cat-blush)" };
const HEART_EMPTY = { d: "var(--cat-nose)" };

export const heartSVG = (className, filled = true) => pixelSVG(HEART, filled ? HEART_FULL : HEART_EMPTY, className);

function spawnHeart(wrap, delay) {
  const svg = heartSVG("heart");
  svg.style.setProperty("--drift", `${Math.round((Math.random() - 0.5) * 6)}`);
  svg.style.animationDelay = `${delay}ms`;
  svg.addEventListener("animationend", () => svg.remove());
  wrap.appendChild(svg);
}

const isNight = (h = new Date().getHours()) => h >= 22 || h < 6;

function daytimeLine(h) {
  if (h < 10) return "is stretching. Good morning!";
  if (h >= 12 && h < 14) return "is thinking about lunch.";
  if (h >= 18) return "is ready to hear about your day.";
  return "is sitting peacefully.";
}

const AWAKE_MS = 90_000;

export function makeMimi({ wrap, bubble, state }) {
  let reactTimer;
  let reacting = false;
  let awakeUntil = 0;
  let full = false;
  let activity = null;

  const asleep = () => !activity && isNight() && Date.now() > awakeUntil;

  function settle() {
    if (reacting) return;
    const sleeping = asleep();
    wrap.classList.toggle("is-asleep", sleeping);
    wrap.classList.toggle("is-talking", sleeping);
    if (sleeping) bubble.textContent = "z z z";
    state.textContent = activity
      ?? (sleeping ? "is asleep. Tap gently to wake them."
      : full ? "is glowing with thanks."
      : daytimeLine(new Date().getHours()));
  }

  setInterval(settle, 30_000);

  return {
    settle,
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
    react([sound, text], { hearts = 1, hold = 1800 } = {}) {
      awakeUntil = Date.now() + AWAKE_MS;
      reacting = true;
      bubble.textContent = sound;
      state.textContent = text;
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
    },
  };
}
