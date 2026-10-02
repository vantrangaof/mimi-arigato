// Top bar: days together, sound toggle, and the settings gear icon.

import { store, catName, totalThings } from "../core/store.js";
import { plural } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { meow } from "../cat/sound.js";
import { daysTogether } from "../memory/relationship.js";

const PAW = [".o.o.", "o...o", ".ooo.", "ooooo", ".ooo."];
const GEAR = ["...o...", ".ooooo.", ".oo.oo.", "oo...oo", ".oo.oo.", ".ooooo.", "...o..."];
const SPEAKER_ON = ["...o.....", "..oo...o.", "oooo.o..o", "oooo.o..o", "oooo.o..o", "..oo...o.", "...o....."];
const SPEAKER_OFF = ["...o.....", "..oo.....", "oooo.o.o.", "oooo..o..", "oooo.o.o.", "..oo.....", "...o....."];
const icon = (rows, className) => pixelSVG(rows, { o: "currentColor" }, className);

export function wireTopbar({ together, soundToggle, settingsOpen }) {
  settingsOpen.append(icon(GEAR));

  const renderTogether = () => {
    const days = daysTogether();
    const text = document.createElement("span");
    text.textContent = days === 1 ? "First day together" : `Day ${days} together`;
    together.replaceChildren(icon(PAW, "paw"), text);
    together.title = `${catName()} has been with you for ${plural(days, "day")}. ${plural(totalThings(), "good thing")} together.`;
  };

  const renderSound = () => {
    const on = store.settings.sound;
    soundToggle.replaceChildren(icon(on ? SPEAKER_ON : SPEAKER_OFF));
    soundToggle.setAttribute("aria-pressed", String(on));
    soundToggle.setAttribute("aria-label", on ? "Sound on" : "Sound off");
    soundToggle.title = on ? "Sound on. Click to mute." : "Sound off. Click to hear Mimi.";
  };

  soundToggle.addEventListener("click", () => {
    store.settings.sound = !store.settings.sound;
    store.save("settings");
    if (store.settings.sound) meow({ volume: 0.6 });
  });

  store.on(renderTogether);
  store.on(renderSound);
  renderTogether();
  renderSound();
}
