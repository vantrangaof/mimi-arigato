// Telling Mimi good things: one is a good day, five is Mimi's favorite.

import { el, capitalize } from "../core/dom.js";
import { dayKey } from "../core/dates.js";
import { store, entriesToday, catName, userName, totalThings, addEntry, removeEntry } from "../core/store.js";
import { heartSVG } from "../cat/mimi.js";
import { purr } from "../cat/sound.js";
import { WORLD, nextUnlock } from "../world/world.js";
import { reactionFor, echoOf, echoLine } from "../memory/insights.js";
import { fillScrapbook } from "../memory/scrapbook.js";
import { newMilestones } from "../memory/relationship.js";

const DAILY = 5;

const PROMPTS = [
  { chip: "Something tiny", ask: "wants to hear something tiny." },
  { chip: "Something small you enjoyed", ask: "wants to hear about something small you enjoyed." },
  { chip: "Someone who was kind to you", ask: "wants to hear who was kind to you." },
  { chip: "Something that made you laugh", ask: "wants to hear what made you laugh." },
  { chip: "Something delicious", ask: "wants to hear about something delicious." },
  { chip: "Something you're proud of", ask: "wants to hear what you're proud of." },
  { chip: "Something cute you saw", ask: "wants to hear about something cute." },
  { chip: "Something beautiful", ask: "wants to hear about something beautiful." },
  { chip: "Something you want to remember", ask: "wants to hear something worth remembering." },
];

// The first placeholder of the day rotates so the question doesn't go stale.
const OPENERS = [
  "Something good about today…",
  "Tell me something tiny…",
  "What made you smile?",
  "Something delicious you had…",
  "Someone who was kind to you…",
];

function progressLine(n) {
  if (n === 0) return "One is enough today";
  if (n === 1) return "That's a good day";
  if (n < DAILY) return `${n} of ${DAILY}`;
  return `${capitalize(catName())}'s favorite kind of day`;
}

export function wireJournal(mimi, els) {
  let prompt = null;

  function render() {
    const list = entriesToday();
    const n = Math.min(list.length, DAILY);
    const full = list.length >= DAILY;
    const name = catName();

    els.title.textContent = `Tell ${name} something good`;
    els.hearts.replaceChildren(...Array.from({ length: DAILY }, (_, i) => heartSVG("slot", i < n)));
    els.progress.textContent = progressLine(n);

    els.list.replaceChildren(...list.map((text, i) => el("li", {},
      el("span", { text }),
      el("button", {
        type: "button",
        class: "remove",
        text: "×",
        "aria-label": `Remove “${text}”`,
        onclick: () => {
          removeEntry(dayKey(), i);
          store.save("days");
          els.input.focus();
        },
      }),
    )));

    els.form.hidden = full;
    els.stuck.hidden = full;
    els.done.hidden = !full;
    els.done.textContent = `${name} will keep these safe. See you tomorrow${userName() ? `, ${userName()}` : ""}.`;
    els.send.textContent = name.length <= 8 ? `Tell ${name}` : "Tell";
    els.input.placeholder = prompt ? `${prompt.chip}…`
      : n === 0 ? OPENERS[Math.floor(Date.now() / 86_400_000) % OPENERS.length]
      : "And another…";
    els.share.hidden = list.length === 0;

    const next = nextUnlock(totalThings());
    els.next.textContent = next
      ? `Next for ${name}'s world: a ${next.label} at ${next.need} good things.`
      : `${name}'s world is complete. Thank you for every good thing.`;
    mimi.setFull(full);
  }

  els.stuckButton.addEventListener("click", () => {
    const open = els.chips.hidden;
    els.chips.hidden = !open;
    els.stuckButton.setAttribute("aria-expanded", String(open));
  });

  els.chips.replaceChildren(...PROMPTS.map((p) => el("button", {
    type: "button",
    class: "chip",
    text: p.chip,
    onclick: () => {
      prompt = p;
      els.chips.hidden = true;
      els.stuckButton.setAttribute("aria-expanded", "false");
      mimi.react(["hmm?", p.ask], { hearts: 0, hold: 2600 });
      render();
      els.input.focus();
    },
  })));

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text || entriesToday().length >= DAILY) return;

    const today = dayKey();
    const before = totalThings();
    const echo = echoOf(text, today);
    addEntry(text, today);
    els.input.value = "";
    prompt = null;

    const n = entriesToday().length;
    const events = [echo
      ? ["♡", echoLine(echo), { hearts: 2, hold: 3000 }]
      : [...reactionFor(text, n), { hearts: n === DAILY ? 5 : 1, hold: 2200 }]];

    for (const item of WORLD.filter((w) => before < w.need && before + 1 >= w.need)) {
      if (item.kind === "acc") store.settings.wear = { ...store.settings.wear, [item.slot]: item.id };
      events.push(["ooh!", item.kind === "acc"
        ? `got a ${item.label} for hearing ${item.need} good things!`
        : `got a ${item.label} for their room!`, { hearts: 3, hold: 3200 }]);
    }
    for (const page of fillScrapbook()) {
      const short = page.text.length > 40 ? `${page.text.slice(0, 38)}…` : page.text;
      events.push(["snip snip", `put “${short}” in the scrapbook.`, { hearts: 2, hold: 3600 }]);
    }
    events.push(...newMilestones());

    store.save("days", "settings", "scrapbook");
    if (store.settings.sound) purr({ volume: 0.6 });
    mimi.announce(events);
    if (n < DAILY) els.input.focus();
  });

  store.on(render);
  render();
}
