// Cushion tower: a cushion slides back and forth above Mimi; tap (or Space) to drop it. Whatever
// hangs over the edge of the stack gets trimmed off, and Mimi hops up onto each new cushion.
// Miss the stack completely and the round ends. It slowly gets faster, and a perfect drop
// (lined up within two pixels) snaps into place; three perfect drops in a row grow the cushion back.

import { el } from "../core/dom.js";
import { drawSpriteCanvas, FURS } from "../cat/sprite.js";
import { playNote } from "../cat/music.js";

const W = 100; // the field in sprite pixels
const H = 112;
const CAT_W = 32;
const CH = 6; // cushion height
const GROUND = H - 3;
const START_W = 40;
const SCREEN_TOP = 74; // the camera keeps the top of the stack about here
const HOP_MS = 360;
const NOTES = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"];
const CUSHIONS = [
  { fill: "#ff9ebe", edge: "#c9588a", top: "#ffd4e4" },
  { fill: "#a6d4f7", edge: "#3f6797", top: "#dff0ff" },
  { fill: "#ffd76a", edge: "#b7791f", top: "#fff1c2" },
  { fill: "#8fd19a", edge: "#3f8a4a", top: "#d7f2dc" },
  { fill: "#c8b2f2", edge: "#6a4fa3", top: "#ece3ff" },
  { fill: "#ffb38a", edge: "#c2603a", top: "#ffe2d1" },
];

const ease = (t) => 1 - (1 - t) ** 2;

export function startTower({ root, cat, sound, onEnd }) {
  const canvas = el("canvas", { class: "game-canvas game-canvas-tap", "aria-label": "Cushion tower. Tap or press Space to drop the cushion onto the stack.", tabindex: "0", role: "img" });
  const score = el("span", { class: "game-score", "aria-live": "polite", text: "0 cushions" });
  const note = el("span", { class: "game-timer", text: "tap to drop" });
  root.replaceChildren(
    el("div", { class: "game-hud" }, score, note),
    canvas,
    el("p", { class: "muted small game-hint", text: "Tap to drop the cushion. Line it up with the one below: anything hanging over gets trimmed!" }),
  );

  const ctx = canvas.getContext("2d");
  let scale = 3;
  function size() {
    const width = Math.min(root.clientWidth || 300, 380);
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

  // The stack, bottom first: { x, w, color, landedAt }. The first cushion is a gift.
  const stack = [{ x: (W - START_W) / 2, w: START_W, color: 0, landedAt: 0 }];
  let mover = { x: 0, w: START_W, dir: 1 };
  let falling = []; // trimmed bits and missed cushions: { x, y, w, vy, color }
  let pops = [];
  let placed = 0;
  let perfects = 0;
  let perfectRun = 0;
  let cam = 0;
  let hop = null; // { from, to, fromX, toX, at }: Mimi hopping up a level
  let catX = (W - CAT_W) / 2;
  let missedAt = 0;
  let lockUntil = 0;
  let raf;
  let last = performance.now();
  let ended = false;

  const play = (fn) => sound && fn();
  const pop = (text, x, y, color = colors.ink) => pops.push({ text, x, y, age: 0, color });
  const surface = (level) => GROUND - level * CH; // top edge of the cushion at `level`, in world pixels
  const top = () => stack.at(-1);
  const speed = () => Math.min(95, 32 + placed * 3.2); // pixels per second
  const topY = () => surface(stack.length); // where Mimi sits
  const hoverY = () => topY() - 27 - CH - 3; // the sliding cushion, above Mimi's ears

  function drop(now) {
    if (ended || missedAt || now < lockUntil) return;
    lockUntil = now + 160;
    const below = top();
    mover.x = Math.round(mover.x); // whole pixels, so cushions stay crisp
    let left = Math.max(mover.x, below.x);
    let right = Math.min(mover.x + mover.w, below.x + below.w);
    const color = stack.length % CUSHIONS.length;
    const y = surface(stack.length + 1); // the new cushion's top edge

    if (right <= left) {
      // Missed the stack: the cushion tumbles down and the round ends.
      missedAt = now;
      falling.push({ x: mover.x, y: hoverY(), w: mover.w, vy: 0, color });
      pop("mrrp?!", catX + CAT_W / 2, topY() - 30, colors.accent);
      play(() => playNote("E3", { dur: 0.25, instrument: "soft" }));
      return;
    }

    // Within two pixels counts as perfect: it snaps neatly onto the stack (the mover is always
    // as wide as the top cushion).
    const perfect = Math.abs(mover.x - below.x) <= 2;
    if (perfect) {
      left = below.x;
      right = below.x + below.w;
    }
    else {
      // Trim the overhang; it drops off the side.
      if (mover.x < left) falling.push({ x: mover.x, y, w: left - mover.x, vy: 0, color });
      if (mover.x + mover.w > right) falling.push({ x: right, y, w: mover.x + mover.w - right, vy: 0, color });
    }

    let w = right - left;
    let x = left;
    if (perfect) {
      perfects += 1;
      perfectRun += 1;
      if (perfectRun % 3 === 0 && w < START_W) {
        const grow = Math.min(4, START_W - w);
        x = Math.max(0, x - grow / 2);
        w += grow;
        pop("bigger!", x + w / 2, y - 34, colors.accent);
      }
      else pop("perfect!", x + w / 2, y - 34, colors.accent);
      play(() => playNote(NOTES[Math.min(perfectRun + 2, NOTES.length - 1)], { dur: 0.25, instrument: "box", volume: 0.8 }));
    }
    else {
      perfectRun = 0;
      play(() => playNote(NOTES[placed % 5], { dur: 0.14, instrument: "soft", volume: 0.8 }));
    }

    stack.push({ x, w, color, landedAt: now });
    placed += 1;
    score.textContent = `${placed} ${placed === 1 ? "cushion" : "cushions"}`;
    if (placed % 10 === 0) pop(`${placed}!`, W / 2, topY() - 40, colors.accent);
    hop = { from: surface(stack.length - 1), to: topY(), fromX: catX, toX: x + w / 2 - CAT_W / 2, at: now };
    // The next cushion starts from a side, as wide as the top of the stack.
    mover = { x: Math.random() < 0.5 ? -w + 4 : W - 4, w, dir: 0 };
    mover.dir = mover.x < 0 ? 1 : -1;
  }

  function drawCushion(c, x, y, w) {
    const k = CUSHIONS[c];
    x = Math.round(x);
    y = Math.round(y);
    w = Math.max(1, Math.round(w));
    ctx.fillStyle = k.edge;
    ctx.fillRect(x, y, w, CH);
    ctx.fillStyle = k.fill;
    if (w > 2) ctx.fillRect(x + 1, y + 1, w - 2, CH - 2);
    ctx.fillStyle = k.top;
    if (w > 4) ctx.fillRect(x + 2, y + 1, w - 4, 1);
    // A button tuft in the middle.
    if (w > 6) {
      ctx.fillStyle = k.edge;
      ctx.fillRect(x + Math.floor(w / 2), y + 3, 1, 1);
    }
  }

  function draw(now) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = colors.grid;
    const shift = Math.round(cam) % 8;
    for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 0.15, H);
    for (let y = shift - 8; y < H; y += 8) ctx.fillRect(0, y, W, 0.15);
    const sy = (y) => y + cam; // world → screen

    // How high you've gone: a little mark every 5 cushions.
    ctx.font = "6px DotGothic16, monospace";
    ctx.textAlign = "left";
    for (let level = 5; level <= stack.length + 5; level += 5) {
      const y = sy(surface(level));
      if (y < -4 || y > H) continue;
      ctx.fillStyle = colors.grid;
      ctx.fillRect(0, Math.round(y), 4, 0.5);
      ctx.fillStyle = colors.ink;
      ctx.globalAlpha = 0.45;
      ctx.fillText(String(level), 1, Math.round(y) - 1);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = colors.floor;
    ctx.fillRect(0, Math.round(sy(GROUND)), W, H);

    stack.forEach((c, i) => {
      const y = sy(surface(i + 1)) + (now - c.landedAt < 120 ? 1 : 0); // a little squish on landing
      if (y > H || y < -CH) return;
      drawCushion(c.color, c.x, y, c.w);
    });

    // Mimi: hopping up, or sitting on top of the stack (startled if a cushion got away).
    let catY = topY();
    let eyes = "open";
    let mouth = "closed";
    if (hop) {
      const t = Math.min(1, (now - hop.at) / HOP_MS);
      catY = hop.from + (hop.to - hop.from) * ease(t) - Math.sin(t * Math.PI) * 10;
      catX = hop.fromX + (hop.toX - hop.fromX) * ease(t);
      eyes = "happy";
      if (t >= 1) hop = null;
    }
    if (missedAt) {
      eyes = "open";
      mouth = "open";
    }
    drawSpriteCanvas(ctx, Math.round(catX), Math.round(sy(catY)) - 27, 1, { ...look, eyes, mouth });

    if (!missedAt) drawCushion(stack.length % CUSHIONS.length, mover.x, sy(hoverY()), mover.w);
    for (const f of falling) drawCushion(f.color, f.x, sy(f.y), f.w);

    ctx.textAlign = "center";
    for (const p of pops) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.age / 900);
      ctx.fillText(p.text, Math.min(W - 16, Math.max(16, p.x)), sy(p.y) - p.age / 60);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(50, now - last)) / 1000;
    last = now;

    if (!missedAt) {
      mover.x += mover.dir * speed() * dt;
      if (mover.x + mover.w > W + 2 && mover.dir > 0) mover.dir = -1;
      if (mover.x < -2 && mover.dir < 0) mover.dir = 1;
    }
    const wantCam = Math.max(0, SCREEN_TOP - topY());
    cam += (wantCam - cam) * Math.min(1, dt * 6);

    falling = falling.filter((f) => {
      f.vy += 160 * dt;
      f.y += f.vy * dt;
      return f.y + cam < H + 4;
    });
    pops = pops.filter((p) => (p.age += dt * 1000) < 900);
    draw(now);

    if (missedAt && now - missedAt > 1100) return finish();
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (ended) return;
    cleanup();
    onEnd({ score: placed, perfects });
  }

  const tap = (e) => {
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    drop(performance.now());
  };
  const keys = (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) drop(performance.now());
  };
  canvas.addEventListener("pointerdown", tap);
  canvas.addEventListener("keydown", keys);
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
