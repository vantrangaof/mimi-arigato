// The jar of good things: tap it (or shake your phone) and Mimi pulls out a past good thing,
// or now and then a folded wish that's still waiting.

import { allEntries, store, read, write } from "../core/store.js";
import { dayKey, daysBetween, formatShortYear } from "../core/dates.js";
import { pick } from "../core/dom.js";
import { purr } from "../cat/sound.js";
import { openWishes } from "../memory/wishes.js";

const RECENT = 6; // don't pull the same star again this soon
const SHAKE = 22; // change in acceleration (m/s²) that counts as a shake
const MOTION_ASKED = "motionAsked";
const WISH_CHANCE = 0.25;
const WISH_AGE = 14; // days before a wish starts turning up

export function wireJar(mimi) {
  const recent = [];

  function pull() {
    if (mimi.isAsleep()) {
      mimi.react(["mrr…", "is too sleepy to open the jar."], { hearts: 0, hold: 2000 });
      return;
    }
    const waiting = openWishes().filter((w) => daysBetween(w.key, dayKey()) >= WISH_AGE);
    if (waiting.length && Math.random() < WISH_CHANCE) {
      const wish = pick(waiting);
      if (store.settings.sound) purr({ volume: 0.5 });
      mimi.announce([
        ["*crinkle*", "finds a folded wish in the jar…", { hearts: 0, hold: 1500 }],
        ["♡", `“${wish.what}” (${formatShortYear(wish.key)}). Still keeping it safe for you.`, { hearts: 2, hold: 4200 }],
      ]);
      return;
    }
    const all = allEntries();
    const past = all.filter((e) => e.key < dayKey());
    const pool = (past.length ? past : all).filter((e) => !recent.includes(`${e.key}|${e.text}`));
    const star = pick(pool.length ? pool : past.length ? past : all);
    if (!star) {
      mimi.react(["…", "peeks into the empty jar. Tell me a good thing to put in!"], { hearts: 0, hold: 2600 });
      return;
    }
    recent.push(`${star.key}|${star.text}`);
    if (recent.length > RECENT) recent.shift();
    if (store.settings.sound) purr({ volume: 0.5 });
    mimi.announce([
      ["*clink*", "pulls a star out of the jar…", { hearts: 0, hold: 1300 }],
      ["♡", `reads: “${star.text}” (${formatShortYear(star.key)})`, { hearts: 2, hold: 4200 }],
    ]);
  }

  // Shaking the phone pulls a star too. iPhone asks permission once, on the first tap of the jar.
  let last = null;
  let lastShake = 0;
  addEventListener("devicemotion", (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || document.hidden) return;
    const now = Date.now();
    if (last) {
      const jolt = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
      if (jolt > SHAKE && now - lastShake > 2500 && allEntries().length) {
        lastShake = now;
        pull();
      }
    }
    last = { x: a.x, y: a.y, z: a.z };
  });

  function askForMotion() {
    const ask = globalThis.DeviceMotionEvent?.requestPermission;
    if (typeof ask !== "function" || read(MOTION_ASKED, false)) return;
    write(MOTION_ASKED, true);
    ask.call(DeviceMotionEvent).catch(() => {});
  }

  return {
    tap() {
      askForMotion();
      pull();
    },
  };
}
