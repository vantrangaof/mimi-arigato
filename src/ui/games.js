// Games with Mimi: the Play button opens a little arcade. The laser dot plays in the room;
// the others play in the sheet. Your best is kept on this device, and nothing is ever lost:
// games don't earn or cost treats (those come from good things).

import { el, pick } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { store, read, write, catName } from "../core/store.js";
import { jingle } from "../cat/music.js";
import { meow } from "../cat/sound.js";
import { currentWear } from "./habitat.js";
import { startCatch } from "../games/catch.js";
import { startPairs } from "../games/pairs.js";
import { startSong } from "../games/song.js";
import { startShuffle } from "../games/shuffle.js";
import { startBelly } from "../games/belly.js";
import { startTower } from "../games/tower.js";
import { startToss } from "../games/toss.js";
import { startPumpkins } from "../games/pumpkins.js";
import { seasonOn } from "../world/seasons.js";

const BESTS = "gameBests"; // { catch, pairs, song, shuffle, belly, tower, toss, pumpkins } on this device

const GAMES = [
  {
    id: "pumpkins",
    season: "halloween", // only while it's Halloween in Mimi's room (world/seasons.js)
    label: "Pumpkin patch",
    about: "Halloween only! Tap the candy and bats. Leave the ghosts alone.",
    icon: ["..gg...", ".oOoOo.", "oOoOoOo", "oOoOoOo", ".ooooo."],
    colors: { g: "#3f8a4a", o: "#e8762b", O: "#b8531a" },
    start: startPumpkins,
    higher: true,
    best: (n) => `best: ${n} candy`,
    result(n, isBest, { boos = 0, bats = 0 } = {}) {
      const also = [
        bats && `caught ${bats === 1 ? "a bat" : `${bats} bats`}`,
        boos && `got BOO'd ${boos === 1 ? "once" : `${boos} times`}`,
      ].filter(Boolean);
      const and = also.length ? ` (and ${also.join(" and ")})` : "";
      if (n === 0) return ["boo!", `hid behind you the whole time${and}.`];
      return [isBest ? "new best!" : "trick or treat!", `collected ${n} candy${and}!${isBest ? " The biggest haul yet." : ""}`];
    },
  },
  {
    id: "laser",
    label: "Laser dot",
    about: "20 seconds of pouncing, right in the room.",
    icon: ["..r..", ".rRr.", "rRWRr", ".rRr.", "..r.."],
    colors: { r: "#ff2d55", R: "#ff7a95", W: "#ffffff" },
  },
  {
    id: "catch",
    label: "Catch the fish",
    about: "Fish fall from the sky. Cucumbers, rain and socks do too.",
    icon: [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"],
    colors: { b: "#3f6797", F: "#a6d4f7", e: "#1b2a3a" },
    start: startCatch,
    higher: true,
    best: (n) => `best: ${n} fish`,
    result(n, isBest, { spooks = {} } = {}) {
      const oops = [
        spooks.cucumber && `got spooked by ${spooks.cucumber === 1 ? "a cucumber" : `${spooks.cucumber} cucumbers`}`,
        spooks.rain && `got rained on${spooks.rain > 1 ? ` ${spooks.rain} times` : ""}`,
        spooks.sock && `tried to eat ${spooks.sock === 1 ? "a sock" : `${spooks.sock} socks`}`,
      ].filter(Boolean);
      const also = oops.length ? ` (and ${oops.length > 1 ? `${oops.slice(0, -1).join(", ")} and ${oops.at(-1)}` : oops[0]})` : "";
      if (n === 0) return ["mrrp?", `didn't catch any${also}, but loved watching them fall.`];
      return [isBest ? "new best!" : "nom nom", `caught ${n} fish${also}!${isBest ? " That's the most ever." : ""}`];
    },
  },
  {
    id: "pairs",
    label: "Pairs",
    about: "Find the six pairs of Mimi's favorite things.",
    icon: ["dd.dd", "dHHHd", "dHHHd", ".dHd.", "..d.."],
    colors: { d: "#d64f86", H: "#ff9ebe" },
    start: startPairs,
    higher: false,
    best: (n) => `best: ${n} tries`,
    result(n, isBest) {
      return [isBest ? "new best!" : "ta-da!", `found every pair in ${n} tries!${isBest ? " Your sharpest memory yet." : n <= 9 ? " What a memory." : ""}`];
    },
  },
  {
    id: "song",
    label: "Mimi's song",
    about: "Mimi plays a tune on four paws. Play it back!",
    icon: [".o.o.", "o...o", ".ooo.", "ooooo", ".ooo."],
    colors: { o: "#ff8bb0" },
    start: startSong,
    higher: true,
    best: (n) => `best: ${n} notes`,
    result(n, isBest) {
      if (n === 0) return ["hehe", "lost the tune too. Again?"];
      return [isBest ? "new best!" : "♪", `sang ${n} ${n === 1 ? "note" : "notes"} with you!${isBest ? " The longest song yet." : ""}`];
    },
  },
  {
    id: "shuffle",
    label: "Box shuffle",
    about: "Mimi hides in a box. Keep your eye on the right one!",
    icon: ["dddddddd", "dTTTTTTd", "dddddddd", ".dBBBBd.", ".dBttBd.", ".dBBBBd.", ".dddddd."],
    colors: { d: "#8a5a2b", B: "#d9a066", t: "#8a5a2b", T: "#e8b67a" },
    start: startShuffle,
    higher: true,
    best: (n) => `best: ${n} found`,
    result(n, isBest) {
      if (n === 0) return ["hehe", "was hiding in the other box! Again?"];
      return [isBest ? "new best!" : "found!", `${n === 1 ? "was found once!" : `was found ${n} times in a row!`}${isBest ? " Sharpest eyes yet." : ""}`];
    },
  },
  {
    id: "belly",
    label: "Belly trap",
    about: "Pet Mimi where they ask. If they show their belly… don't.",
    icon: [".h.h.h.", "hHhHhHh", "hHHHHHh", "hHHHHHh", ".hHHHh.", "..hhh.."],
    colors: { h: "#b5774f", H: "#ffd2b0" },
    start: startBelly,
    higher: true,
    best: (n) => `best: ${n} pets`,
    result(n, isBest, { traps = 0, resisted = 0 } = {}) {
      const also = [
        traps && `got you with the belly trap${traps > 1 ? ` ${traps} times` : ""}`,
        resisted && `was impressed you resisted the belly${resisted > 1 ? ` ${resisted} times` : ""}`,
      ].filter(Boolean);
      const and = also.length ? ` (and ${also.join(" and ")})` : "";
      if (n === 0) return ["hmph", `wanted more pets${and}.`];
      return [isBest ? "new best!" : "prrrr", `got ${n} ${n === 1 ? "pet" : "pets"}${and}!${isBest ? " The most ever." : ""}`];
    },
  },
  {
    id: "tower",
    label: "Cushion tower",
    about: "Stack cushions as high as you can. Mimi climbs to the top!",
    icon: ["..yyyy..", ".pppppp.", "bbbbbbbb", ".gggggg."],
    colors: { y: "#ffd76a", p: "#ff9ebe", b: "#a6d4f7", g: "#8fd19a" },
    start: startTower,
    higher: true,
    best: (n) => `best: ${n} cushions`,
    result(n, isBest, { perfects = 0 } = {}) {
      if (n === 0) return ["mrrp?", "watched the cushion tumble. Try again?"];
      const neat = perfects ? ` (${perfects === 1 ? "one perfect drop" : `${perfects} perfect drops`})` : "";
      return [isBest ? "new best!" : "so high!", `climbed a tower of ${n} ${n === 1 ? "cushion" : "cushions"}${neat}!${isBest ? " The tallest yet." : ""}`];
    },
  },
  {
    id: "toss",
    label: "Treat toss",
    about: "Flick treats into Mimi's mouth. Mind the breeze!",
    icon: [".bb.b", "bBBbb", ".bb.b"],
    colors: { b: "#b7791f", B: "#ffd76a" },
    start: startToss,
    higher: true,
    best: (n) => `best: ${n} of 10`,
    result(n, isBest, { bonks = 0 } = {}) {
      const bonked = bonks ? ` (and got bonked on the head ${bonks === 1 ? "once" : `${bonks} times`})` : "";
      if (n === 0) return ["mrrp?", `didn't catch any treats${bonked}, but had fun trying.`];
      return [isBest ? "new best!" : "nom!", `caught ${n} of 10 treats${bonked}!${isBest ? " Best aim yet." : ""}`];
    },
  },
];

export function wireGames(mimi, { dialog, title, body, startLaser }) {
  let cleanup = null;
  let lastResult = null; // Mimi says it in the room when the sheet closes
  const sound = () => store.settings.sound;

  function stopGame() {
    cleanup?.();
    cleanup = null;
  }

  function menu() {
    stopGame();
    title.textContent = `Play with ${catName()}`;
    const bests = read(BESTS, {});
    const season = seasonOn()?.id;
    const games = GAMES.filter((g) => !g.season || g.season === season);
    body.replaceChildren(el("ul", { class: "game-list" }, ...games.map((g) => el("li", { class: g.season ? "is-seasonal" : null },
      el("button", { type: "button", class: "game-pick", onclick: () => choose(g) },
        el("span", { class: "game-icon" }, pixelSVG(g.icon, g.colors)),
        el("span", { class: "game-text" },
          el("span", { class: "game-name", text: g.label }),
          el("span", { class: "muted small", text: g.about.replace("Mimi", catName()) }),
          bests[g.id] != null && el("span", { class: "game-best", text: g.best(bests[g.id]) }),
        ),
      ),
    ))));
  }

  function choose(g) {
    if (g.id === "laser") {
      dialog.close();
      startLaser();
      return;
    }
    play(g);
  }

  function play(g) {
    stopGame();
    lastResult = null;
    title.textContent = g.label;
    const area = el("div", { class: "game-area" });
    body.replaceChildren(el("button", { type: "button", class: "link-button game-back", text: "‹ All games", onclick: menu }), area);
    cleanup = g.start({
      root: area,
      sound: sound(),
      cat: { fur: store.settings.fur, wear: currentWear() },
      onEnd: ({ score, ...extra }) => finish(g, score, area, extra),
    });
  }

  function finish(g, score, area, extra) {
    cleanup = null;
    const bests = read(BESTS, {});
    const old = bests[g.id];
    const isBest = old == null ? score > 0 || !g.higher : g.higher ? score > old : score < old;
    if (isBest) write(BESTS, { ...bests, [g.id]: score });
    const [say, line] = g.result(score, isBest && old != null, extra);
    lastResult = [say, line, isBest && old != null];
    if (sound()) jingle(score > 0 ? "win" : "miss");
    area.replaceChildren(el("div", { class: "game-result" },
      el("p", { class: "game-result-say", text: say }),
      el("p", { class: "game-result-line", text: `${catName()} ${line}` }),
      el("p", { class: "muted small", text: isBest || old == null ? "" : g.best(old) }),
      el("div", { class: "row" },
        el("button", { type: "button", class: "pixel-button primary", text: "Play again", onclick: () => play(g) }),
        el("button", { type: "button", class: "pixel-button", text: "All games", onclick: menu }),
      ),
    ));
    area.querySelector(".pixel-button.primary").focus({ preventScroll: true });
  }

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    stopGame();
    if (!lastResult) return;
    const [say, line, best] = lastResult;
    lastResult = null;
    if (sound()) meow({ volume: 0.6 });
    mimi.react([say, line], { hearts: best ? 4 : 2, hold: 2800 });
  });

  return {
    open() {
      lastResult = null;
      menu();
      dialog.showModal();
      if (sound()) meow({ volume: 0.5, rate: 1.1 });
      mimi.react([pick(["mrrp!", "!!", "play?"]), "is ready to play!"], { hearts: 1, hold: 1600 });
    },
  };
}
