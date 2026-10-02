// Things to do with Mimi: treats and a laser dot to chase.

import { store, KEYS } from "./store.js";
import { pixelSVG } from "./sprite.js";

const MAX_TREATS = 3;
const FISH = [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"];
const FISH_COLORS = { b: "#3f6797", F: "#a6d4f7", e: "#1b2a3a" };

function replay(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

export function wireTreat(btn, mimi, wrap) {
  let busy = false;

  function label() {
    const left = MAX_TREATS - store.daily(KEYS.treats);
    btn.textContent = left > 0 ? `Give a treat (${left})` : "Full of treats";
    btn.setAttribute("aria-label", left > 0 ? `Give a treat, ${left} left today` : "No treats left today");
  }

  btn.addEventListener("click", () => {
    if (busy) return;
    const used = store.daily(KEYS.treats);
    if (used >= MAX_TREATS) {
      replay(wrap, "is-shake");
      mimi.react(["mm-mm", "is too full for more treats today."], { hearts: 0 });
      return;
    }
    busy = true;
    mimi.setActivity("spots a fish treat!");
    const fish = pixelSVG(FISH, FISH_COLORS, "fish");
    wrap.appendChild(fish);
    fish.addEventListener("animationend", () => {
      fish.remove();
      wrap.classList.add("is-chomping");
      setTimeout(() => {
        wrap.classList.remove("is-chomping");
        store.setDaily(KEYS.treats, used + 1);
        label();
        mimi.setActivity(null);
        mimi.react(["nom nom", "loved that treat."], { hearts: 2 });
        busy = false;
      }, 900);
    }, { once: true });
  });

  label();
}

const PLAY_MS = 20_000;

export function wirePlay(btn, mimi, wrap, habitat, look) {
  let playing = false;
  let raf, endTimer, dot;
  let pos, target;
  let pointerAt = 0;
  let wanderAt = 0;
  let lastPounce = 0;
  let catches = 0;

  const area = () => habitat.getBoundingClientRect();
  function randomPoint() {
    const r = area();
    return { x: 16 + Math.random() * (r.width - 32), y: 16 + Math.random() * (r.height - 32) };
  }

  function start() {
    playing = true;
    catches = 0;
    btn.textContent = "Stop playing";
    btn.setAttribute("aria-pressed", "true");
    habitat.classList.add("is-playing");
    dot = document.createElement("span");
    dot.className = "laser";
    habitat.appendChild(dot);
    pos = randomPoint();
    target = randomPoint();
    mimi.setActivity("is watching the dot…");
    endTimer = setTimeout(stop, PLAY_MS);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(raf);
    clearTimeout(endTimer);
    dot.remove();
    habitat.classList.remove("is-playing");
    btn.textContent = "Play";
    btn.setAttribute("aria-pressed", "false");
    mimi.setActivity(null);
    look(null);
    const line = catches === 0 ? "is tired from playing."
      : catches === 1 ? "caught the dot once!"
      : `caught the dot ${catches} times!`;
    mimi.react(["phew!", line], { hearts: Math.min(catches, 5), hold: 2600 });
  }

  function tick() {
    const now = performance.now();
    // With no finger or mouse steering, the dot wanders on its own.
    if (now - pointerAt > 1500 && now > wanderAt) {
      target = randomPoint();
      wanderAt = now + 700 + Math.random() * 900;
    }
    pos.x += (target.x - pos.x) * 0.12;
    pos.y += (target.y - pos.y) * 0.12;
    dot.style.transform = `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)`;

    const r = area();
    const x = r.left + pos.x;
    const y = r.top + pos.y;
    look(x, y);

    const c = wrap.querySelector(".cat").getBoundingClientRect();
    const onMimi = x > c.left + c.width * 0.15 && x < c.right - c.width * 0.15
      && y > c.top + c.height * 0.25 && y < c.bottom - c.height * 0.05;
    if (onMimi && now - lastPounce > 1200) {
      lastPounce = now;
      catches += 1;
      replay(wrap, "is-pounce");
      mimi.react(["got it!", "pounces on the dot!"], { hearts: 1, hold: 900 });
      target = randomPoint();
      pointerAt = 0;
    }
    raf = requestAnimationFrame(tick);
  }

  function steer(e) {
    if (!playing) return;
    const r = area();
    target = { x: e.clientX - r.left, y: e.clientY - r.top };
    pointerAt = performance.now();
  }

  habitat.addEventListener("pointermove", steer);
  habitat.addEventListener("pointerdown", steer);
  btn.addEventListener("click", () => (playing ? stop() : start()));
  return { isPlaying: () => playing };
}
