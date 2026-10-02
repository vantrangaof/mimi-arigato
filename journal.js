// Five good things a day.

import { store, dayKey, entriesFor, catName, totalThings } from "./store.js";
import { heartSVG } from "./mimi.js";
import { ACCESSORIES } from "./sprite.js";

const DAILY = 5;

const REACTIONS = [
  ["arigato!", "loves hearing that."],
  ["nya!", "is smiling with you."],
  ["mrrp~", "tucks that one away."],
  ["purr~", "thinks that's lovely."],
  ["arigato!", "is full of thanks."],
];

export function wireJournal(mimi, els) {
  const entries = () => entriesFor(dayKey());

  function render() {
    const list = entries();
    const n = Math.min(list.length, DAILY);
    const full = list.length >= DAILY;
    const name = catName();

    els.title.textContent = `Tell ${name} five good things`;
    els.hearts.replaceChildren(...Array.from({ length: DAILY }, (_, i) => heartSVG("slot", i < n)));
    els.progress.textContent = full ? "All five, done for today." : `${n} of ${DAILY} today`;

    els.list.replaceChildren(...list.map((text, i) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = text;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "remove";
      del.textContent = "×";
      del.setAttribute("aria-label", `Remove “${text}”`);
      del.addEventListener("click", () => {
        const today = dayKey();
        store.days[today].splice(i, 1);
        if (!store.days[today].length) delete store.days[today];
        store.saveDays();
        els.input.focus();
      });
      li.append(span, del);
      return li;
    }));

    els.form.hidden = full;
    els.done.hidden = !full;
    els.done.textContent = `${name} will keep these safe. Come back tomorrow for five more.`;
    els.send.textContent = name.length <= 8 ? `Tell ${name}` : "Tell";
    els.input.placeholder = n === 0 ? "Something good about today…" : "And another…";
    els.share.hidden = list.length === 0;
    mimi.setFull(full);
  }

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text || entries().length >= DAILY) return;

    const before = totalThings();
    store.days[dayKey()] = [...entries(), text];
    els.input.value = "";
    const unlocked = ACCESSORIES.find((a) => before < a.need && before + 1 >= a.need);
    if (unlocked) {
      store.settings.accessory = unlocked.id;
      store.saveSettings();
    }
    store.saveDays();

    const n = entries().length;
    if (unlocked) {
      mimi.react(["ooh!", `got a ${unlocked.label.toLowerCase()} for hearing ${unlocked.need} good things!`], { hearts: 3, hold: 3600 });
    } else {
      mimi.react(REACTIONS[n - 1], { hearts: n === DAILY ? 5 : 1 });
    }
    if (n < DAILY) els.input.focus();
  });

  store.on(render);
  render();
}
