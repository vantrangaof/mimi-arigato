// Treat toss: pull back and let go (like a slingshot) to flick a treat up into Mimi's open
// mouth. 10 treats. From the third treat a breeze pushes them sideways (the arrow and leaves
// show which way), and from the sixth Mimi gets sleepy and sways on their cushion.
// A treat has to drop in from above (or at the top of its arc); one that lands on Mimi's head
// bonks off. Keyboard: arrows to aim, Space to throw.

import { el, pick } from "../core/dom.js";
import { drawSpriteCanvas, FURS } from "../cat/sprite.js";
import { playNote } from "../cat/music.js";

const W = 100; // the field in sprite pixels
const H = 112;
const CAT_W = 32;
const CAT_Y = 18; // top of Mimi's sprite
const GROUND = H - 3;
const LAUNCH = { x: 50, y: 98 };
const TREATS = 10;
const GRAVITY = 120; // pixels per second squared
const MAX_SPEED = 170;
const PULL = 3.4; // speed per pixel of pull
const PREVIEW_S = 0.7; // how much of the path the dotted line shows
const TREAT = { art: [".bb.b", "bBBbb", ".bb.b"], colors: { b: "#b7791f", B: "#ffd76a" } };
const ARROW = ["..o.", "oooo", "..o."];
const LEAVES = ["#8fd19a", "#ffb38a", "#e2a83a"];
const MISSES = ["plop", "boop", "oops", "so close!"];

function drawArt(ctx, rows, colors, x0, y0, flip = false) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!colors[ch]) return;
    ctx.fillStyle = colors[ch];
    ctx.fillRect(x0 + (flip ? row.length - 1 - x : x), y0 + y, 1, 1);
  }));
}

export function startToss({ root, cat, sound, onEnd }) {
  const canvas = el("canvas", { class: "game-canvas game-canvas-aim", "aria-label": "Treat toss. Pull back and let go to throw a treat into Mimi's mouth, or aim with the arrow keys and press Space.", tabindex: "0", role: "img" });
  const score = el("span", { class: "game-score", "aria-live": "polite", text: "0 treats" });
  const count = el("span", { class: "game-timer", text: `treat 1 of ${TREATS}` });
  root.replaceChildren(
    el("div", { class: "game-hud" }, score, count),
    canvas,
    el("p", { class: "muted small game-hint", text: "Pull back and let go to toss. Drop it into Mimi's mouth from above! Mind the breeze." }),
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
  const colors = { paper: css.getPropertyValue("--paper").trim() || "#fcf2f6", grid: css.getPropertyValue("--grid-strong").trim(), floor: css.getPropertyValue("--floor-edge").trim(), ink: css.getPropertyValue("--ink").trim(), accent: css.getPropertyValue("--accent").trim() || "#d64f86", soft: css.getPropertyValue("--ink-soft").trim() };
  const look = { fur: FURS[cat.fur] ? cat.fur : "pink", wear: cat.wear };

  let round = 0; // which treat (0-based)
  let caught = 0;
  let bonks = 0;
  let state = "aim"; // aim | fly | wait
  let treat = null; // { x, y, vx, vy, done, landed }
  let pull = null; // the slingshot pull while aiming, { x, y } in field pixels
  let dragFrom = null;
  let keyAim = { angle: 0, power: 0.6 }; // angle in radians from straight up; power 0..1 (0.6 tops out at the mouth)
  let keyAiming = false;
  let wind = 0;
  let leaves = [];
  let pops = [];
  let bits = [];
  let catX = (W - CAT_W) / 2;
  let chompUntil = 0, bonkUntil = 0, waitUntil = 0;
  let raf;
  let last = performance.now();
  let ended = false;

  const play = (fn) => sound && fn();
  const pop = (text, x, y, color = colors.ink) => pops.push({ text, x, y, age: 0, color });
  const burst = (x, y, color, n) => {
    for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: -(15 + Math.random() * 30), color, age: 0 });
  };
  const mouth = () => ({ x: catX + 16, y: CAT_Y + 16 });
  const sleepy = () => round >= 5;

  function setUp() {
    // The breeze picks up as you go; the first two treats are calm.
    wind = round < 2 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * (4 + round * 2.5));
    leaves = wind ? Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: 6 + Math.random() * 50, phase: Math.random() * 6, color: pick(LEAVES) })) : [];
    count.textContent = `treat ${round + 1} of ${TREATS}`;
    state = "aim";
    treat = null;
  }

  // The throw for the current aim: the pull (pointer) or the angle and power (keyboard).
  function velocity() {
    if (pull) {
      let vx = pull.x * PULL;
      let vy = pull.y * PULL;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_SPEED) {
        vx *= MAX_SPEED / speed;
        vy *= MAX_SPEED / speed;
      }
      return { vx, vy };
    }
    const speed = 60 + keyAim.power * (MAX_SPEED - 60);
    return { vx: Math.sin(keyAim.angle) * speed, vy: -Math.cos(keyAim.angle) * speed };
  }

  function aiming() {
    return state === "aim" && ((pull && Math.hypot(pull.x, pull.y) > 3) || (!pull && keyAiming));
  }

  function toss() {
    if (state !== "aim") return;
    const v = velocity();
    pull = null;
    dragFrom = null;
    if (v.vy > -20) return; // only upward throws
    treat = { x: LAUNCH.x, y: LAUNCH.y, ...v, done: false, landed: false };
    state = "fly";
    play(() => playNote("G4", { dur: 0.06, instrument: "chip", volume: 0.5 }));
  }

  function resolve(now) {
    treat.done = true;
    state = "wait";
    waitUntil = now + 900;
  }

  function step(now, dt) {
    if (sleepy()) {
      // Swaying sleepily, a little more each treat.
      const amp = 4 + (round - 5) * 2.5;
      catX = (W - CAT_W) / 2 + Math.sin(now / (900 - round * 30)) * amp;
    }
    for (const l of leaves) {
      l.x += wind * 0.9 * dt;
      l.y += Math.sin(now / 300 + l.phase) * 6 * dt;
      if (l.x > W + 2) l.x = -2;
      if (l.x < -2) l.x = W + 2;
    }

    if (treat && !treat.landed) {
      treat.vx += wind * dt;
      treat.vy += GRAVITY * dt;
      treat.x += treat.vx * dt;
      treat.y += treat.vy * dt;
      const m = mouth();
      if (!treat.done) {
        // Into the mouth: near the top of the arc or dropping in.
        if (Math.abs(treat.x - m.x) <= 5 && Math.abs(treat.y - m.y) <= 4 && treat.vy > -40) {
          caught += 1;
          score.textContent = `${caught} ${caught === 1 ? "treat" : "treats"}`;
          chompUntil = now + 320;
          burst(m.x, m.y, TREAT.colors.B, 5);
          pop(caught % 3 === 0 ? "nom nom!" : "+1", m.x, m.y - 8, colors.accent);
          play(() => playNote(["C5", "E5", "G5", "C6"][Math.min(3, round % 4)], { dur: 0.16, instrument: "box" }));
          resolve(now);
          treat = null;
          return;
        }
        // Landing on Mimi's head (anywhere but right above the mouth): bonk!
        const onHead = treat.vy > 0 && treat.x > catX + 4 && treat.x < catX + 28 && Math.abs(treat.x - m.x) > 6
          && treat.y > CAT_Y + 3 && treat.y < CAT_Y + 10;
        if (onHead) {
          bonks += 1;
          bonkUntil = now + 500;
          treat.vy = -Math.abs(treat.vy) * 0.35 - 20;
          treat.vx += treat.x < catX + 16 ? -30 : 30;
          pop("bonk!", treat.x, CAT_Y, colors.accent);
          play(() => playNote("E4", { dur: 0.08, instrument: "chip", volume: 0.7 }));
          resolve(now);
        }
      }
      if (treat.y >= GROUND - 2) {
        treat.y = GROUND - 2;
        treat.landed = true;
        if (!treat.done) {
          pop(pick(MISSES), Math.min(W - 14, Math.max(14, treat.x)), GROUND - 8, colors.soft);
          play(() => playNote("C4", { dur: 0.1, instrument: "soft", volume: 0.7 }));
          resolve(now);
        }
      }
      else if (treat.x < -8 || treat.x > W + 8) {
        if (!treat.done) {
          pop("whoosh", treat.x < 0 ? 16 : W - 16, Math.max(10, treat.y), colors.soft);
          resolve(now);
        }
        treat = null;
      }
    }

    if (state === "wait" && now >= waitUntil) {
      round += 1;
      if (round >= TREATS) return finish();
      setUp();
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
    ctx.fillRect(0, GROUND, W, 3);

    // The breeze.
    if (wind) {
      const strength = Math.min(3, Math.ceil(Math.abs(wind) / 14));
      for (let i = 0; i < strength; i++) drawArt(ctx, ARROW, { o: colors.soft }, 3 + i * 5, 4, wind < 0);
      for (const l of leaves) {
        ctx.fillStyle = l.color;
        ctx.fillRect(Math.round(l.x), Math.round(l.y), 2, 1);
      }
    }

    // Mimi on a floating cushion.
    const cx = Math.round(catX);
    ctx.fillStyle = "#c9588a";
    ctx.fillRect(cx + 2, CAT_Y + 27, 28, 5);
    ctx.fillStyle = "#ff9ebe";
    ctx.fillRect(cx + 3, CAT_Y + 28, 26, 3);
    const m = mouth();
    const near = treat && !treat.done && Math.hypot(treat.x - m.x, treat.y - m.y) < 26;
    const eyes = now < chompUntil ? "happy"
      : now < bonkUntil ? "closed"
      : near ? "open"
      : sleepy() && Math.floor(now / 1400) % 3 === 0 ? "closed"
      : "open";
    drawSpriteCanvas(ctx, cx, CAT_Y, 1, { ...look, eyes, mouth: near && now >= chompUntil ? "open" : "closed" });
    if (sleepy() && eyes === "closed" && !near) {
      ctx.fillStyle = colors.soft;
      ctx.font = "6px DotGothic16, monospace";
      ctx.textAlign = "left";
      ctx.fillText("z", cx + 29, CAT_Y + 6 - (Math.floor(now / 400) % 3));
    }

    // The dotted path while aiming.
    if (aiming()) {
      const v = velocity();
      let x = LAUNCH.x, y = LAUNCH.y, vx = v.vx, vy = v.vy;
      ctx.fillStyle = colors.accent;
      for (let t = 0, i = 0; t < PREVIEW_S; t += 1 / 60, i++) {
        vx += wind / 60;
        vy += GRAVITY / 60;
        x += vx / 60;
        y += vy / 60;
        if (i % 4 === 3) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }

    // The slingshot and the treat waiting in it.
    ctx.fillStyle = colors.soft;
    ctx.fillRect(LAUNCH.x - 6, LAUNCH.y + 2, 1, GROUND - LAUNCH.y - 2);
    ctx.fillRect(LAUNCH.x + 6, LAUNCH.y + 2, 1, GROUND - LAUNCH.y - 2);
    if (state === "aim") {
      const back = pull ? Math.min(1, 8 / Math.max(1, Math.hypot(pull.x, pull.y))) : 0;
      const tx = LAUNCH.x - (pull ? pull.x * back : 0);
      const ty = LAUNCH.y - (pull ? pull.y * back : 0);
      ctx.fillStyle = colors.accent;
      for (const side of [-6, 6]) {
        const steps = 6;
        for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(LAUNCH.x + side + (tx - LAUNCH.x - side) * (i / steps)), Math.round(LAUNCH.y + 2 + (ty - LAUNCH.y - 2) * (i / steps)), 1, 1);
      }
      drawArt(ctx, TREAT.art, TREAT.colors, Math.round(tx) - 2, Math.round(ty) - 1);
    }
    else if (treat) drawArt(ctx, TREAT.art, TREAT.colors, Math.round(treat.x) - 2, Math.round(treat.y) - 1, treat.vx < 0);

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
    step(now, dt);
    if (ended) return;
    for (const b of bits) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 90 * dt;
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
    onEnd({ score: caught, bonks });
  }

  const field = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const down = (e) => {
    if (state !== "aim") return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture?.(e.pointerId);
    keyAiming = false;
    dragFrom = field(e);
    pull = { x: 0, y: 0 };
  };
  const move = (e) => {
    if (!dragFrom) return;
    const p = field(e);
    pull = { x: dragFrom.x - p.x, y: dragFrom.y - p.y }; // pull down and back to throw up and forward
  };
  const up = () => {
    if (!dragFrom) return;
    if (pull && Math.hypot(pull.x, pull.y) > 3) toss();
    else {
      pull = null;
      dragFrom = null;
    }
  };
  const keys = (e) => {
    const turn = { ArrowLeft: -0.06, ArrowRight: 0.06 }[e.key];
    const power = { ArrowUp: 0.04, ArrowDown: -0.04 }[e.key];
    if (turn || power) {
      e.preventDefault();
      keyAiming = true;
      if (turn) keyAim.angle = Math.max(-0.8, Math.min(0.8, keyAim.angle + turn));
      if (power) keyAim.power = Math.max(0, Math.min(1, keyAim.power + power));
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (e.repeat) return;
      pull = null;
      toss();
    }
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("keydown", keys);
  addEventListener("resize", size);
  setUp();
  canvas.focus({ preventScroll: true });
  raf = requestAnimationFrame(frame);

  function cleanup() {
    ended = true;
    cancelAnimationFrame(raf);
    removeEventListener("resize", size);
  }
  return cleanup;
}
