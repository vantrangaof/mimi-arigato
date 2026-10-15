// Belly trap: Mimi asks for pets (head, cheeks or chin) and you tap that spot before they lose
// patience. Sometimes Mimi rolls over and shows their belly. It's a trap: rub it and all four
// paws grab your hand. Leave the belly alone and Mimi is impressed (+1). Three hearts: a trap or
// a pet you were too slow for costs one. It gets faster as you go.

import { el, plural } from "../core/dom.js";
import { drawSpriteCanvas, FURS } from "../cat/sprite.js";
import { playNote, sfx } from "../cat/music.js";
import { catName } from "../core/store.js";

const W = 56; // the field in sprite pixels
const H = 46;
const CX = 12; // where Mimi sits
const CY = 14;
const LIVES = 3;

// Spots on the sitting sprite, as [x, y, w, h] rectangles (cheeks has two).
const SPOTS = {
  head: { ask: "Pet my head!", key: "ArrowUp", rects: [[10, 6, 12, 5]] },
  cheeks: { ask: "Cheek scritches?", key: "ArrowLeft", rects: [[3, 12, 6, 5], [23, 12, 6, 5]] },
  chin: { ask: "Chin, please!", key: "ArrowDown", rects: [[10, 17, 12, 4]] },
};
// Upside down, the chest becomes the belly.
const BELLY = [[10, 4, 12, 6]];
const HAND = [".hh.h.", "hhhhhh", "hHHHHh", "hHHHHh", ".hhhh."];
const HAND_COLORS = { h: "#b5774f", H: "#ffd2b0" };
const PAW = [".ddd.", "dOOOd", "d@O@d", ".ddd."];
const NOTES = ["C5", "D5", "E5", "G5", "A5", "C6", "E6"];

function drawArt(ctx, rows, colors, x0, y0) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!colors[ch]) return;
    ctx.fillStyle = colors[ch];
    ctx.fillRect(x0 + x, y0 + y, 1, 1);
  }));
}

const inside = (rects, x, y) => rects.some(([rx, ry, rw, rh]) => x >= CX + rx - 1 && x < CX + rx + rw + 1 && y >= CY + ry - 1 && y < CY + ry + rh + 1);
const middle = ([[rx, ry, rw, rh]]) => [CX + rx + rw / 2, CY + ry + rh / 2];

export function startBelly({ root, cat, sound, onEnd }) {
  const name = catName();
  const canvas = el("canvas", { class: "game-canvas belly-canvas", tabindex: "0", role: "img",
    "aria-label": `Belly trap. Tap where ${name} asks, or use the arrow keys: up for head, left or right for cheeks, down for chin, space for the belly.` });
  const score = el("span", { class: "game-score", text: "0 pets" });
  const hearts = el("span", { class: "game-timer", "aria-label": `${LIVES} hearts left`, text: "" });
  const ask = el("p", { class: "belly-ask", "aria-live": "polite", text: "…" });
  root.replaceChildren(
    el("div", { class: "game-hud" }, score, hearts),
    ask,
    canvas,
    el("p", { class: "muted small game-hint", text: `Pet ${name} where they ask, before they get impatient. If they show you their belly… don't.` }),
  );

  const ctx = canvas.getContext("2d");
  let scale = 3;
  function size() {
    const width = Math.min(root.clientWidth || 300, 340);
    scale = Math.max(1, Math.floor((width * devicePixelRatio) / W));
    canvas.width = W * scale;
    canvas.height = H * scale;
    canvas.style.width = `${(W * scale) / devicePixelRatio}px`;
    canvas.style.height = `${(H * scale) / devicePixelRatio}px`;
  }
  size();

  const css = getComputedStyle(document.documentElement);
  const colors = { paper: css.getPropertyValue("--paper").trim() || "#fcf2f6", grid: css.getPropertyValue("--grid-strong").trim(), floor: css.getPropertyValue("--floor-edge").trim(), ink: css.getPropertyValue("--ink").trim(), accent: css.getPropertyValue("--accent").trim() || "#d64f86" };
  const look = { fur: FURS[cat.fur] ? cat.fur : "pink", wear: cat.wear };
  const palette = FURS[look.fur];
  const pawColors = { d: palette.outline, O: palette.body, "@": palette.inner };

  let pets = 0;
  let lives = LIVES;
  let asked = 0; // how many times Mimi has asked (the first few are never the belly)
  let traps = 0;
  let resisted = 0;
  // mode: "rest" (between asks) | "ask" | "belly" | "trap"; until: when it ends (ms)
  let mode = "rest";
  let spot = null;
  let until = performance.now() + 700;
  let happyUntil = 0;
  let hand = null; // { x, y, until } where you last touched
  let pops = [];
  let bits = [];
  let raf;
  let ended = false;

  const play = (fn) => sound && fn();
  const pop = (text, x, y, color = colors.ink) => pops.push({ text, x, y, age: 0, color });
  const burst = (x, y, n) => {
    for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: -(10 + Math.random() * 20), age: 0 });
  };
  const renderHearts = () => {
    hearts.textContent = "♥".repeat(lives) + "♡".repeat(LIVES - lives);
    hearts.setAttribute("aria-label", `${lives} ${lives === 1 ? "heart" : "hearts"} left`);
  };
  renderHearts();

  function next(now) {
    asked += 1;
    const belly = asked > 3 && Math.random() < (pets > 15 ? 0.3 : 0.22);
    if (belly) {
      mode = "belly";
      spot = null;
      until = now + Math.max(1000, 1800 - pets * 30);
      ask.textContent = "…belly?";
      return;
    }
    mode = "ask";
    spot = Object.keys(SPOTS)[Math.floor(Math.random() * 3)];
    until = now + Math.max(900, 2400 - pets * 60);
    ask.textContent = SPOTS[spot].ask;
  }

  function rest(now, ms) {
    mode = "rest";
    spot = null;
    until = now + ms;
  }

  function loseHeart() {
    lives -= 1;
    renderHearts();
  }

  function touch(x, y) {
    const now = performance.now();
    if (ended) return;
    if (mode === "ask") {
      if (inside(SPOTS[spot].rects, x, y)) {
        pets += 1;
        score.textContent = plural(pets, "pet");
        hand = { x, y, until: now + 450 };
        happyUntil = now + 450;
        pop("+1", x, y - 4);
        burst(x, y - 2, 5);
        ask.textContent = pets % 10 === 0 ? `${pets} pets! prrrr` : "prrr…";
        play(() => playNote(NOTES[(pets - 1) % NOTES.length], { dur: 0.12, instrument: "box", volume: 0.7 }));
        rest(now, 420);
      }
      else if (Object.values(SPOTS).some((s) => inside(s.rects, x, y))) pop("?", x, y - 4);
      return;
    }
    if (mode === "belly" && inside(BELLY, x, y)) {
      traps += 1;
      loseHeart();
      mode = "trap";
      const [bx, by] = middle(BELLY);
      hand = { x: bx, y: by, until: now + 1300 };
      until = now + 1300;
      ask.textContent = lives ? "TRAP! (it was a trap)" : "TRAP!";
      pop("TRAP!", bx, CY - 2, colors.accent);
      play(() => sfx("trap"));
    }
  }

  function draw(now) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = colors.grid;
    for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 0.15, H);
    for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 0.15);
    ctx.fillStyle = colors.floor;
    ctx.fillRect(0, H - 3, W, 3);

    if (mode === "belly" || mode === "trap") {
      // Rolled over: the sprite upside down, paws in the air.
      ctx.save();
      ctx.translate(0, CY * 2 + 28);
      ctx.scale(1, -1);
      drawSpriteCanvas(ctx, CX, CY, 1, { ...look, eyes: mode === "trap" ? "happy" : "open", mouth: mode === "trap" ? "open" : "closed", shadow: false });
      ctx.restore();
      if (mode === "belly") {
        // A soft, fluffy, suspicious glow.
        const [[rx, ry, rw, rh]] = BELLY;
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 160);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(CX + rx + 1, CY + ry + 1, rw - 2, rh - 2);
        ctx.globalAlpha = 1;
      }
    }
    else {
      const eyes = now < happyUntil ? "happy" : "open";
      drawSpriteCanvas(ctx, CX, CY, 1, { ...look, eyes });
      if (mode === "ask") {
        // Dotted outline around the spot Mimi wants, blinking.
        ctx.fillStyle = colors.accent;
        const on = Math.floor(now / 250) % 2;
        for (const [rx, ry, rw, rh] of SPOTS[spot].rects) {
          const x0 = CX + rx - 1, y0 = CY + ry - 1, x1 = CX + rx + rw, y1 = CY + ry + rh;
          for (let x = x0 + on; x <= x1; x += 2) { ctx.fillRect(x, y0, 1, 1); ctx.fillRect(x, y1, 1, 1); }
          for (let y = y0 + on; y <= y1; y += 2) { ctx.fillRect(x0, y, 1, 1); ctx.fillRect(x1, y, 1, 1); }
        }
        // How much patience is left, as a bar under Mimi.
        const total = Math.max(900, 2400 - pets * 60);
        const left = Math.max(0, (until - now) / total);
        ctx.fillStyle = colors.accent;
        ctx.fillRect(CX + 2, H - 2, Math.round((32 - 4) * left), 1);
      }
    }

    if (hand && now < hand.until) {
      const hx = Math.round(hand.x - 3);
      const hy = Math.round(hand.y - 2);
      drawArt(ctx, HAND, HAND_COLORS, hx, hy);
      if (mode === "trap") {
        // All four paws, holding on.
        for (const [dx, dy] of [[-5, -3], [4, -3], [-4, 3], [3, 3]]) drawArt(ctx, PAW, pawColors, hx + dx, hy + dy);
      }
    }

    for (const b of bits) {
      ctx.globalAlpha = Math.max(0, 1 - b.age / 600);
      ctx.fillStyle = palette.blush;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    }
    ctx.font = "6px DotGothic16, monospace";
    ctx.textAlign = "center";
    for (const p of pops) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.age / 900);
      ctx.fillText(p.text, Math.min(W - 10, Math.max(10, p.x)), p.y - p.age / 60);
    }
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(50, now - last)) / 1000;
    last = now;
    if (now >= until) {
      if (mode === "ask") {
        // Too slow: Mimi walks off in a huff for a moment.
        loseHeart();
        ask.textContent = lives ? "Hmph. Too slow." : "Hmph.";
        pop("hmph", CX + 16, CY - 2);
        play(() => playNote("E4", { dur: 0.2, instrument: "soft", volume: 0.6 }));
        rest(now, 800);
      }
      else if (mode === "belly") {
        resisted += 1;
        pets += 1;
        score.textContent = plural(pets, "pet");
        ask.textContent = "Good human. +1";
        pop("+1", CX + 16, CY - 2, colors.accent);
        play(() => sfx("sparkle"));
        happyUntil = now + 500;
        rest(now, 600);
      }
      else if (lives <= 0) return finish();
      else next(now);
    }
    for (const b of bits) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 60 * dt;
      b.age += dt * 1000;
    }
    bits = bits.filter((b) => b.age < 600);
    pops = pops.filter((p) => (p.age += dt * 1000) < 900);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (ended) return;
    cleanup();
    onEnd({ score: pets, traps, resisted });
  }

  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    touch(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  });
  canvas.addEventListener("keydown", (e) => {
    const id = e.key === "ArrowRight" ? "cheeks" : Object.keys(SPOTS).find((k) => SPOTS[k].key === e.key);
    const belly = e.key === " " || e.key === "Enter";
    if (!id && !belly) return;
    e.preventDefault();
    touch(...middle(belly ? BELLY : SPOTS[id].rects));
  });
  addEventListener("resize", size);
  canvas.focus({ preventScroll: true });
  raf = requestAnimationFrame(frame);

  function cleanup() {
    ended = true;
    cancelAnimationFrame(raf);
    removeEventListener("resize", size);
  }
  return cleanup;
}
