// "How Mimi works": a short guide in a sheet. Opens by itself on your first visit, and any time
// from the ? button in the top bar.

import { el } from "../core/dom.js";
import { pixelSVG } from "../core/pixel.js";
import { catName, read, write } from "../core/store.js";

const SEEN = "guideSeen";
const QUESTION = [".ooo.", "o...o", "...o.", "..o..", ".....", "..o.."];

const sections = (name) => [
  {
    title: "Every day",
    items: [
      `Tell ${name} one small good thing. Up to five a day; one is plenty.`,
      "Anything counts: a coffee, a kind text, a hard day you got through.",
      `Nothing to tell? Tap “Nothing special today”. Being here is enough.`,
      `Stuck? Tap “Stuck? Pick something to think about” for ideas.`,
    ],
  },
  {
    title: `Looking after ${name}`,
    items: [
      "Each good thing earns a fish, water and a cuddle. Tap them to give.",
      `${name}'s bowls are empty each morning. Forget them and ${name} gets a little sad; one fish cheers them right up.`,
      "A paw print marks each day you visit. Missed days are naps, never gaps.",
      `Tap ${name} to pet them. From 9 pm, tap Tuck in to say goodnight.`,
    ],
  },
  {
    title: `What ${name} remembers`,
    items: [
      `Every time you open the app, ${name} brings back one of your good things.`,
      "Memories: theories about you (tap Nope if one is wrong), and a page for each person, place and thing.",
      "Wishes: write “I want to…” and it goes in the jar. Tap the jar for a past good thing.",
      `Diary: a private page per day. ${name} never reads it.`,
    ],
  },
  {
    title: "Playing",
    items: [
      "Tap Play for the arcade: catch the fish, pairs, Mimi's song and more.",
      "Dress up, and watch the room fill with things as your good things add up.",
    ],
  },
  {
    title: "Keeping it safe",
    items: [
      "Add to Home Screen so your phone doesn't clear it.",
      "Sign in (the cloud button) to sync to all your devices and chat with " + name + ".",
    ],
  },
];

export function wireGuide({ button, dialog, title, body, done }) {
  button.append(pixelSVG(QUESTION, { o: "currentColor" }));
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => write(SEEN, true));

  function open() {
    const name = catName();
    title.textContent = `How ${name} works`;
    body.replaceChildren(
      el("p", { class: "guide-lead", text: `${name} is a tiny cat who remembers your life. Tell them one good thing a day, and over time ${name} gets to know you. No pressure: missing a day takes nothing away.` }),
      ...sections(name).map((s) => el("section", { class: "sheet-section guide-section" },
        el("h3", { class: "sheet-label", text: s.title }),
        el("ul", { class: "guide-list" }, ...s.items.map((text) => el("li", { text }))),
      )),
    );
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  button.addEventListener("click", open);
  done.addEventListener("click", () => dialog.close());

  return {
    open,
    // First visit: show the guide once. Returns true when it opened.
    maybeOpen() {
      if (read(SEEN, false)) return false;
      open();
      return true;
    },
  };
}
