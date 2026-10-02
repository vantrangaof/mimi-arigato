// Mimi's little world: what unlocks as good things add up, the pixel room, and found treasures.

import { drawPixels, svgEl } from "../core/pixel.js";

// Things Mimi can wear: one per slot. need = good things required (0 = free from the start).
export const SLOTS = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "face", label: "Face" },
];

export const ACCESSORIES = [
  { id: "partyhat", slot: "head", label: "party hat", need: 0 },
  { id: "bell", slot: "neck", label: "bell collar", need: 0 },
  { id: "glasses", slot: "face", label: "round glasses", need: 0 },
  { id: "flower", slot: "head", label: "little flower", need: 5 },
  { id: "bow", slot: "head", label: "ribbon bow", need: 15 },
  { id: "scarf", slot: "neck", label: "cozy scarf", need: 40 },
  { id: "beret", slot: "head", label: "beret", need: 120 },
  { id: "crown", slot: "head", label: "tiny crown", need: 200 },
];

const ROOM_ITEMS = [
  { id: "plant", label: "tiny plant", need: 30 },
  { id: "cushion", label: "cushion", need: 50 },
  { id: "picture", label: "wall picture", need: 75 },
  { id: "window", label: "window", need: 100 },
  { id: "bookshelf", label: "bookshelf", need: 150 },
  { id: "aquarium", label: "aquarium", need: 250 },
  { id: "starry", label: "starry window", need: 500 },
];

// Everything that unlocks over time, in order: what "next for Mimi's world" points at.
export const WORLD = [
  ...ROOM_ITEMS.map((r) => ({ ...r, kind: "room" })),
  ...ACCESSORIES.filter((a) => a.need > 0).map((a) => ({ ...a, kind: "acc" })),
].sort((x, y) => x.need - y.need);

const findItem = (id) => ROOM_ITEMS.find((r) => r.id === id) ?? ACCESSORIES.find((a) => a.id === id);
export const isUnlocked = (id, total) => {
  const item = findItem(id);
  return Boolean(item) && total >= item.need;
};
export const nextUnlock = (total) => WORLD.find((w) => total < w.need) ?? null;

// What's actually worn: drops anything unknown, locked, or in the wrong slot.
export function validWear(wear = {}, total) {
  return Object.fromEntries(SLOTS.map(({ id: slot }) => {
    const item = ACCESSORIES.find((a) => a.id === wear[slot] && a.slot === slot && total >= a.need);
    return [slot, item?.id ?? "none"];
  }));
}

// Room is 46×34 sprite pixels; Mimi's 32×29 sprite sits at (7, 2).
export const ROOM_W = 46;
export const ROOM_H = 34;

const FRAME_TOP = "kkkkkkkkkkk";
const ART = {
  window: [0, 1, [
    FRAME_TOP, "kFFFFFFFFFk",
    "kFaaaFaaaFk", "kFaaaFaxaFk", "kFaaaFaaaFk",
    "kFFFFFFFFFk",
    "kFaaaFaaaFk", "kFaxaFaaaFk", "kFaaaFaaaFk",
    "kFFFFFFFFFk", FRAME_TOP,
  ]],
  starry: [0, 1, [
    FRAME_TOP, "kFFFFFFFFFk",
    "kFnznFnMMFk", "kFnnnFnMMFk", "kFxnnFnnzFk",
    "kFFFFFFFFFk",
    "kFnnxFznnFk", "kFznnFnnnFk", "kFnnnFnxnFk",
    "kFFFFFFFFFk", FRAME_TOP,
  ]],
  picture: [19, 0, ["kkkkkkkk", "kSSSSSuk", "kShhSSSk", "khhhhhhk", "kkkkkkkk"]],
  plant: [1, 20, [
    "..gg..", ".gGgg.", "gg.gGg", "gGggg.", ".ggGgg", "..gg..",
    "kPPPPk", "kppppk", ".kppk.", ".kkkk.",
  ]],
  cushion: [9, 28, [
    "." + "k".repeat(26) + ".",
    "k" + "c".repeat(26) + "k",
    "k" + "C".repeat(26) + "k",
    "." + "k".repeat(26) + ".",
  ]],
  bookshelf: [39, 15, [
    "kkkkkkk", "kWWWWWk",
    "kRyBmRk", "kRyBmRk", "kRyBmRk",
    "kWWWWWk",
    "kmBbyRk", "kmBRyRk", "kmBRyRk",
    "kWWWWWk",
    "kyRmBbk", "kyRmBBk", "kyRmBBk",
    "kWWWWWk", "kkkkkkk",
  ]],
  aquarium: [39, 10, ["kkkkkkk", "kqqqeqk", "kqooqqk", "kqqqqGk", "kkkkkkk"]],
};

export const TREASURES = {
  button: { label: "tiny button", art: [".c.", "cCc", ".c."] },
  feather: { label: "blue feather", art: ["..f", ".fB", "f.."] },
  shell: { label: "seashell", art: [".s.", "sps", "s.s"] },
  leaf: { label: "little leaf", art: ["..g", ".gG", "G.."] },
  acorn: { label: "acorn", art: [".W.", "www", ".w."] },
  yarn: { label: "ball of yarn", art: [".r.", "rRr", ".r."] },
  star: { label: "star sticker", art: [".y.", "yyy", "y.y"] },
};
const TREASURE_SLOTS = [[0, 31], [4, 31], [39, 31], [43, 31]];

const COLORS = {
  k: "var(--room-line)", F: "var(--room-frame)", a: "var(--sky)", x: "var(--sky-accent)",
  n: "#26285a", z: "#ffffff", M: "#fff7d6",
  S: "#cdeaff", h: "#8fd18f", u: "#ffd45e",
  g: "#7cc47f", G: "#4f9a5c", p: "#e98a6d", P: "#c96a50",
  c: "#c8b4ef", C: "#a48fd8",
  W: "#a8714f", w: "#c98f6b", b: "#e8c9b0",
  R: "#ef6f6c", y: "#ffd166", B: "#7fb3e6", m: "#8fd9b6",
  q: "#9fdcf5", e: "#ffffff", o: "#ff9f43",
  f: "#9ad0ec", s: "#ffc2a8", r: "#ff8fb1",
};

const ROOM_LINES = {
  plant: "waters their tiny plant with a look.",
  cushion: "kneads the cushion happily.",
  picture: "admires the little painting.",
  window: "watches the sky outside.",
  starry: "counts the stars in the window.",
  bookshelf: "pretends to read a book.",
  aquarium: "stares very hard at the fish.",
};

const drawArt = (parent, [x0, y0, rows]) =>
  drawPixels(parent, x0, y0, rows, (ch) => COLORS[ch], (ch) => (ch === "z" ? "twinkle" : null));

export function skyFor(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "dusk";
  return "night";
}

// Draws the room once; returns update({ total, found }) to show what's unlocked.
// onItem(line) is called when an item is clicked so Mimi can comment on it.
export function renderRoom(svg, onItem) {
  svg.append(
    svgEl("rect", { x: 0, y: 29, width: ROOM_W, height: 1, fill: "var(--floor-edge)" }),
    svgEl("rect", { x: 0, y: 30, width: ROOM_W, height: ROOM_H - 30, fill: "var(--floor)" }),
  );

  const items = {};
  for (const [id, art] of Object.entries(ART)) {
    const g = svgEl("g", { class: `room-item item-${id}` });
    drawArt(g, art);
    g.addEventListener("click", () => onItem(ROOM_LINES[id]));
    svg.appendChild(g);
    items[id] = g;
  }
  const treasures = svgEl("g", { class: "treasures" });
  svg.appendChild(treasures);

  return function update({ total, found }) {
    svg.dataset.sky = skyFor();
    for (const [id, g] of Object.entries(items)) {
      const on = isUnlocked(id, total) && !(id === "window" && isUnlocked("starry", total));
      g.classList.toggle("is-on", on);
    }
    treasures.replaceChildren();
    found.slice(-TREASURE_SLOTS.length).forEach((t, i) => {
      const def = TREASURES[t.id];
      if (!def) return;
      const g = svgEl("g", { class: "treasure" });
      const [x, y] = TREASURE_SLOTS[i];
      drawArt(g, [x, y, def.art]);
      g.addEventListener("click", () => onItem(`shows off the ${def.label} they found.`));
      treasures.appendChild(g);
    });
  };
}
