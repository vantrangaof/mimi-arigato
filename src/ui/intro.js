// First meeting: Mimi asks what to call you. Shown until you answer or choose "Maybe later".

import { store, catName } from "../core/store.js";
import { meow } from "../cat/sound.js";

export const needsIntro = () => !store.settings.userName.trim() && !store.settings.nameAsked;

export function wireIntro(mimi, { card, form, input, skip, title, note }) {
  const render = () => {
    card.hidden = !needsIntro();
    title.textContent = "What's your name?";
    note.textContent = `${catName()} would like to know what to call you.`;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim().slice(0, 24);
    if (!name) return;
    store.settings.userName = name;
    store.settings.nameAsked = true;
    store.save("settings");
    if (store.settings.sound) meow();
    mimi.react([`hi, ${name}!`, `will remember you, ${name}.`], { hearts: 3, hold: 3200 });
  });

  skip.addEventListener("click", () => {
    store.settings.nameAsked = true;
    store.save("settings");
    mimi.react(["okay!", "will ask another time. You can add it in Settings."], { hearts: 0, hold: 2800 });
  });

  store.on(render);
  render();
}
