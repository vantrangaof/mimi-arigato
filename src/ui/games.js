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

const BESTS = "gameBests"; // { catch, pairs, song } on this device

const GAMES = [
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
    body.replaceChildren(el("ul", { class: "game-list" }, ...GAMES.map((g) => el("li", {},
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
