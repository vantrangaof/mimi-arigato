// Top bar: days together, cloud sign-in/sync status, sound toggle, and the settings gear.

import { store, catName, totalThings } from "../core/store.js";
import { plural } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { meow } from "../cat/sound.js";
import { daysTogether } from "../memory/relationship.js";
import { cloudConfigured, cloudStatus, onCloudChange } from "../cloud/sync.js";

const PAW = [".o.o.", "o...o", ".ooo.", "ooooo", ".ooo."];
const GEAR = ["...o...", ".ooooo.", ".oo.oo.", "oo...oo", ".oo.oo.", ".ooooo.", "...o..."];
const SPEAKER_ON = ["...o.....", "..oo...o.", "oooo.o..o", "oooo.o..o", "oooo.o..o", "..oo...o.", "...o....."];
const SPEAKER_OFF = ["...o.....", "..oo.....", "oooo.o.o.", "oooo..o..", "oooo.o.o.", "..oo.....", "...o....."];
const CLOUD = ["...ooo...", ".oooooo..", "ooooooooo", "ooooooooo", ".ooooooo."];
const icon = (rows, className) => pixelSVG(rows, { o: "currentColor" }, className);

// Opens Settings scrolled to "Account & sync", focusing the email box if signed out.
function openAccount(settingsOpen) {
  settingsOpen.click();
  requestAnimationFrame(() => {
    document.getElementById("accountSection")?.scrollIntoView({ block: "center" });
    document.getElementById("accountEmail")?.focus();
  });
}

function wireCloudButton(button, settingsOpen) {
  const render = () => {
    button.hidden = !cloudConfigured();
    if (button.hidden) return;
    const s = cloudStatus();
    const label = !s.email ? "Sign in"
      : s.state === "syncing" ? "Syncing…"
      : s.state === "error" ? "Sync problem"
      : "Synced";
    button.dataset.state = s.email ? s.state : "signed-out";
    button.replaceChildren(icon(CLOUD), Object.assign(document.createElement("span"), { textContent: label }));
    button.setAttribute("aria-label", s.email ? `Cloud sync: ${label}. Signed in as ${s.email}.` : "Sign in to sync your good things");
    button.title = s.state === "error" ? s.error : s.email ? `Signed in as ${s.email}` : "Sign in to keep your good things in the cloud";
  };
  button.addEventListener("click", () => openAccount(settingsOpen));
  onCloudChange(render);
  render();
}

export function wireTopbar({ together, soundToggle, settingsOpen, cloudButton }) {
  settingsOpen.append(icon(GEAR));
  wireCloudButton(cloudButton, settingsOpen);

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
