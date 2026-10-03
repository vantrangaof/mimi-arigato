// Mimi's room on screen: sizing the pixel grid, the room itself, petting, and her look.

import { $ } from "../core/dom.js";
import {
  store, KEYS, catName, catTitle, totalThings, dailyCount, setDailyCount, allEntries, photoById, photoList, photoURL, diaryPage,
} from "../core/store.js";
import { dayKey, formatShort } from "../core/dates.js";
import { applyLook, setCustomFur, FURS } from "../cat/sprite.js";
import { meow, purr } from "../cat/sound.js";
import { renderRoom, isUnlocked, validWear, ACCESSORIES, ROOM_W, ROOM_H, PHOTO_SIZE, MAX_THINGS } from "../world/world.js";
import { seasonOn } from "../world/seasons.js";
import { weekPostcard, postcardSeen } from "../memory/postcard.js";
import { roomThingIds } from "../memory/themes.js";
import { openWishes } from "../memory/wishes.js";

const wide = matchMedia("(min-width: 960px)");

// One graph-paper square = one sprite pixel, lined up so Mimi sits on the grid.
function fitGrid(sprite) {
  const basis = wide.matches
    ? Math.min(($("mimiPanel").clientWidth * 0.92) / ROOM_W, (innerHeight - 330) / (ROOM_H + 2))
    : Math.min(innerWidth - 32, 560) / ROOM_W;
  const px = Math.max(6, Math.min(16, Math.floor(basis)));
  document.documentElement.style.setProperty("--px", `${px}px`);
  const r = sprite.getBoundingClientRect();
  const mod = (n) => ((Math.round(n) % px) + px) % px;
  document.body.style.backgroundPosition = `${mod(r.left + scrollX)}px ${mod(r.top + scrollY)}px`;
}

export const currentWear = () => validWear(store.settings.wear, totalThings());

// Accessories currently worn, as catalog items.
export const wearing = () => Object.values(currentWear())
  .map((id) => ACCESSORIES.find((a) => a.id === id))
  .filter(Boolean);

// On a rainy or stormy diary day Mimi keeps closer to the jar (she never reads the page itself).
const greyDay = () => ["rainy", "stormy"].includes(diaryPage(dayKey()).mood);

export function roomContext() {
  const total = totalThings();
  return {
    jar: total > 0,
    greyDay: total > 0 && greyDay(),
    window: isUnlocked("window", total),
    aquarium: isUnlocked("aquarium", total),
    cushion: isUnlocked("cushion", total),
    accessory: wearing()[0]?.label ?? null,
  };
}

// Each reaction says which clip fits it.
const PET_REACTIONS = [
  { say: ["purr~", "is purring softly."], voice: purr },
  { say: ["mrrp!", "wiggles their ears."], voice: meow },
  { say: ["♥", "leans into your hand."], voice: purr },
  { say: ["nya~", "closes their eyes happily."], voice: meow },
  { say: ["prrr", "stretches a little paw."], voice: purr },
];

function randomMemory() {
  const today = dayKey();
  const past = allEntries().filter((e) => e.key < today);
  return past.length ? past[Math.floor(Math.random() * past.length)] : null;
}

// The photo hanging in the room: the one you picked, or the newest.
export const framedPhoto = () => photoById(store.settings.framePhoto) ?? photoList()[0] ?? null;

// A photo shrunk to the frame at half-pixels (16×10), as a data URL. Cached per photo.
const pixelated = new Map();
async function pixelatedPhoto(id) {
  if (pixelated.has(id)) return pixelated.get(id);
  const url = await photoURL(id, "thumb");
  if (!url) return null;
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const w = PHOTO_SIZE.w * 2;
  const h = PHOTO_SIZE.h * 2;
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  canvas.getContext("2d").drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
  const data = canvas.toDataURL("image/png");
  pixelated.set(id, data);
  return data;
}

export function wireHabitat({ mimi, look, wrap, sprite, room, tally, onJar, onPostcard }) {
  // Sizing
  fitGrid(sprite);
  addEventListener("resize", () => fitGrid(sprite));
  document.fonts?.ready.then(() => fitGrid(sprite));
  let frame = 0;
  addEventListener("scroll", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fitGrid(sprite));
  }, { passive: true });

  // Room
  const updateRoom = renderRoom(room, {
    onItem: (line) => mimi.react(["♡", line], { hearts: 1 }),
    onJar,
    onPostcard,
  });
  let photo = null; // data URL of the framed photo
  const render = () => {
    const card = weekPostcard();
    updateRoom({
      total: totalThings(),
      found: store.treasures,
      season: seasonOn()?.id ?? null,
      photo,
      postcard: card ? (postcardSeen(card) ? "read" : "new") : null,
      glow: greyDay(),
      things: roomThingIds(MAX_THINGS),
      wishes: openWishes().length > 0,
    });
    const framed = framedPhoto();
    if (framed && isUnlocked("picture", totalThings())) {
      pixelatedPhoto(framed.id).then((url) => {
        if (url && url !== photo && framedPhoto()?.id === framed.id) {
          photo = url;
          render();
        }
      });
    }
    else photo = null;
    setCustomFur(store.settings.customFur);
    const fur = FURS[store.settings.fur] ? store.settings.fur : "pink";
    applyLook(wrap, { fur, wear: currentWear() });
    $("catTitle").textContent = catTitle();
    document.title = catTitle();
    wrap.setAttribute("aria-label", `Pet ${catName()}`);
  };
  store.on(render);
  render();
  setInterval(render, 5 * 60_000); // window sky follows the time of day

  // Petting
  let pets = dailyCount(KEYS.pets);
  let last = -1;
  const renderTally = () => {
    const name = catName();
    tally.textContent = pets === 0 ? `Tap ${name} to say hello.`
      : pets === 1 ? `You petted ${name} once today.`
      : `You petted ${name} ${pets} times today.`;
  };
  const voice = (fn, options) => store.settings.sound && fn(options);

  wrap.addEventListener("click", () => {
    pets += 1;
    setDailyCount(KEYS.pets, pets);
    renderTally();

    if (mimi.isAsleep()) {
      voice(meow, { rate: 0.82, volume: 0.6 });
      mimi.react(["mrr…?", "wakes up and blinks at you."], { hearts: 0, hold: 2400 });
      return;
    }
    const memory = Math.random() < 0.25 ? randomMemory() : null;
    if (memory) {
      voice(meow);
      mimi.react(["remember?", `remembers “${memory.text}” from ${formatShort(memory.key)}.`], { hold: 4200 });
      return;
    }
    let i;
    do i = Math.floor(Math.random() * PET_REACTIONS.length); while (i === last);
    last = i;
    voice(PET_REACTIONS[i].voice);
    mimi.react(PET_REACTIONS[i].say);
  });
  store.on(renderTally);
  renderTally();
}

// Mimi's eyes follow the mouse (not touch: there's no hover on phones).
export function followPointer(look, isBusy) {
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !isBusy()) look(e.clientX, e.clientY);
  });
}
