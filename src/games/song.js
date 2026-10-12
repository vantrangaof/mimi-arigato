// Mimi's song: Mimi taps out a tune on four paws, one note longer each round, and you play it
// back. A wrong note ends the game gently ("Mimi lost the tune too").

import { el, plural } from "../core/dom.js";
import { playNote } from "../cat/music.js";

const PAWS = [
  { note: "C5", label: "pink paw", color: "#ff8bb0" },
  { note: "E5", label: "yellow paw", color: "#ffd76a" },
  { note: "G5", label: "green paw", color: "#8fd19a" },
  { note: "C6", label: "blue paw", color: "#a6d4f7" },
];
const PAW_ART = '<svg viewBox="0 0 5 5" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h1v1H1zM3 0h1v1H3zM0 1h1v1H0zM4 1h1v1H4zM1 2h3v1H1zM0 3h5v1H0zM1 4h3v1H1z"/></svg>';

export function startSong({ root, sound, onEnd }) {
  const tune = [];
  let at = 0; // how far you've played back this round
  let listening = false;
  let timers = [];
  let over = false;

  const status = el("span", { class: "game-score", "aria-live": "polite", text: "Listen…" });
  const round = el("span", { class: "game-timer", text: "" });
  const paws = el("div", { class: "song-paws" });
  root.replaceChildren(
    el("div", { class: "game-hud" }, status, round),
    paws,
    !sound && el("p", { class: "muted small game-hint", text: "Sound is off: turn it on at the top to hear the notes (or play by the colors)." }),
  );

  const buttons = PAWS.map((paw, i) => {
    const b = el("button", { type: "button", class: "song-paw", "aria-label": paw.label, disabled: true });
    b.innerHTML = PAW_ART;
    b.style.setProperty("--paw", paw.color);
    b.addEventListener("click", () => press(i));
    paws.append(b);
    return b;
  });

  function light(i, ms = 320) {
    replayClass(buttons[i]);
    if (sound) playNote(PAWS[i].note, { dur: ms / 1000, instrument: "soft", volume: 0.9 });
    timers.push(setTimeout(() => buttons[i].classList.remove("is-lit"), ms));
  }
  function replayClass(b) {
    b.classList.remove("is-lit");
    void b.offsetWidth;
    b.classList.add("is-lit");
  }

  function setListening(on) {
    listening = on;
    for (const b of buttons) b.disabled = !on;
    status.textContent = on ? "Your turn!" : "Listen…";
    if (on) buttons[0].focus({ preventScroll: true });
  }

  function nextRound() {
    tune.push(Math.floor(Math.random() * PAWS.length));
    at = 0;
    round.textContent = `${plural(tune.length, "note")}`;
    setListening(false);
    const gap = Math.max(330, 600 - tune.length * 20);
    tune.forEach((i, n) => timers.push(setTimeout(() => light(i, gap * 0.6), 700 + n * gap)));
    timers.push(setTimeout(() => setListening(true), 700 + tune.length * gap));
  }

  function press(i) {
    if (!listening || over) return;
    light(i, 220);
    if (i !== tune[at]) {
      over = true;
      setListening(false);
      status.textContent = "Oops!";
      timers.push(setTimeout(() => onEnd({ score: tune.length - 1 }), 700));
      return;
    }
    at += 1;
    if (at === tune.length) {
      setListening(false);
      status.textContent = "♪ Nice!";
      timers.push(setTimeout(nextRound, 700));
    }
  }

  nextRound();
  return () => {
    over = true;
    timers.forEach(clearTimeout);
  };
}
