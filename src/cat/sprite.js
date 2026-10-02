// The pixel cat: sprite data, fur palettes, accessory layers, and SVG/canvas rendering.
// Legend:
//   d outline  @ inner-ear  O body  L chest  s floor shadow  T tail
//   E eye      W eye-shine  B blush  N nose   H mouth
//   accessories: R/r ribbon  P/f/y flower  S/v/k scarf  G/g/J crown  Q glasses  p/b party hat  m beret

import { drawPixels, group, pixelSVG } from "../core/pixel.js";

const BODY = [
  "................................",
  "................................",
  "................................",
  "......dd................dd......",
  ".....d@d................d@d.....",
  ".....d@@d..............d@@d.....",
  "....d@@@@d............d@@@@d....",
  "....d@@@@@dddddddddddd@@@@@d....",
  "...dOO@@OOOOOOOOOOOOOOOO@@OOd...",
  "...dOOOOOOOOOOOOOOOOOOOOOOOOd...",
  "..dOOOOOOOOOOOOOOOOOOOOOOOOOOd..",
  "..dOOOOOOOOOOOOOOOOOOOOOOOOOOd..",
  "..dOOOOOOOOOOOOOOOOOOOOOOOOOOd..",
  "..dOOOOOOOOOOOOOOOOOOOOOOOOOOd..",
  "..dOOBBOOOOOOOONNOOOOOOOOBBOOd..",
  "..dOOBBOOOOOOHOHHOHOOOOOOBBOOd..",
  "..dOOOOOOOOOOOHOOHOOOOOOOOOOOd..",
  "...dOOOOOOOOOOOOOOOOOOOOOOOOd...",
  "....dOOOOOOOOOOOOOOOOOOOOOOd....",
  ".....dddOOOOOOOOOOOOOOOOddd.....",
  ".......dOOOOLLLLLLLLOOOOd.......",
  "......dOOOOOLLLLLLLLOOOOOd......",
  "......dOOOOOLLLLLLLLOOOOOd......",
  ".....dOOOOOOOLLLLLLOOOOOOOd.....",
  ".....dOOOOdOOOOOOOOOOdOOOOd.....",
  ".....dOOOOdOOOOddOOOOdOOOOd.....",
  ".....dOOOOdOOOOddOOOOdOOOOd.....",
  "......dddddddddddddddddddd......",
  ".......ssssssssssssssssss.......",
];

// Layers drawn over BODY, each [x0, y0, rows]. CSS classes on the wrapper pick which are visible.
const EYES_OPEN = [8, 11, ["WEE..........WEE", "EEE..........EEE", "EEE..........EEE"]];
const EYES_CLOSED = [8, 12, ["EEE..........EEE"]];
const EYES_HAPPY = [8, 11, [".E............E.", "E.E..........E.E"]];
const MOUTH_OPEN = [13, 15, ["OHHHHO", "OHNNHO"]];
const PAW_UP = [9, 16, [".dddd.", "dOOOOd", "dOdOdd", ".dddd."]];
const TAIL_UP = [26, 19, [
  "...dd.", "..dTTd", "..dTTd", ".dTTd.", ".TTd..", ".TTd..", ".TTd..", ".TTd..", "ddd...",
]];
const TAIL_FLICK = [26, 19, [
  "..dd..", ".dTTd.", "..dTTd", ".dTTd.", ".TTd..", ".TTd..", ".TTd..", ".TTd..", "ddd...",
]];

const ACCESSORY_LAYERS = {
  bow: [24, 6, ["rr...rr", "rRr.rRr", "rRRrRRr", "rRr.rRr", "rr...rr"]],
  flower: [3, 3, [".fPf.", "fPPPf", "PPyPP", "fPPPf", ".fPf."]],
  scarf: [5, 19, [
    "kSSSSSSSSSSSSSSSSSSSSk",
    "kvvvvvvvvvvvvvvvvvvvvk",
    "...kSk", "...kSk", "...ksk", "...kkk",
  ]],
  crown: [12, 3, ["G..GG..G", "GG.GG.GG", "GGGGGGGG", "gJggggJg"]],
  glasses: [6, 10, [
    ".QQQQQ........QQQQQ.",
    "Q.....QQQQQQQQ.....Q",
    "Q.....Q......Q.....Q",
    "Q.....Q......Q.....Q",
    ".QQQQQ........QQQQQ.",
  ]],
  partyhat: [13, 0, ["..yy..", "..pp..", "..pb..", ".pppp.", ".bppp.", ".ppbp.", "pppppp"]],
  bell: [6, 19, [
    "RRRRRRRRRRRRRRRRRRRR",
    ".........yy.........",
    "........yyyy........",
    ".........QQ.........",
  ]],
  beret: [8, 4, ["....m...", "..mmmmm.", ".mmmmmmm", "mmmmmmmm"]],
};

const ACCESSORY_COLORS = {
  R: "#ef5a8a", r: "#a8325c",
  P: "#fffdf2", f: "#e2a83a", y: "#ffc93c",
  S: "#7fb3e6", v: "#5b8fc9", k: "#3f6797",
  G: "#ffd45e", g: "#d8a425", J: "#ff6f9f",
  Q: "#3b2a36", p: "#ff6f9f", b: "#7fb3e6", m: "#b23a48",
};

// A standalone picture of one accessory (for the wardrobe tiles).
export function accessoryPreview(id, className) {
  const [, , rows] = ACCESSORY_LAYERS[id];
  return pixelSVG(rows, ACCESSORY_COLORS, className);
}

export const FURS = {
  pink: { label: "Strawberry", body: "#ffd4e4", chest: "#fff0f6", outline: "#c9588a", inner: "#ff8bb0", eye: "#2b1a2e", shine: "#ffffff", blush: "#ff9ebe", nose: "#d64f86", mouth: "#8a3a56" },
  peach: { label: "Peach", body: "#ffd6ae", chest: "#fff3e4", outline: "#c97a45", inner: "#ffa98a", eye: "#2b1a1e", shine: "#ffffff", blush: "#ffaa96", nose: "#e0704e", mouth: "#87482a" },
  gray: { label: "Cloud", body: "#dcdbe6", chest: "#f5f5fa", outline: "#7a7a96", inner: "#f4a6c0", eye: "#2a2836", shine: "#ffffff", blush: "#f6b4c8", nose: "#e0839f", mouth: "#545470" },
  midnight: { label: "Midnight", body: "#3e3549", chest: "#5d526c", outline: "#1c1723", inner: "#e48aae", eye: "#ffd76a", shine: "#ffffff", blush: "#b9658a", nose: "#ff8bb0", mouth: "#c7b3d4" },
  snow: { label: "Snow", body: "#ffffff", chest: "#f7eef3", outline: "#b49aaa", inner: "#ffc0d3", eye: "#2b1a2e", shine: "#ffffff", blush: "#ffc4d6", nose: "#f08aae", mouth: "#8c6f80" },
};

const FUR_VARS = {
  body: "--cat-body", chest: "--cat-chest", outline: "--cat-outline", inner: "--cat-inner", eye: "--cat-eye",
  shine: "--cat-shine", blush: "--cat-blush", nose: "--cat-nose", mouth: "--cat-mouth",
};

// Sprite characters map to a fur key (canvas) or CSS variable (SVG).
const FUR_KEY = { d: "outline", "@": "inner", O: "body", T: "body", L: "chest", E: "eye", W: "shine", B: "blush", N: "nose", H: "mouth" };
const svgColor = (ch) => (FUR_KEY[ch] ? `var(${FUR_VARS[FUR_KEY[ch]]})` : ch === "s" ? "var(--cat-shadow)" : ACCESSORY_COLORS[ch]);

function drawLayer(parent, className, [x0, y0, rows], { only, map = {} } = {}) {
  const g = group(parent, className);
  const visible = only ? rows.map((r) => [...r].map((ch) => (only.includes(ch) ? ch : ".")).join("")) : rows;
  const mapped = visible.map((r) => [...r].map((ch) => map[ch] ?? ch).join(""));
  drawPixels(g, x0, y0, mapped, svgColor, (ch) => (ch === "B" ? "blush" : null));
  return g;
}

// Draws Mimi into the SVG. Returns look(x, y): point the eyes at a viewport position,
// look(null) to recenter, and look.dir(dx, dy) to glance in a direction (-1, 0, 1).
export function renderCat(svg) {
  drawLayer(svg, "", [0, 0, BODY], { map: { H: "O" } });
  drawLayer(svg, "mouth mouth-closed", [0, 0, BODY], { only: "H" });
  drawLayer(svg, "mouth mouth-open", MOUTH_OPEN);
  drawLayer(svg, "tail tail-up", TAIL_UP);
  drawLayer(svg, "tail tail-flick", TAIL_FLICK);
  const eyes = group(svg, "look");
  drawLayer(eyes, "eyes eyes-open", EYES_OPEN);
  drawLayer(eyes, "eyes eyes-closed", EYES_CLOSED);
  drawLayer(eyes, "eyes eyes-happy", EYES_HAPPY);
  drawLayer(svg, "paw-up", PAW_UP);
  for (const [id, layer] of Object.entries(ACCESSORY_LAYERS)) drawLayer(svg, `acc acc-${id}`, layer);

  let idle;
  const dir = (dx, dy) => {
    clearTimeout(idle);
    if (!dx && !dy) eyes.removeAttribute("transform");
    else eyes.setAttribute("transform", `translate(${dx} ${dy})`);
  };
  const look = (x, y) => {
    if (x == null) return dir(0, 0);
    const r = svg.getBoundingClientRect();
    const cell = r.width / 32;
    const step = (d) => (Math.abs(d) < cell * 3 ? 0 : Math.sign(d));
    dir(step(x - (r.left + 16 * cell)), step(y - (r.top + 12.5 * cell)));
    idle = setTimeout(() => dir(0, 0), 2500);
  };
  look.dir = dir;
  return look;
}

// wear: { head, neck, face } item ids ("none" for an empty slot).
export function applyLook(wrap, { fur, wear }) {
  const palette = FURS[fur];
  for (const [key, cssVar] of Object.entries(FUR_VARS)) {
    // Strawberry keeps the stylesheet colors so its dark-mode tweaks still apply.
    if (palette && fur !== "pink") wrap.style.setProperty(cssVar, palette[key]);
    else wrap.style.removeProperty(cssVar);
  }
  wrap.dataset.wear = Object.values(wear).filter((id) => ACCESSORY_LAYERS[id]).join(" ");
}

export function drawSpriteCanvas(ctx, x0, y0, cell, { fur, wear = {} }) {
  const palette = FURS[fur] ?? FURS.pink;
  const grid = BODY.map((r) => [...r]);
  const overlay = ([lx, ly, rows]) =>
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") grid[ly + y][lx + x] = ch; }));
  overlay(EYES_OPEN);
  overlay(TAIL_UP);
  for (const id of Object.values(wear)) if (ACCESSORY_LAYERS[id]) overlay(ACCESSORY_LAYERS[id]);
  grid.forEach((row, y) => row.forEach((ch, x) => {
    const color = ch === "s" ? "rgba(201, 88, 138, 0.16)" : FUR_KEY[ch] ? palette[FUR_KEY[ch]] : ACCESSORY_COLORS[ch];
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
  }));
}
