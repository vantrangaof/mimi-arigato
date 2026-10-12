// Pairs: twelve cards, six pairs of Mimi's favorite things. Flip two at a time; matches stay up.
// No timer: it only counts how many tries it took.

import { el, plural } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { playNote } from "../cat/music.js";

const THINGS = {
  fish: { label: "fish", art: [".bbbb.b", "bFeFFbb", "bFFFFbb", ".bbbb.b"], colors: { b: "#3f6797", F: "#a6d4f7", e: "#1b2a3a" } },
  heart: { label: "heart", art: ["dd.dd", "dHHHd", "dHHHd", ".dHd.", "..d.."], colors: { d: "#d64f86", H: "#ff9ebe" } },
  yarn: { label: "ball of yarn", art: [".ooo.", "oyoyo", "oyyoy", "oyoyo", ".ooo."], colors: { o: "#7a4fc4", y: "#b89cf0" } },
  mouse: { label: "toy mouse", art: ["g.g.....", "ggggg...", "gegggg..", ".ggggg.g", "......g."], colors: { g: "#8d8aa0", e: "#2a2836" } },
  star: { label: "star", art: ["..y..", ".yYy.", "yYYYy", ".yYy.", "y...y"], colors: { y: "#d99a1e", Y: "#ffd76a" } },
  leaf: { label: "leaf", art: ["...gg", "..gGg", ".gGg.", "gGg..", "g...."], colors: { g: "#3f8a4a", G: "#8fd19a" } },
};
const NOTES = { fish: "C5", heart: "E5", yarn: "G5", mouse: "A5", star: "C6", leaf: "D5" };

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function startPairs({ root, sound, onEnd }) {
  const deck = shuffle([...Object.keys(THINGS), ...Object.keys(THINGS)]);
  const found = new Set();
  let open = []; // indexes of face-up unmatched cards
  let tries = 0;
  let waiting = null;

  const status = el("span", { class: "game-score", "aria-live": "polite", text: "0 tries" });
  const grid = el("div", { class: "pairs-grid" });
  root.replaceChildren(el("div", { class: "game-hud" }, status, el("span", { class: "game-timer", text: "find the pairs" })), grid);

  const cards = deck.map((id, i) => {
    const button = el("button", { type: "button", class: "pair-card", "aria-label": `Card ${i + 1}, face down` },
      el("span", { class: "pair-back", "aria-hidden": "true", text: "♡" }),
      pixelSVG(THINGS[id].art, THINGS[id].colors, "pair-face"),
    );
    button.addEventListener("click", () => flip(i));
    grid.append(button);
    return button;
  });

  function show(i, up) {
    cards[i].classList.toggle("is-up", up);
    cards[i].setAttribute("aria-label", up ? `Card ${i + 1}: ${THINGS[deck[i]].label}` : `Card ${i + 1}, face down`);
  }

  function flip(i) {
    if (found.has(i) || open.includes(i)) return;
    if (waiting) {
      clearTimeout(waiting);
      waiting = null;
      for (const j of open) show(j, false);
      open = [];
    }
    show(i, true);
    open.push(i);
    if (sound) playNote(NOTES[deck[i]], { dur: 0.15, instrument: "box", volume: 0.7 });
    if (open.length < 2) return;

    tries += 1;
    status.textContent = plural(tries, "try", "tries");
    const [a, b] = open;
    if (deck[a] === deck[b]) {
      found.add(a).add(b);
      cards[a].classList.add("is-found");
      cards[b].classList.add("is-found");
      cards[a].disabled = cards[b].disabled = true;
      open = [];
      if (found.size === deck.length) setTimeout(() => onEnd({ score: tries }), 700);
      return;
    }
    waiting = setTimeout(() => {
      waiting = null;
      show(a, false);
      show(b, false);
      open = [];
    }, 900);
  }

  cards[0].focus({ preventScroll: true });
  return () => clearTimeout(waiting);
}
