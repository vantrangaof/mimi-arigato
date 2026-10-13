// Catch the fish: things fall from the sky and Mimi catches them. Steer with a finger, the
// mouse or the arrow keys. 30 seconds. Mimi opens their mouth when a fish is coming and chomps.
// Not everything is a fish: a cucumber spooks Mimi (they jump and freeze), rain soaks them
// (slow and shaky), a sock gets spat out ("blep"), and a heart gives zoomies (fast, wide catch).
// None of them take fish away; they just cost time and your "in a row" streak.

import { el } from "../core/dom.js";
import { drawSpriteCanvas, FURS } from "../cat/sprite.js";
import { playNote, jingle, sfx } from "../cat/music.js";

const W = 100; // the field in sprite pixels
const H = 112;
const CAT_W = 32;
const CAT_H = 29;
const ROUND_MS = 30_000;
const STREAK_BONUS = 5; // every 5 fish in a row: +2

const KINDS = {
  fish: {
    weight: 60, worth: 1, food: true,
    art: [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"],
    colors: { b: "#3f6797", F: "#a6d4f7", e: "#1b2a3a" },
  },
  gold: {
    weight: 7, worth: 3, food: true, speed: 1.25,
    art: [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"],
    colors: { b: "#b7791f", F: "#ffd76a", e: "#4a2f05" },
  },
  heart: {
    weight: 4, speed: 1.1,
    art: ["dd.dd", "dHHHd", "dHHHd", ".dHd.", "..d.."],
    colors: { d: "#d64f86", H: "#ff9ebe" },
  },
  cucumber: {
    weight: 11, speed: 1.1,
    art: ["..gggggg.", ".gGgGgGgg", "gGgGgGgg.", ".gggggg.."],
    colors: { g: "#3f8a4a", G: "#8fd19a" },
  },
  rain: {
    weight: 9, speed: 0.9,
    art: ["..cccc..", ".cCCCCc.", "cCCCCCCc", ".cccccc.", "..b..b..", ".b..b..."],
    colors: { c: "#8d8aa0", C: "#e4e1ee", b: "#3f8fd2" },
  },
  sock: {
    weight: 9,
    art: ["kkkk..", "kaak..", "kwwk..", "kaak..", "kwwkk.", "kaaaak", ".kkkk."],
    colors: { k: "#5a4a7a", a: "#9b7fe0", w: "#ffffff" },
  },
};
const BAG = Object.entries(KINDS).flatMap(([id, k]) => Array(k.weight).fill(id));
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
  root.replaceChildren(
    el("div", { class: "game-hud" }, score, timer),
    canvas,
    el("p", { class: "muted small game-hint", text: "Fish are yummy (gold ones count for three) and hearts give zoomies. Watch out for cucumbers, rain and socks!" }),
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

  let catX = (W - CAT_W) / 2;
  let target = catX;
  let trail = []; // recent positions, for zoomies afterimages
  let items = [];
  let pops = []; // floating words
  let bits = []; // crumbs and droplets
  let caught = 0;
  let streak = 0;
  const spooks = { cucumber: 0, rain: 0, sock: 0 };
  // Mimi's moods, as times (ms) they last until
  let chompUntil = 0, spookUntil = 0, spookAt = 0, wetUntil = 0, blepUntil = 0, zoomUntil = 0;
  let nextItem = 0;
  let raf;
  let last = performance.now();
  const started = last;
  let ended = false;

  const play = (fn) => sound && fn();
  const pop = (text, x, y, color = colors.ink) => pops.push({ text, x, y, age: 0, color });
  const burst = (x, y, color, n, up = 1) => {
    for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: -(15 + Math.random() * 30) * up, color, age: 0 });
  };

  function spawn(now, elapsed) {
    const kind = BAG[Math.floor(Math.random() * BAG.length)];
    const k = KINDS[kind];
    const w = k.art[0].length;
    items.push({ kind, x: 3 + Math.random() * (W - w - 6), y: -k.art.length, vy: (24 + Math.random() * 14 + elapsed / 1000) * (k.speed ?? 1), w, h: k.art.length });
    nextItem = now + Math.max(330, 820 - elapsed / 45) * (0.7 + Math.random() * 0.6);
  }

  function hit(item, now, center, mouthTop) {
    const k = KINDS[item.kind];
    if (k.food) {
      streak += 1;
      let worth = k.worth;
      chompUntil = now + 260;
      burst(center, mouthTop, k.colors.F, 4);
      if (streak % STREAK_BONUS === 0) {
        worth += 2;
        pop(`${streak} in a row! +2`, W / 2, 28, colors.accent);
        play(() => jingle("win"));
      }
      else play(() => playNote(NOTES[Math.min((streak - 1) % NOTES.length, NOTES.length - 1)], { dur: 0.12, volume: 0.6 }));
      caught += worth;
      score.textContent = `${caught} fish`;
      pop(`+${k.worth}`, center, mouthTop - 4, item.kind === "gold" ? "#b7791f" : colors.ink);
      return;
    }
    if (item.kind === "heart") {
      zoomUntil = now + 5000;
      pop("zoomies!", center, mouthTop - 6, colors.accent);
      burst(center, mouthTop, "#ff9ebe", 8);
      play(() => sfx("sparkle"));
      return;
    }
    streak = 0;
    spooks[item.kind] += 1;
    if (item.kind === "cucumber") {
      spookAt = now;
      spookUntil = now + 1200;
      pop("EEK!", center, mouthTop - 10, colors.accent);
      play(() => sfx("boing"));
    }
    else if (item.kind === "rain") {
      wetUntil = now + 1800;
      pop("pfft!", center, mouthTop - 8);
      burst(center, mouthTop - 6, "#3f8fd2", 10);
      play(() => sfx("splash"));
    }
    else if (item.kind === "sock") {
      blepUntil = now + 450;
      pop("blep", center, mouthTop - 8);
      play(() => sfx("blep"));
      // Spat back out: it flies up and away.
      items.push({ ...item, y: mouthTop - item.h - 2, vy: -70, vx: (Math.random() < 0.5 ? -1 : 1) * 30, spat: true });
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
    for (const it of items) drawArt(ctx, KINDS[it.kind].art, KINDS[it.kind].colors, Math.round(it.x), Math.round(it.y));

    // Mimi's face follows what's going on.
    const mouthTop = H - CAT_H + 4;
    const spooked = now < spookUntil;
    const wet = now < wetUntil;
    const hungry = items.some((it) => KINDS[it.kind].food && !it.spat && it.y + it.h > mouthTop - 26 && it.y < mouthTop
      && it.x + it.w / 2 > catX && it.x + it.w / 2 < catX + CAT_W);
    const eyes = now < chompUntil ? "happy" : wet ? "closed" : now < blepUntil ? "closed" : "open";
    const mouth = spooked || now < blepUntil || (hungry && now >= chompUntil) ? "open" : "closed";
    const jump = spooked ? Math.max(0, Math.sin(Math.min(1, (now - spookAt) / 450) * Math.PI)) * 14 : 0;
    const shake = wet ? (Math.floor(now / 60) % 2 ? 1 : -1) : 0;

    if (now < zoomUntil) {
      ctx.globalAlpha = 0.25;
      for (const x of [trail[7], trail[4]]) if (x != null) drawSpriteCanvas(ctx, Math.round(x), H - CAT_H - 1, 1, look);
      ctx.globalAlpha = 1;
    }
    drawSpriteCanvas(ctx, Math.round(catX) + shake, H - CAT_H - 1 - Math.round(jump), 1, { ...look, eyes, mouth });
    if (spooked) {
      ctx.fillStyle = colors.accent;
      ctx.fillRect(Math.round(catX) + 29, H - CAT_H - 4 - Math.round(jump), 1, 4);
      ctx.fillRect(Math.round(catX) + 29, H - CAT_H + 1 - Math.round(jump), 1, 1);
    }

    for (const b of bits) {
      ctx.globalAlpha = Math.max(0, 1 - b.age / 600);
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    }
    ctx.font = "6px DotGothic16, monospace";
    ctx.textAlign = "center";
    for (const p of pops) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.age / 900);
      ctx.fillText(p.text, Math.min(W - 14, Math.max(14, p.x)), p.y - p.age / 60);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(50, now - last)) / 1000;
    last = now;
    const elapsed = now - started;
    const left = Math.max(0, ROUND_MS - elapsed);
    timer.textContent = `0:${String(Math.ceil(left / 1000)).padStart(2, "0")}`;
    if (now >= nextItem && left > 600) spawn(now, elapsed);

    // Spooked: frozen. Wet: slow. Zoomies: fast.
    const pace = now < spookUntil ? 0 : now < wetUntil ? 3 : now < zoomUntil ? 26 : 12;
    catX += (target - catX) * Math.min(1, dt * pace);
    trail = [catX, ...trail].slice(0, 8);

    const mouthTop = H - CAT_H + 4;
    const reach = now < zoomUntil ? [-3, CAT_W + 3] : [4, CAT_W - 4];
    items = items.filter((it) => {
      it.y += it.vy * dt;
      if (it.spat) {
        it.x += it.vx * dt;
        it.vy += 120 * dt;
        return it.y > -it.h - 2 && it.y < H;
      }
      const center = it.x + it.w / 2;
      if (now >= spookUntil && it.y + it.h >= mouthTop && it.y < mouthTop + 6 && center > catX + reach[0] && center < catX + reach[1]) {
        hit(it, now, center, mouthTop);
        return false;
      }
      if (it.y > H) {
        if (KINDS[it.kind].food) streak = 0;
        return false;
      }
      return true;
    });
    for (const b of bits) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 90 * dt;
      b.age += dt * 1000;
    }
    bits = bits.filter((b) => b.age < 600);
    pops = pops.filter((p) => (p.age += dt * 1000) < 900);
    draw(now);

    if (left <= 0) return finish();
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    if (ended) return;
    cleanup();
    onEnd({ score: caught, spooks });
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
