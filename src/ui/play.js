// Things to do with Mimi: fish, water and cuddles you earn with good things, and a laser dot to chase
// (one of the games in ui/games.js; the Play button opens them).

import { store, KEYS, dailyCount, setDailyCount, entriesToday, quietToday, catName } from "../core/store.js";
import { el, replay, pick, capitalize } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { purr } from "../cat/sound.js";
import { heartSVG } from "../cat/mimi.js";
import { markFed, needs } from "../memory/needs.js";
import { challengeRewarded } from "../memory/challenges.js";

// Each good thing told today earns ONE treat, in turn: a fish, then water, then a cuddle, then a
// fish again (up to 5 good things). "Nothing special today" earns a fish. Today's challenge
// (memory/challenges.js) earns a treat bag: one more of each. So feeding Mimi AND giving them
// water takes two good things, or one and the challenge.
// Mimi looks a little sad on a day without a fish or water (see memory/needs.js), never more.
const MAX_EARNED = 5;
const ORDER = ["fish", "water", "cuddle"];
const CARE = {
  fish: {
    key: KEYS.treats,
    need: "food",
    label: "Fish",
    art: [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"],
    colors: { b: "#3f6797", F: "#a6d4f7", e: "#1b2a3a" },
    spot: "spots a fish!",
    cheer: ["yay!!", "was so hungry. Thank you! ♡"],
    done: [["nom nom", "loved that fish."], ["mrrp!", "ate the whole fish, tail first."], ["nom", "licks their whiskers. Delicious."]],
  },
  water: {
    key: KEYS.water,
    need: "water",
    label: "Water",
    art: ["..b..", ".bWb.", "bWWWb", "bWWWb", ".bbb."],
    colors: { b: "#3f8fd2", W: "#bfe6ff" },
    className: "water-drop",
    spot: "hears the water bowl!",
    cheer: ["lap lap lap!", "was so thirsty. Thank you! ♡"],
    done: [["lap lap", "drinks a little water. Refreshing!"], ["slurp", "got water on their nose."], ["lap", "sips very politely."]],
  },
  cuddle: {
    key: KEYS.cuddles,
    label: "Cuddle",
    done: [["prrrr", "melts into a purring puddle."], ["♡♡", "snuggles into your arms."], ["purr~", "kneads your sleeve happily."]],
  },
};

// Earn more by telling good things: the tray above the buttons says how, and tapping it (or an
// empty button) takes you to the good-things box.
export function wireCare(buttons, mimi, wrap, tray) {
  let busy = false;
  const told = () => Math.min(entriesToday().length, MAX_EARNED); // good things that earn a treat
  const earned = () => told() + (quietToday() ? 1 : 0) + (challengeRewarded() ? ORDER.length : 0);
  // How many of one kind you've earned today.
  const earnedOf = (id) => {
    const n = told();
    const turns = Math.floor(n / ORDER.length) + (ORDER.indexOf(id) < n % ORDER.length ? 1 : 0);
    return turns + (id === "fish" && quietToday() ? 1 : 0) + (challengeRewarded() ? 1 : 0);
  };
  const idOf = (care) => Object.keys(CARE).find((id) => CARE[id] === care);
  const left = (care) => Math.max(0, earnedOf(idOf(care)) - dailyCount(care.key));
  const nextTreat = () => CARE[ORDER[told() % ORDER.length]].label.toLowerCase();
  let seen = Object.fromEntries(ORDER.map((id) => [id, earnedOf(id)]));

  tray.icons.replaceChildren(
    pixelSVG(CARE.fish.art, CARE.fish.colors, "tray-icon"),
    pixelSVG(CARE.water.art, CARE.water.colors, "tray-icon tray-water"),
    heartSVG("tray-icon tray-heart"),
  );

  function trayLine() {
    const name = catName();
    const n = told();
    const toGive = Object.values(CARE).some((care) => left(care));
    const hungry = needs().food || needs().water;
    const bag = challengeRewarded() ? "" : " or do today's challenge";
    if (earned() === 0 && hungry) return { text: `${capitalize(name)}'s bowls are empty! Tell them a good thing to earn a fish ↓`, ask: true };
    if (earned() === 0) return { text: `Tell ${name} a good thing to earn a fish ↓`, ask: true };
    if (toGive) return { text: `You earned treats! Tap them to give them to ${name}.`, ask: false };
    if (n < MAX_EARNED) return { text: `All given! Your next good thing earns ${nextTreat() === "cuddle" ? "a cuddle" : nextTreat() === "fish" ? "a fish" : "water"}${bag} ↓`, ask: true };
    return { text: `${capitalize(name)} is completely spoiled today ♡`, ask: false };
  }

  function label() {
    for (const [id, btn] of Object.entries(buttons)) {
      const care = CARE[id];
      const n = left(care);
      btn.textContent = n ? `${care.label} ×${n}` : care.label;
      btn.classList.toggle("is-empty", !n);
      btn.setAttribute("aria-label", n ? `${care.label}: ${n} to give` : `${care.label}: none to give yet`);
    }
    const line = trayLine();
    tray.text.textContent = line.text;
    tray.tray.classList.toggle("is-asking", line.ask);
    tray.tray.disabled = !line.ask;
  }

  // Take you to the good-things box and make it glow.
  function guide() {
    if (tray.form.hidden) return;
    tray.form.scrollIntoView({ behavior: "smooth", block: "center" });
    tray.input.focus({ preventScroll: true });
    replay(tray.form, "is-calling");
  }

  // A good thing (or the challenge) was just accepted: show what it earned, on the buttons it earned.
  function celebrate(gains) {
    replay(tray.tray, "is-earned");
    for (const [id, gained] of Object.entries(gains)) {
      const btn = buttons[id];
      if (!btn || gained <= 0) continue;
      replay(btn, "is-earned");
      const pop = el("span", { class: "earn-pop", text: `+${gained}`, "aria-hidden": "true" });
      pop.addEventListener("animationend", () => pop.remove());
      btn.appendChild(pop);
    }
  }

  function finish(care) {
    const waited = care.need && needs()[care.need];
    setDailyCount(care.key, dailyCount(care.key) + 1);
    if (care.need) markFed(care.need);
    store.save(); // the bowl fills and Mimi cheers up
    mimi.setActivity(null);
    if (store.settings.sound) purr();
    mimi.react(waited ? care.cheer : pick(care.done), { hearts: care === CARE.cuddle || waited ? 4 : 2, hold: 2200 });
    busy = false;
  }

  function give(care) {
    if (busy) return;
    if (!left(care)) {
      replay(wrap, "is-shake");
      if (told() >= MAX_EARNED && challengeRewarded()) {
        mimi.react(["♡", "is completely spoiled today. Thank you!"], { hearts: 0, hold: 2600 });
        return;
      }
      const want = care === CARE.water ? "some water" : `a ${care.label.toLowerCase()}`;
      const bag = challengeRewarded() ? "" : " (or do today's challenge)";
      mimi.react(["mrrp?", `would love ${want}! Tell them something good${bag} to earn one.`], { hearts: 0, hold: 3200 });
      guide();
      return;
    }
    busy = true;
    if (!care.art) {
      replay(wrap, "is-squish");
      finish(care);
      return;
    }
    mimi.setActivity(care.spot);
    const drop = pixelSVG(care.art, care.colors, `fish ${care.className ?? ""}`);
    wrap.appendChild(drop);
    drop.addEventListener("animationend", () => {
      drop.remove();
      wrap.classList.add("is-chomping");
      setTimeout(() => {
        wrap.classList.remove("is-chomping");
        finish(care);
      }, 900);
    }, { once: true });
  }

  for (const [id, btn] of Object.entries(buttons)) btn.addEventListener("click", () => give(CARE[id]));
  tray.tray.addEventListener("click", guide);
  store.on(() => {
    label();
    const now = Object.fromEntries(ORDER.map((id) => [id, earnedOf(id)]));
    const gains = Object.fromEntries(ORDER.map((id) => [id, now[id] - seen[id]]));
    if (Object.values(gains).some((g) => g > 0)) celebrate(gains);
    seen = now;
  });
  label();
}

const PLAY_MS = 20_000;

export function wirePlay(btn, mimi, wrap, habitat, look) {
  let playing = false;
  let raf, endTimer, dot;
  let pos, target;
  let pointerAt = 0;
  let wanderAt = 0;
  let lastPounce = 0;
  let catches = 0;

  const area = () => habitat.getBoundingClientRect();
  function randomPoint() {
    const r = area();
    return { x: 16 + Math.random() * (r.width - 32), y: 16 + Math.random() * (r.height - 32) };
  }

  function start() {
    playing = true;
    catches = 0;
    btn.textContent = "Stop playing";
    btn.setAttribute("aria-pressed", "true");
    habitat.classList.add("is-playing");
    dot = document.createElement("span");
    dot.className = "laser";
    habitat.appendChild(dot);
    pos = randomPoint();
    target = randomPoint();
    mimi.setActivity("is watching the dot…");
    endTimer = setTimeout(stop, PLAY_MS);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (!playing) return;
    playing = false;
    cancelAnimationFrame(raf);
    clearTimeout(endTimer);
    dot.remove();
    habitat.classList.remove("is-playing");
    btn.textContent = "Play";
    btn.setAttribute("aria-pressed", "false");
    mimi.setActivity(null);
    look(null);
    const line = catches === 0 ? "is tired from playing."
      : catches === 1 ? "caught the dot once!"
      : `caught the dot ${catches} times!`;
    mimi.react(["phew!", line], { hearts: Math.min(catches, 5), hold: 2600 });
  }

  function tick() {
    const now = performance.now();
    // With no finger or mouse steering, the dot wanders on its own.
    if (now - pointerAt > 1500 && now > wanderAt) {
      target = randomPoint();
      wanderAt = now + 700 + Math.random() * 900;
    }
    pos.x += (target.x - pos.x) * 0.12;
    pos.y += (target.y - pos.y) * 0.12;
    dot.style.transform = `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)`;

    const r = area();
    const x = r.left + pos.x;
    const y = r.top + pos.y;
    look(x, y);

    const c = wrap.querySelector(".cat").getBoundingClientRect();
    const onMimi = x > c.left + c.width * 0.15 && x < c.right - c.width * 0.15
      && y > c.top + c.height * 0.25 && y < c.bottom - c.height * 0.05;
    if (onMimi && now - lastPounce > 1200) {
      lastPounce = now;
      catches += 1;
      replay(wrap, "is-pounce");
      mimi.react(["got it!", "pounces on the dot!"], { hearts: 1, hold: 900 });
      target = randomPoint();
      pointerAt = 0;
    }
    raf = requestAnimationFrame(tick);
  }

  function steer(e) {
    if (!playing) return;
    const r = area();
    target = { x: e.clientX - r.left, y: e.clientY - r.top };
    pointerAt = performance.now();
  }

  habitat.addEventListener("pointermove", steer);
  habitat.addEventListener("pointerdown", steer);
  let openGames = null;
  btn.addEventListener("click", () => (playing ? stop() : openGames ? openGames() : start()));
  return {
    isPlaying: () => playing,
    start: () => !playing && start(),
    onOpen: (fn) => { openGames = fn; },
  };
}
