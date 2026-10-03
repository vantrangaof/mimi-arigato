// Bedtime: in the evening, tuck Mimi in. She softly reads back today's good things,
// the room's lights go down, and she sleeps until morning.

import { store, read, write, entriesToday, userName } from "../core/store.js";
import { dayKey } from "../core/dates.js";
import { purr } from "../cat/sound.js";

const KEY = "tucked";
const FROM_HOUR = 21; // the button shows from 9 pm…
const UNTIL_HOUR = 6; // …until 6 am

const hour = () => new Date().getHours();
const isBedtime = (h = hour()) => h >= FROM_HOUR || h < UNTIL_HOUR;

// Tonight's key: before 6 am it's still yesterday's night.
function nightKey() {
  const d = new Date();
  if (d.getHours() < UNTIL_HOUR) d.setDate(d.getDate() - 1);
  return dayKey(d);
}

export function wireBedtime(btn, mimi, habitat) {
  let tucking = false;
  const tuckedTonight = () => read(KEY, null) === nightKey();

  function render() {
    const tucked = tuckedTonight();
    if (mimi.isTucked() !== tucked) mimi.tuck(tucked);
    habitat.classList.toggle("is-tucked", tucked);
    btn.hidden = !isBedtime() || tucked || tucking;
  }

  btn.addEventListener("click", () => {
    if (tucking || tuckedTonight()) return;
    tucking = true;
    render();
    if (store.settings.sound) purr({ volume: 0.4, rate: 0.9 });
    const today = entriesToday();
    const you = userName() ? `, ${userName()}` : "";
    const lines = [["shh…", "climbs under the blanket.", { hearts: 0, hold: 1800 }]];
    if (today.length) {
      lines.push(["today…", "remembers today's good things.", { hearts: 0, hold: 1800 }]);
      for (const text of today) lines.push(["♡", `whispers “${text}”`, { hearts: 1, hold: 2600 }]);
    }
    else lines.push(["mrr", "had a cozy day with you.", { hearts: 1, hold: 2200 }]);
    lines.push(["night night", `whispers goodnight${you}.`, { hearts: 0, hold: 2200 }]);
    mimi.announce(lines, () => {
      write(KEY, nightKey());
      tucking = false;
      render();
    });
  });

  render();
  setInterval(render, 60_000);
}
