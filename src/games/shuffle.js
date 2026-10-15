// Box shuffle: Mimi peeks out of one of three boxes, ducks inside, and the boxes shuffle. Tap the
// box Mimi is in. Each round has one more swap and goes a little faster; a wrong box ends the game
// (Mimi peeks out of the right one, very pleased with their hiding spot).

import { el, prefersReducedMotion } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { drawSpriteCanvas, FURS } from "../cat/sprite.js";
import { playNote } from "../cat/music.js";
import { catName } from "../core/store.js";

const LID = ["dddddddddddddddd", "dTTTTTTTTTTTTTTd", "dddddddddddddddd"];
const BODY = [
  ".dddddddddddddd.",
  ".dbbbbbbbbbbbbd.",
  ".dBBBBBBBBBBBBd.",
  ".dBBBBBttBBBBBd.",
  ".dBBBBBBBBBBBBd.",
  ".dBBBBBBBBBBBBd.",
  ".dBBBBBBBBBBBBd.",
  ".dBBBBBBBBBBBBd.",
  ".dddddddddddddd.",
];
const BOX_COLORS = { d: "#8a5a2b", B: "#d9a066", b: "#b98048", t: "#8a5a2b", T: "#e8b67a" };
const SLOTS = ["Left box", "Middle box", "Right box"];
const NOTES = ["C5", "D5", "E5", "G5", "A5", "C6"];

export function startShuffle({ root, cat, sound, onEnd }) {
  const name = catName();
  const status = el("span", { class: "game-score", "aria-live": "polite", text: `Watch ${name}!` });
  const rounds = el("span", { class: "game-timer", text: "0 found" });
  const field = el("div", { class: "shuffle-field" });
  root.replaceChildren(
    el("div", { class: "game-hud" }, status, rounds),
    field,
    el("p", { class: "muted small game-hint", text: `Keep your eyes on the box ${name} hides in.` }),
  );

  // Mimi's head, peeking over the edge of a box (the sprite cropped at the chin).
  const face = el("canvas", { class: "shuffle-mimi", width: 32 * 4, height: 17 * 4, "aria-hidden": "true" });
  const look = { fur: FURS[cat.fur] ? cat.fur : "pink", wear: cat.wear };
  function drawFace(eyes) {
    const ctx = face.getContext("2d");
    ctx.setTransform(4, 0, 0, 4, 0, 0);
    ctx.clearRect(0, 0, 32, 17);
    drawSpriteCanvas(ctx, 0, -3, 1, { ...look, eyes });
  }

  const boxes = [0, 1, 2].map((i) => {
    const button = el("button", { type: "button", class: "shuffle-box", disabled: true },
      pixelSVG(LID, BOX_COLORS, "shuffle-lid"),
      pixelSVG(BODY, BOX_COLORS, "shuffle-body"),
    );
    button.addEventListener("click", () => choose(i));
    field.append(button);
    return button;
  });
  const slotOf = [0, 1, 2]; // box index → slot (0 left, 1 middle, 2 right)
  let mimiIn = 0; // which box (not slot) Mimi is in
  let won = 0;
  let picking = false;
  let over = false;
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const play = (fn) => sound && fn();

  function place() {
    boxes.forEach((b, i) => {
      b.style.setProperty("--slot", slotOf[i]);
      b.setAttribute("aria-label", SLOTS[slotOf[i]]);
    });
  }

  function open(i, withMimi, eyes = "open") {
    boxes[i].classList.add("is-open");
    if (withMimi) {
      drawFace(eyes);
      boxes[i].insertBefore(face, boxes[i].querySelector(".shuffle-body"));
    }
  }
  function closeAll() {
    for (const b of boxes) b.classList.remove("is-open");
    face.remove();
  }

  function setPicking(on) {
    picking = on;
    for (const b of boxes) b.disabled = !on;
    if (!on) return;
    // Tab order follows what you see: left, middle, right.
    const inOrder = [0, 1, 2].map((slot) => boxes[slotOf.indexOf(slot)]);
    field.append(...inOrder);
    status.textContent = `Where's ${name}?`;
    inOrder[1].focus({ preventScroll: true });
  }

  function round() {
    closeAll();
    setPicking(false);
    status.textContent = `Watch ${name}!`;
    mimiIn = Math.floor(Math.random() * 3);
    open(mimiIn, true);
    play(() => playNote("E5", { dur: 0.15, instrument: "box", volume: 0.7 }));
    later(() => {
      closeAll();
      play(() => playNote("C5", { dur: 0.1, instrument: "soft", volume: 0.6 }));
      later(() => swaps(Math.min(12, 3 + won), Math.max(170, 460 - won * 35)), 450);
    }, 1100);
  }

  function swaps(left, ms) {
    status.textContent = "Shuffling…";
    field.style.setProperty("--swap", `${ms}ms`);
    const step = () => {
      for (const b of boxes) b.classList.remove("is-front", "is-back");
      if (left-- === 0) return later(() => setPicking(true), 120);
      const a = Math.floor(Math.random() * 3);
      const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
      // One box passes in front of the other, so you can tell which went where.
      const [i, j] = [slotOf.indexOf(a), slotOf.indexOf(b)];
      [slotOf[i], slotOf[j]] = [slotOf[j], slotOf[i]];
      if (!prefersReducedMotion()) {
        boxes[i].classList.add("is-front");
        boxes[j].classList.add("is-back");
      }
      place();
      play(() => playNote(left % 2 ? "G4" : "A4", { dur: 0.05, volume: 0.35 }));
      later(step, ms + 40);
    };
    step();
  }

  function choose(i) {
    if (!picking || over) return;
    setPicking(false);
    if (i === mimiIn) {
      won += 1;
      rounds.textContent = `${won} found`;
      status.textContent = `Found ${name}!`;
      open(i, true, "happy");
      play(() => playNote(NOTES[(won - 1) % NOTES.length], { dur: 0.2, instrument: "box", volume: 0.8 }));
      later(round, 1100);
      return;
    }
    over = true;
    open(i, false);
    status.textContent = "Not that one!";
    play(() => playNote("E4", { dur: 0.25, instrument: "soft", volume: 0.7 }));
    later(() => {
      open(mimiIn, true, "happy");
      status.textContent = `${name} was in here!`;
    }, 600);
    later(() => onEnd({ score: won }), 1900);
  }

  place();
  later(round, 400);
  return () => {
    over = true;
    timers.forEach(clearTimeout);
  };
}
