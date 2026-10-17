// Pumpkin patch (Halloween only): nine pumpkins, and things pop out of them for a moment. Tap the
// candy (+1), the gold candy (+3) and the bats (+2) before they duck back in. Don't tap the ghosts:
// each one is a "BOO!" and costs a heart. 30 seconds, or until the three hearts are gone.
// Things pop faster as the clock runs down.

import { el, pick } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { playNote } from "../cat/music.js";
import { catName } from "../core/store.js";

const SECONDS = 30;
const HEARTS = 3;

const PUMPKIN = [
  "......gg......",
  ".....gg.......",
  "..oooOooOooo..",
  ".ooooOooOoooo.",
  "oooooOooOooooo",
  "ooooOooooOoooo",
  "ooooOooooOoooo",
  "oooooOooOooooo",
  ".ooooOooOoooo.",
  "..oooooooooo..",
];
const PUMPKIN_COLORS = { g: "#3f8a4a", o: "#e8762b", O: "#b8531a" };

const THINGS = {
  candy: {
    points: 1, weight: 10, ms: [1300, 750], label: "candy",
    art: ["p.....p", "pp.c.pp", ".pcCcp.", "pp.c.pp", "p.....p"],
    colors: { p: "#ff8bb0", c: "#d64f86", C: "#fff1f6" },
  },
  gold: {
    points: 3, weight: 2, ms: [900, 600], label: "gold candy",
    art: ["y.....y", "yy.c.yy", ".ycCcy.", "yy.c.yy", "y.....y"],
    colors: { y: "#ffd76a", c: "#d99a1e", C: "#fffbe6" },
  },
  bat: {
    points: 2, weight: 3, ms: [800, 550], label: "bat",
    art: ["k.......k", "kk.k.k.kk", "kkkrkrkkk", ".kkkkkkk.", "...k.k..."],
    colors: { k: "#3a2a4a", r: "#ff5a5a" },
  },
  ghost: {
    points: 0, weight: 5, ms: [1400, 900], label: "ghost", boo: true,
    art: ["..wwww..", ".wwwwww.", "wwkwwkww", "wwwwwwww", "wwwkkwww", "wwwwwwww", "w.ww.ww."],
    colors: { w: "#f4f1ff", k: "#2a2836" },
  },
};
const POOL = Object.entries(THINGS).flatMap(([id, t]) => Array(t.weight).fill(id));
const NOTES = ["C5", "E5", "G5", "A5", "C6"];

export function startPumpkins({ root, sound, onEnd }) {
  const name = catName();
  const score = el("span", { class: "game-score", "aria-live": "polite", text: "0 candy" });
  const clock = el("span", { class: "game-timer", text: `${SECONDS}s · ${"♥".repeat(HEARTS)}` });
  const grid = el("div", { class: "pumpkin-grid" });
  root.replaceChildren(
    el("div", { class: "game-hud" }, score, clock),
    grid,
    el("p", { class: "muted small game-hint", text: `Tap the candy and bats for ${name}. Leave the ghosts alone!` }),
  );

  let points = 0;
  let hearts = HEARTS;
  let left = SECONDS;
  let over = false;
  const tally = { boos: 0, bats: 0 };
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  const patches = Array.from({ length: 9 }, (_, i) => {
    const pop = el("span", { class: "pumpkin-pop", "aria-hidden": "true" });
    const button = el("button", { type: "button", class: "pumpkin", "aria-label": `Pumpkin ${i + 1}` },
      pop, pixelSVG(PUMPKIN, PUMPKIN_COLORS, "pumpkin-art"));
    const patch = { button, pop, thing: null, hide: null };
    button.addEventListener("click", () => tap(patch));
    grid.append(button);
    return patch;
  });

  // How far through the game we are (0 → 1): things pop faster and stay up for less time.
  const pace = () => 1 - left / SECONDS;
  const lerp = ([slow, fast]) => slow + (fast - slow) * pace();

  function render() {
    score.textContent = `${points} candy`;
    clock.textContent = `${left}s · ${"♥".repeat(hearts)}${"♡".repeat(HEARTS - hearts)}`;
  }

  function show(patch, id) {
    const t = THINGS[id];
    patch.thing = id;
    patch.pop.replaceChildren(pixelSVG(t.art, t.colors));
    patch.button.classList.remove("is-got", "is-boo");
    patch.button.classList.add("is-up");
    patch.button.setAttribute("aria-label", `A ${t.label}!`);
    const ms = lerp(t.ms);
    const token = {};
    patch.hide = token;
    later(() => patch.hide === token && duck(patch), ms);
  }

  function duck(patch) {
    patch.thing = null;
    patch.hide = null;
    patch.button.classList.remove("is-up");
    patch.button.setAttribute("aria-label", "Pumpkin");
  }

  function spawn() {
    if (over) return;
    const free = patches.filter((p) => !p.thing);
    if (free.length) show(pick(free), pick(POOL));
    // A second one at once, more often later on.
    if (free.length > 1 && Math.random() < 0.15 + pace() * 0.35) show(pick(free.filter((p) => !p.thing)), pick(POOL));
    later(spawn, lerp([850, 420]));
  }

  function tap(patch) {
    if (over || !patch.thing) return;
    const t = THINGS[patch.thing];
    duck(patch);
    if (t.boo) {
      hearts -= 1;
      tally.boos += 1;
      patch.button.classList.add("is-boo");
      if (sound) playNote("C4", { dur: 0.3, instrument: "box", volume: 0.6 });
      render();
      if (hearts <= 0) end();
      return;
    }
    points += t.points;
    if (patch.thing === "bat") tally.bats += 1;
    patch.button.classList.add("is-got");
    if (sound) playNote(pick(NOTES), { dur: 0.12, instrument: "box", volume: 0.6 });
    render();
  }

  function tick() {
    if (over) return;
    left -= 1;
    render();
    if (left <= 0) end();
    else later(tick, 1000);
  }

  function end() {
    if (over) return;
    over = true;
    for (const t of timers) clearTimeout(t);
    timers.clear();
    patches.forEach(duck);
    later(() => onEnd({ score: points, ...tally }), 500);
  }

  render();
  later(spawn, 600);
  later(tick, 1000);
  return () => {
    over = true;
    for (const t of timers) clearTimeout(t);
  };
}
