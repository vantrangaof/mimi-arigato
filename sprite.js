// Pixel cat: sprite data, fur palettes, accessories, SVG + canvas rendering.
// Legend:
//   d outline  @ inner-ear  O body  L chest  s floor shadow  T tail
//   E eye      W eye-shine  B blush  N nose   H mouth
//   accessories: R/r ribbon  P/f/y flower  S/s/k scarf  G/g/J crown

export const SVGNS = "http://www.w3.org/2000/svg";

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

// Layers drawn over BODY. Each is [x0, y0, rows].
const EYES_OPEN = [8, 11, ["WEE..........WEE", "EEE..........EEE", "EEE..........EEE"]];
const EYES_CLOSED = [8, 12, ["EEE..........EEE"]];
const EYES_HAPPY = [8, 11, [".E............E.", "E.E..........E.E"]];
const MOUTH_OPEN = [13, 15, ["OHHHHO", "OHNNHO"]];
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
    "kssssssssssssssssssssk",
    "...kSk", "...kSk", "...ksk", "...kkk",
  ]],
  crown: [12, 3, ["G..GG..G", "GG.GG.GG", "GGGGGGGG", "gJggggJg"]],
};

export const ACCESSORIES = [
  { id: "bow", label: "Ribbon bow", need: 5 },
  { id: "flower", label: "Little flower", need: 15 },
  { id: "scarf", label: "Cozy scarf", need: 35 },
  { id: "crown", label: "Tiny crown", need: 70 },
];

const ACCESSORY_COLORS = {
  R: "#ef5a8a", r: "#a8325c",
  P: "#fffdf2", f: "#e2a83a", y: "#ffc93c",
  S: "#7fb3e6", s: "#5b8fc9", k: "#3f6797",
  G: "#ffd45e", g: "#d8a425", J: "#ff6f9f",
};

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

const SPRITE_VARS = {
  d: "--cat-outline", "@": "--cat-inner", O: "--cat-body", T: "--cat-body", L: "--cat-chest",
  s: "--cat-shadow", E: "--cat-eye", W: "--cat-shine", B: "--cat-blush", N: "--cat-nose", H: "--cat-mouth",
};

const FUR_KEY = { d: "outline", "@": "inner", O: "body", T: "body", L: "chest", E: "eye", W: "shine", B: "blush", N: "nose", H: "mouth" };

function svgColor(ch) {
  if (SPRITE_VARS[ch]) return `var(${SPRITE_VARS[ch]})`;
  return ACCESSORY_COLORS[ch];
}

function group(parent, className) {
  const g = document.createElementNS(SVGNS, "g");
  if (className) g.setAttribute("class", className);
  parent.appendChild(g);
  return g;
}

function drawLayer(parent, className, [x0, y0, rows], { only, map = {} } = {}) {
  const g = group(parent, className);
  rows.forEach((row, y) => {
    [...row].forEach((raw, x) => {
      if (only && !only.includes(raw)) return;
      const ch = map[raw] ?? raw;
      const fill = svgColor(ch);
      if (!fill) return;
      const rect = document.createElementNS(SVGNS, "rect");
      rect.setAttribute("x", x0 + x);
      rect.setAttribute("y", y0 + y);
      rect.setAttribute("width", 1);
      rect.setAttribute("height", 1);
      rect.setAttribute("fill", fill);
      if (ch === "B") rect.classList.add("blush");
      g.appendChild(rect);
    });
  });
  return g;
}

// Returns a function that points Mimi's eyes at a viewport position (or recenters with null).
export function renderCat(svg) {
  drawLayer(svg, "", [0, 0, BODY], { map: { H: "O" } });
  drawLayer(svg, "mouth mouth-closed", [0, 0, BODY], { only: "H" });
  drawLayer(svg, "mouth mouth-open", MOUTH_OPEN);
  drawLayer(svg, "tail tail-up", TAIL_UP);
  drawLayer(svg, "tail tail-flick", TAIL_FLICK);
  const look = group(svg, "look");
  drawLayer(look, "eyes eyes-open", EYES_OPEN);
  drawLayer(look, "eyes eyes-closed", EYES_CLOSED);
  drawLayer(look, "eyes eyes-happy", EYES_HAPPY);
  for (const [id, layer] of Object.entries(ACCESSORY_LAYERS)) drawLayer(svg, `acc acc-${id}`, layer);

  let idle;
  return (x, y) => {
    clearTimeout(idle);
    if (x == null) {
      look.removeAttribute("transform");
      return;
    }
    const r = svg.getBoundingClientRect();
    const cell = r.width / 32;
    const dx = x - (r.left + 16 * cell);
    const dy = y - (r.top + 12.5 * cell);
    const step = (d) => (Math.abs(d) < cell * 3 ? 0 : Math.sign(d));
    look.setAttribute("transform", `translate(${step(dx)} ${step(dy)})`);
    idle = setTimeout(() => look.removeAttribute("transform"), 2500);
  };
}

export function applyLook(wrap, { fur, accessory }) {
  const palette = FURS[fur];
  for (const [key, cssVar] of Object.entries(FUR_VARS)) {
    // Strawberry keeps the stylesheet colors so its dark-mode tweaks still apply.
    if (palette && fur !== "pink") wrap.style.setProperty(cssVar, palette[key]);
    else wrap.style.removeProperty(cssVar);
  }
  wrap.dataset.accessory = accessory;
}

export function drawSpriteCanvas(ctx, x0, y0, cell, { fur, accessory }) {
  const palette = FURS[fur] ?? FURS.pink;
  const grid = BODY.map((r) => [...r]);
  const overlay = ([lx, ly, rows]) =>
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") grid[ly + y][lx + x] = ch; }));
  overlay(EYES_OPEN);
  overlay(TAIL_UP);
  if (ACCESSORY_LAYERS[accessory]) overlay(ACCESSORY_LAYERS[accessory]);
  grid.forEach((row, y) => row.forEach((ch, x) => {
    const color = ch === "s" ? "rgba(201, 88, 138, 0.16)" : FUR_KEY[ch] ? palette[FUR_KEY[ch]] : ACCESSORY_COLORS[ch];
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
  }));
}

export function pixelSVG(rows, colors, className) {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${rows[0].length} ${rows.length}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!colors[ch]) return;
    const rect = document.createElementNS(SVGNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", 1);
    rect.setAttribute("height", 1);
    rect.setAttribute("fill", colors[ch]);
    svg.appendChild(rect);
  }));
  return svg;
}
