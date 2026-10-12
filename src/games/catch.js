// Catch the fish: fish fall from the top and Mimi catches them. Steer with a finger, the
// mouse or the arrow keys. 30 seconds; a missed fish just swims away (no penalty).

import { el } from "../core/dom.js";
import { drawSpriteCanvas, FURS } from "../cat/sprite.js";
import { playNote } from "../cat/music.js";

const W = 100; // the field in sprite pixels
const H = 112;
const CAT_W = 32;
const CAT_H = 29;
const ROUND_MS = 30_000;
const FISH = [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"];
const BLUE = { b: "#3f6797", F: "#a6d4f7", e: "#1b2a3a" };
const GOLD = { b: "#b7791f", F: "#ffd76a", e: "#4a2f05" };
const NOTES = ["C5", "D5", "E5", "G5", "A5", "C6"];

function drawArt(ctx, rows, colors, x0, y0) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!colors[ch]) return;
    ctx.fillStyle = colors[ch];
    ctx.fillRect(x0 + x, y0 + y, 1, 1);
  }));
}

// cat: { fur, wear } to draw Mimi as they look right now.
export function startCatch({ root, cat, sound, onEnd }) {
  const canvas = el("canvas", { class: "game-canvas", "aria-label": "Catch the fish. Move left and right with your finger, mouse or arrow keys.", tabindex: "0", role: "img" });
  const score = el("span", { class: "game-score", text: "0 fish" });
  const timer = el("span", { class: "game-timer", text: "0:30" });
  root.replaceChildren(el("div", { class: "game-hud" }, score, timer), canvas, el("p", { class: "muted small game-hint", text: "Move Mimi under the fish. Gold ones count for three!" }));

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
  const colors = { paper: css.getPropertyValue("--paper").trim() || "#fcf2f6", grid: css.getPropertyValue("--grid-strong").trim(), floor: css.getPropertyValue("--floor-edge").trim(), ink: css.getPropertyValue("--ink").trim() };

  let catX = (W - CAT_W) / 2;
  let target = catX;
  let fish = [];
  let pops = [];
  let caught = 0;
  let streak = 0;
  let nextFish = 0;
  let raf;
  let last = performance.now();
  const started = last;
  let ended = false;

  function spawn(now, elapsed) {
    const gold = Math.random() < 0.1;
    fish.push({ x: 4 + Math.random() * (W - 15), y: -5, speed: (18 + Math.random() * 14 + elapsed / 1500) * (gold ? 1.25 : 1), gold });
    nextFish = now + Math.max(380, 900 - elapsed / 50) * (0.7 + Math.random() * 0.6);
  }

  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = colors.grid;
    for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 0.15, H);
    for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 0.15);
    ctx.fillStyle = colors.floor;
    ctx.fillRect(0, H - 3, W, 3);
    for (const f of fish) drawArt(ctx, FISH, f.gold ? GOLD : BLUE, Math.round(f.x), Math.round(f.y));
    drawSpriteCanvas(ctx, Math.round(catX), H - CAT_H - 1, 1, { fur: FURS[cat.fur] ? cat.fur : "pink", wear: cat.wear });
    ctx.font = "6px DotGothic16, monospace";
    ctx.textAlign = "center";
    for (const p of pops) {
      ctx.fillStyle = p.gold ? "#b7791f" : colors.ink;
      ctx.globalAlpha = Math.max(0, 1 - p.age / 700);
      ctx.fillText(p.text, p.x, p.y - p.age / 60);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(50, now - last) / 1000;
    last = now;
    const elapsed = now - started;
    const left = Math.max(0, ROUND_MS - elapsed);
    timer.textContent = `0:${String(Math.ceil(left / 1000)).padStart(2, "0")}`;
    if (now >= nextFish && left > 600) spawn(now, elapsed);

    catX += (target - catX) * Math.min(1, dt * 12);
    const mouthTop = H - CAT_H + 4;
    fish = fish.filter((f) => {
      f.y += f.speed * dt;
      const center = f.x + 3.5;
      if (f.y + 4 >= mouthTop && f.y < mouthTop + 6 && center > catX + 4 && center < catX + CAT_W - 4) {
        const worth = f.gold ? 3 : 1;
        caught += worth;
        streak += 1;
        score.textContent = `${caught} fish`;
        pops.push({ x: center, y: mouthTop - 2, age: 0, text: `+${worth}`, gold: f.gold });
        if (sound) playNote(NOTES[Math.min(streak - 1, NOTES.length - 1)], { dur: 0.12, volume: 0.6 });
        return false;
      }
      if (f.y > H) {
        streak = 0;
        return false;
      }
      return true;
    });
    pops = pops.filter((p) => (p.age += dt * 1000) < 700);
    draw();

    if (left <= 0) return finish();
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (ended) return;
    ended = true;
    cleanup();
    onEnd({ score: caught });
  }

  const steer = (e) => {
    const r = canvas.getBoundingClientRect();
    target = Math.max(0, Math.min(W - CAT_W, ((e.clientX - r.left) / r.width) * W - CAT_W / 2));
  };
  const keys = (e) => {
    const step = { ArrowLeft: -8, ArrowRight: 8 }[e.key];
    if (!step) return;
    e.preventDefault();
    target = Math.max(0, Math.min(W - CAT_W, target + step));
  };
  canvas.addEventListener("pointermove", steer);
  canvas.addEventListener("pointerdown", steer);
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
