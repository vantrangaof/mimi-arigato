// Mimi's little world: what unlocks as good things add up, the pixel room, and found treasures.

import { drawPixels, svgEl } from "../core/pixel.js";
import { SEASONS, seasonOn } from "./seasons.js";

// Things Mimi can wear: one per slot. need = good things required (0 = free from the start).
// Seasonal items are only in the wardrobe while their event is on (see seasons.js).
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
  { id: "witchhat", slot: "head", label: "witch hat", need: 0, season: "halloween" },
  { id: "ghost", slot: "neck", label: "ghost costume", need: 0, season: "halloween" },
  { id: "santahat", slot: "head", label: "Santa hat", need: 0, season: "christmas" },
  { id: "luckyknot", slot: "neck", label: "lucky knot", need: 0, season: "lunar" },
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
  ...ACCESSORIES.filter((a) => a.need > 0 && !a.season).map((a) => ({ ...a, kind: "acc" })),
].sort((x, y) => x.need - y.need);

const findItem = (id) => ROOM_ITEMS.find((r) => r.id === id) ?? ACCESSORIES.find((a) => a.id === id);
export const isUnlocked = (id, total) => {
  const item = findItem(id);
  return Boolean(item) && total >= item.need;
};
export const nextUnlock = (total) => WORLD.find((w) => total < w.need) ?? null;

// Accessories in the wardrobe right now: everything year-round plus this event's costumes.
export const wardrobeItems = (season = seasonOn()?.id) => ACCESSORIES.filter((a) => !a.season || a.season === season);

// What's actually worn: drops anything unknown, locked, out of season, or in the wrong slot.
export function validWear(wear = {}, total, season = seasonOn()?.id) {
  return Object.fromEntries(SLOTS.map(({ id: slot }) => {
    const item = wardrobeItems(season).find((a) => a.id === wear[slot] && a.slot === slot && total >= a.need);
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

const drawArt = (parent, [x0, y0, rows], colors = COLORS) =>
  drawPixels(parent, x0, y0, rows, (ch) => colors[ch], (ch) => (ch === "z" ? "twinkle" : null));

// The jar of good things on a little shelf under the window: one star per few good things.
const JAR = [0, 12, [
  ".WWWW...",
  "kkkkkk..",
  "k....k..",
  "k....k..",
  "k....k..",
  "k....k..",
  ".kkkk...",
  "WWWWWWWW",
]];
const JAR_INSIDE = [2, 14, 4, 4]; // x, y, width, height of the glass
const STAR_COLORS = ["#ffd166", "#ff8fb1", "#7fb3e6", "#8fd9b6", "#c8b4ef"];
export const jarStars = (total) => Math.min(JAR_INSIDE[2] * JAR_INSIDE[3], Math.ceil(total / 5));

// Mimi's weekly postcard, lying on the floor in front of the cushion.
const POSTCARD = [16, 31, ["kkkkkk", "kSrrSk", "kkkkkk"]];

// The wall picture as a frame for one of your photos (the photo is drawn inside it).
const PHOTO_FRAME = [17, 0, [
  "kkkkkkkkkkkk",
  "kFFFFFFFFFFk",
  "kF........Fk",
  "kF........Fk",
  "kF........Fk",
  "kF........Fk",
  "kF........Fk",
  "kFFFFFFFFFFk",
  "kkkkkkkkkkkk",
]];
export const PHOTO_SIZE = { x: 19, y: 2, w: 8, h: 5 }; // in room pixels; photos are drawn at half-pixels

// Seasonal decorations hang in the top-right corner (above the aquarium).
const DECOR = {
  halloween: [[39, 0, [
    "b.....b", "bbb.bbb", ".bbbbb.", "..b.b..",
    "...g...", ".oOgOo.", "oOkOkOo", "oOOOOOo", ".oOkOo.", "WWWWWWW",
  ]], { b: "#3b2a36", g: "#4f9a5c", o: "#e0702a", O: "#ff9f43", k: "#3b2a36", W: "#a8714f" }],
  christmas: [[39, 0, [
    "..ggg..", ".gGrGg.", "gG...Gg", "gr...rg", "gG...Gg", ".gGrGg.", "..gRg..", ".RR.RR.", "..R.R..",
  ]], { g: "#4f9a5c", G: "#7cc47f", r: "#ef3f4a", R: "#d7263d" }],
  lunar: [[39, 0, [
    "...y...", "...y...", ".yyyyy.", "rRRRRRr", "rRRyRRr", "rRyyyRr", "rRRyRRr", "rRRRRRr", ".yyyyy.", "..y.y..",
  ]], { y: "#ffc93c", r: "#b5172b", R: "#e5383b" }],
  anniversary: [[39, 4, [
    "...y...", "...z...", ".ppppp.", "pPPPPPp", "pzzzzzp", "WWWWWWW",
  ]], { y: "#ffc93c", z: "#ffffff", p: "#e86a92", P: "#ffb3c8", W: "#a8714f" }],
};

// Things from your life (see memory/themes.js): 5×4 pixel objects on the floor and a wall shelf.
const THING_ART = {
  coffee: [".e.e.", "RRRR.", "RRRRR", "RRRR."],
  tea: ["..k..", ".mmmm", "mmmm.", ".mm.."],
  books: ["RRRR.", "BBBBB", ".yyyy", "mmmm."],
  music: ["...k.", "ooooo", "oeoko", "ooooo"],
  cats: ["k....", ".k...", ".ggg.", "ggggp"],
  dogs: [".....", "e...e", "eeeee", "e...e"],
  rain: [".BBB.", "BBBBB", "..k..", "..kk."],
  flowers: ["p.y.p", ".lGl.", ".BBB.", ".BBB."],
  cooking: [".e.e.", "kkkkk", ".ggg.", ".ggg."],
  noodles: ["....k", "...k.", "RyyyR", ".RRR."],
  sweets: ["..R..", ".ppp.", "ppppp", ".bbb."],
  travel: [".kkk.", "ooooo", "oWoWo", "ooooo"],
  sea: [".RRe.", "RReBB", "yyyBB", ".yyB."],
  walks: ["BB...", "BBB..", "BBBBB", "eeeee"],
  photos: [".kk..", "nnnnn", "nBeBn", "nnnnn"],
  games: ["nnnnn", "nynRn", "nnnnn", "n...n"],
  art: [".sss.", "sRsBs", "ssyss", ".ss.."],
  movies: [".eye.", "eeyee", "ReReR", "ReReR"],
};
const THING_COLORS = {
  k: "var(--room-line)", e: "#ffffff", R: "#ef6f6c", B: "#7fb3e6", y: "#ffd166", m: "#8fd9b6",
  b: "#e8c9b0", W: "#a8714f", g: "#b7aeb9", p: "#ff8fb1", G: "#4f9a5c", l: "#7cc47f",
  o: "#ff9f43", n: "#4a4560", s: "#f2d29b",
};
const THING_SLOTS = [[7, 30], [22, 30], [27, 30], [32, 30], [29, 0], [34, 0]];
const SHELF = [29, 4, ["WWWWWWWWWW"]];
export const MAX_THINGS = THING_SLOTS.length;

const THING_LINES = {
  coffee: "sniffs your coffee mug. Still warm.",
  tea: "keeps the teapot company.",
  books: "sits on your books. Reading is hard.",
  music: "bops their head to the little radio.",
  cats: "pounces on the toy mouse. Got it.",
  dogs: "doesn't know why there's a dog bone here, but allows it.",
  rain: "guards your umbrella in case it rains.",
  flowers: "sniffs the flowers very carefully.",
  cooking: "peeks into the pot. Empty. Sad.",
  noodles: "is guarding the noodle bowl.",
  sweets: "is not looking at the cupcake. At all.",
  travel: "sits in your suitcase so you can't leave without them.",
  sea: "boops the beach ball.",
  walks: "is ready for a walk.",
  photos: "poses for the camera.",
  games: "pressed a button on the controller. Nothing happened.",
  art: "stepped on the paint palette. Art.",
  movies: "stole one piece of popcorn.",
};

export function skyFor(hour = new Date().getHours()) {
  if (hour >= 6 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "dusk";
  return "night";
}

// Draws the room once; returns update(state) to show what's unlocked and what's around:
// { total, found, season, photo (a data URL or null), postcard ("new", "read" or null), glow,
//   things (theme ids of your things, in slot order), wishes (true if a wish is in the jar) }.
// onItem(line) is called when an item is clicked so Mimi can comment on it; onJar and
// onPostcard when the jar or the postcard is tapped.
export function renderRoom(svg, { onItem, onJar, onPostcard }) {
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
  const frame = svgEl("g", { class: "room-item item-frame" });
  drawArt(frame, PHOTO_FRAME);
  const photo = svgEl("image", { class: "frame-photo", x: PHOTO_SIZE.x, y: PHOTO_SIZE.y, width: PHOTO_SIZE.w, height: PHOTO_SIZE.h, preserveAspectRatio: "none" });
  frame.appendChild(photo);
  frame.addEventListener("click", () => onItem("admires your photo on the wall."));
  svg.appendChild(frame);

  const jar = svgEl("g", { class: "room-item item-jar", role: "button", "aria-label": "Jar of good things" });
  drawArt(jar, JAR);
  const glass = svgEl("rect", { x: JAR_INSIDE[0], y: JAR_INSIDE[1], width: JAR_INSIDE[2], height: JAR_INSIDE[3], fill: "var(--jar-glass)" });
  const stars = svgEl("g", { class: "jar-stars" });
  jar.insertBefore(glass, jar.firstChild);
  jar.appendChild(stars);
  jar.addEventListener("click", () => onJar());
  svg.appendChild(jar);

  const decor = svgEl("g", { class: "room-item item-decor" });
  svg.appendChild(decor);
  let decorFor = null;
  decor.addEventListener("click", () => onItem(SEASONS.find((x) => x.id === decorFor)?.line ?? "likes the decoration."));

  const postcard = svgEl("g", { class: "room-item item-postcard" });
  drawArt(postcard, POSTCARD);
  postcard.appendChild(svgEl("rect", { class: "postcard-new twinkle", x: 22, y: 30, width: 1, height: 1, fill: "var(--accent)" }));
  postcard.addEventListener("click", () => onPostcard());

  const treasures = svgEl("g", { class: "treasures" });
  const things = svgEl("g", { class: "things" });
  svg.append(things, treasures, postcard);
  let thingsShown = "";

  // A paper wish tag tied to the jar while a wish is waiting inside.
  const wishTag = svgEl("g", { class: "wish-tag" });
  drawArt(wishTag, [6, 13, ["k.", "ee", "ey"]], { k: "var(--room-line)", e: "#fff7d6", y: "#ffd166" });
  jar.appendChild(wishTag);

  return function update({ total, found, season = null, photo: photoURL = null, postcard: card = null, glow = false, things: mine = [], wishes = false }) {
    svg.dataset.sky = skyFor();
    const framed = Boolean(photoURL) && isUnlocked("picture", total);
    for (const [id, g] of Object.entries(items)) {
      const on = isUnlocked(id, total) && !(id === "window" && isUnlocked("starry", total)) && !(id === "picture" && framed);
      g.classList.toggle("is-on", on);
    }

    frame.classList.toggle("is-on", framed);
    if (framed && photo.getAttribute("href") !== photoURL) photo.setAttribute("href", photoURL);

    jar.classList.toggle("is-on", total > 0);
    jar.classList.toggle("is-glowing", glow);
    const [jx, jy, jw, jh] = JAR_INSIDE;
    const count = jarStars(total);
    if (stars.childElementCount !== count) {
      stars.replaceChildren();
      for (let i = 0; i < count; i++) {
        const x = jx + (i % jw);
        const y = jy + jh - 1 - Math.floor(i / jw);
        stars.appendChild(svgEl("rect", { x, y, width: 1, height: 1, fill: STAR_COLORS[(i * 3) % STAR_COLORS.length] }));
      }
    }

    if (decorFor !== season) {
      decorFor = season;
      decor.replaceChildren();
      if (DECOR[season]) drawArt(decor, ...DECOR[season]);
    }
    decor.classList.toggle("is-on", Boolean(DECOR[season]));

    postcard.classList.toggle("is-on", Boolean(card));
    postcard.classList.toggle("is-new", card === "new");

    wishTag.classList.toggle("is-on", wishes);

    if (thingsShown !== mine.join()) {
      thingsShown = mine.join();
      things.replaceChildren();
      const shown = mine.filter((id) => THING_ART[id]).slice(0, MAX_THINGS);
      if (shown.length > 4) drawArt(things, SHELF);
      shown.forEach((id, i) => {
        const g = svgEl("g", { class: `room-item is-on thing thing-${id}` });
        const [x, y] = THING_SLOTS[i];
        drawArt(g, [x, y, THING_ART[id]], THING_COLORS);
        g.addEventListener("click", () => onItem(THING_LINES[id]));
        things.appendChild(g);
      });
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
