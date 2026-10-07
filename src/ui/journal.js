// Telling Mimi good things: one is a good day, five is Mimi's favorite.

import { el, capitalize } from "../core/dom.js";
import { dayKey } from "../core/dates.js";
import {
  store, entriesToday, entryRecordsFor, catName, userName, totalThings, addEntry, removeEntry, addPhoto, linkEntryPhoto, photoById,
  quietToday, markQuietDay,
} from "../core/store.js";
import { preparePhoto, photoErrorMessage } from "../core/images.js";
import { photoThumb } from "./photos.js";
import { heartSVG } from "../cat/mimi.js";
import { purr } from "../cat/sound.js";
import { WORLD, nextUnlock } from "../world/world.js";
import { reactionFor, echoOf, echoLine, thankee } from "../memory/insights.js";
import { mimiGoodThing, goodThingLine } from "../memory/mimi-good.js";
import { pixelSVG } from "../core/pixel.js";
import { fillScrapbook } from "../memory/scrapbook.js";
import { newMilestones } from "../memory/relationship.js";
import { claimRoomThings, roomThingLine } from "../memory/themes.js";
import { noticeWish, forgetWish, madeLine, cameTrueLine } from "../memory/wishes.js";
import { checkGoodThing } from "../cloud/ai.js";

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

const ENVELOPE = ["ooooooooo", "oo.....oo", "o.o...o.o", "o..ooo..o", "o.......o", "ooooooooo"];

function progressLine(n) {
  if (n === 0) return "One is enough today";
  if (n === 1) return "That's a good day";
  if (n < DAILY) return `${n} of ${DAILY}`;
  return `${capitalize(catName())}'s favorite kind of day`;
}

export function wireJournal(mimi, els) {
  let prompt = null;
  let pending = null; // a photo chosen for the next good thing: { full, thumb, url }

  function renderAttachment(message = "") {
    els.attachPreview.replaceChildren(...(pending
      ? [
        el("img", { src: pending.url, alt: "Photo to attach" }),
        el("span", { class: "muted small", text: "Photo ready to attach" }),
        el("button", { type: "button", class: "remove", text: "×", "aria-label": "Remove photo", onclick: () => { URL.revokeObjectURL(pending.url); pending = null; renderAttachment(); } }),
      ]
      : message ? [el("span", { class: "muted small", text: message })] : []));
    els.attachPreview.hidden = !pending && !message;
  }

  els.attachInput.addEventListener("change", async () => {
    const file = els.attachInput.files[0];
    els.attachInput.value = "";
    if (!file) return;
    try {
      const prepared = await preparePhoto(file);
      if (pending) URL.revokeObjectURL(pending.url);
      pending = { ...prepared, url: URL.createObjectURL(prepared.thumb) };
      renderAttachment();
      els.input.focus();
    } catch (err) {
      renderAttachment(photoErrorMessage(err));
    }
  });

  function render() {
    const list = entriesToday();
    const n = Math.min(list.length, DAILY);
    const full = list.length >= DAILY;
    const name = catName();

    els.title.textContent = `Tell ${name} something good`;
    els.hearts.replaceChildren(...Array.from({ length: DAILY }, (_, i) => heartSVG("slot", i < n)));
    els.progress.textContent = progressLine(n);

    const records = entryRecordsFor(dayKey());
    els.list.replaceChildren(...list.map((text, i) => el("li", {},
      el("span", { class: "entry-text" },
        records[i]?.photoId && photoById(records[i].photoId) && photoThumb(photoById(records[i].photoId), "photo-thumb small"),
        el("span", { text }),
      ),
      el("span", { class: "entry-actions" },
        thankee(text) && el("button", {
          type: "button",
          class: "remove thank",
          title: `Send a thank-you card to ${thankee(text)}`,
          "aria-label": `Make a thank-you card for “${text}”`,
          onclick: () => els.onThank(text),
        }, pixelSVG(ENVELOPE, { o: "currentColor" })),
        el("button", {
          type: "button",
          class: "remove",
          text: "×",
          "aria-label": `Remove “${text}”`,
          onclick: () => {
            removeEntry(dayKey(), i);
            if (forgetWish(dayKey(), text)) store.save("wishes");
            store.save("days");
            els.input.focus();
          },
        }),
      ),
    )));

    els.form.hidden = full;
    els.stuck.hidden = full;
    els.nothing.hidden = list.length > 0 || quietToday();
    els.earnHint.hidden = full;
    els.earnHint.classList.remove("is-warning");
    els.earnHint.textContent = `Each good thing earns ${name} a fish, water and a cuddle.`;
    els.done.hidden = !full;
    els.done.textContent = `${name} will keep these safe. See you tomorrow${userName() ? `, ${userName()}` : ""}.`;
    els.send.textContent = name.length <= 8 ? `Tell ${name}` : "Tell";
    els.input.placeholder = prompt ? `${prompt.chip}…`
      : n === 0 ? OPENERS[Math.floor(Date.now() / 86_400_000) % OPENERS.length]
      : "And another…";
    els.share.hidden = list.length === 0;

    els.mimiGood.textContent = list.length ? `${name}'s good thing today: ${mimiGoodThing()}` : "";
    els.mimiGood.hidden = !list.length;

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

  // Some days nothing stands out, and that's okay: Mimi gives you a fish anyway.
  els.nothing.addEventListener("click", () => {
    markQuietDay();
    if (store.settings.sound) purr({ volume: 0.5 });
    mimi.react(["that's okay", "says some days are just days. Here's a fish anyway."], { hearts: 1, hold: 3600 });
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

  let saving = false;
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (saving || !text || entriesToday().length >= DAILY) return;
    saving = true;

    // Mimi reads it first (when signed in) and keeps it, however small. Only keyboard mashing
    // stays in the box (a paw slipped), and something painful gets comfort instead.
    // If the AI can't be reached, it's kept as always.
    els.send.disabled = true;
    mimi.setActivity("is reading…");
    const check = await checkGoodThing(text, { catName: catName(), userName: userName() });
    mimi.setActivity(null);
    els.send.disabled = false;
    if (check.verdict === "oops" || check.verdict === "hard") {
      const hard = check.verdict === "hard";
      mimi.react(hard ? ["♡", `curls up next to you: “${check.reply}”`] : ["mrrp?", `tilts their head: “${check.reply}”`], { hearts: hard ? 2 : 0, hold: 5200 });
      if (!hard) {
        els.earnHint.textContent = "Not saved yet: fix it and tap Tell again.";
        els.earnHint.classList.add("is-warning");
      }
      saving = false;
      els.input.focus();
      return;
    }
    const said = check.reply && check.verdict !== "unclear" ? check.reply : null; // "unclear": an older server

    const today = dayKey();
    const before = totalThings();
    const echo = echoOf(text, today);
    const record = addEntry(text, today);
    els.input.value = "";
    prompt = null;
    if (pending) {
      const photo = await addPhoto({ full: pending.full, thumb: pending.thumb, caption: text, day: today, entryId: record.id });
      linkEntryPhoto(record.id, photo.id);
      URL.revokeObjectURL(pending.url);
      pending = null;
      renderAttachment();
    }

    const n = entriesToday().length;
    const wish = noticeWish(text, today);
    const events = [wish.cameTrue.length
      ? ["!!", cameTrueLine(wish.cameTrue[0]), { hearts: 5, hold: 4200 }]
      : echo
      ? ["♡", echoLine(echo), { hearts: 2, hold: 3000 }]
      : said
      ? [reactionFor(text, n)[0], `says: “${said}”`, { hearts: n === DAILY ? 5 : 1, hold: 3400 }]
      : [...reactionFor(text, n), { hearts: n === DAILY ? 5 : 1, hold: 2200 }]];
    if (wish.made) events.push(["a wish!", madeLine(wish.made), { hearts: 2, hold: 3400 }]);
    for (const theme of claimRoomThings(today)) events.push(["hmm!", roomThingLine(theme), { hearts: 2, hold: 3600 }]);

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
    // After your first good thing of the day, Mimi shares theirs.
    if (n === 1) events.push(["my turn!", goodThingLine(mimiGoodThing()), { hearts: 1, hold: 3400 }]);

    store.save("days", "settings", "scrapbook", "wishes", "roomThings");
    if (store.settings.sound) purr({ volume: 0.6 });
    mimi.announce(events);
    saving = false;
    if (n < DAILY) els.input.focus();
  });

  store.on(render);
  render();
}
