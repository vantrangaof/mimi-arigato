// Things to do with Mimi: fish, water and cuddles you earn with good things, and a laser dot to chase.

import { store, KEYS, dailyCount, setDailyCount, entriesToday, catName } from "../core/store.js";
import { replay, pick } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { purr } from "../cat/sound.js";

// Each good thing told today earns one fish, one drink of water and one cuddle to give
// whenever you like. Mimi never gets hungry or thirsty: these are treats, not needs.
const CARE = {
  fish: {
    key: KEYS.treats,
    label: "Fish",
    art: [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"],
    colors: { b: "#3f6797", F: "#a6d4f7", e: "#1b2a3a" },
    spot: "spots a fish!",
    done: [["nom nom", "loved that fish."], ["mrrp!", "ate the whole fish, tail first."], ["nom", "licks their whiskers. Delicious."]],
  },
  water: {
    key: KEYS.water,
    label: "Water",
    art: ["..b..", ".bWb.", "bWWWb", "bWWWb", ".bbb."],
    colors: { b: "#3f8fd2", W: "#bfe6ff" },
    className: "water-drop",
    spot: "hears the water bowl!",
    done: [["lap lap", "drinks a little water. Refreshing!"], ["slurp", "got water on their nose."], ["lap", "sips very politely."]],
  },
  cuddle: {
    key: KEYS.cuddles,
    label: "Cuddle",
    done: [["prrrr", "melts into a purring puddle."], ["♡♡", "snuggles into your arms."], ["purr~", "kneads your sleeve happily."]],
  },
};

export function wireCare(buttons, mimi, wrap) {
  let busy = false;
  const earned = () => Math.min(entriesToday().length, 5);
  const left = (care) => Math.max(0, earned() - dailyCount(care.key));

  function label() {
    for (const [id, btn] of Object.entries(buttons)) {
      const care = CARE[id];
      const n = left(care);
      btn.textContent = n ? `${care.label} ×${n}` : care.label;
      btn.setAttribute("aria-label", n ? `${care.label}: ${n} to give` : `${care.label}: tell ${catName()} a good thing to earn one`);
    }
  }

  function finish(care) {
    setDailyCount(care.key, dailyCount(care.key) + 1);
    label();
    mimi.setActivity(null);
    if (store.settings.sound) purr();
    mimi.react(pick(care.done), { hearts: care === CARE.cuddle ? 4 : 2, hold: 2200 });
    busy = false;
  }

  function give(care) {
    if (busy) return;
    if (!left(care)) {
      replay(wrap, "is-shake");
      mimi.react(earned() >= 5
        ? ["♡", "is completely spoiled today. Thank you!"]
        : ["mrrp?", `gets a ${care.label.toLowerCase()} for every good thing you tell them.`], { hearts: 0, hold: 2600 });
      return;
    }
    busy = true;
    if (!care.art) {
      replay(wrap, "is-squish");
      finish(care);
      return;
    }
    mimi.setActivity(care.spot);
    const drop = pixelSVG(care.art, care.colors, `fish ${care.className ?? ""}`);
    wrap.appendChild(drop);
    drop.addEventListener("animationend", () => {
      drop.remove();
      wrap.classList.add("is-chomping");
      setTimeout(() => {
        wrap.classList.remove("is-chomping");
        finish(care);
      }, 900);
    }, { once: true });
  }

  for (const [id, btn] of Object.entries(buttons)) btn.addEventListener("click", () => give(CARE[id]));
  store.on(label);
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
