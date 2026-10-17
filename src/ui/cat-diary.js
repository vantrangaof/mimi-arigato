// The cat's diary (a tab named after your cat, like "Xiao Mi's diary"): one photo a day of your
// real cat, or of the two of you, and a line the cat writes about it ("Sat in the sunbeam.
// Refused to move. 10/10."). Mimi's AI writes the line when you're signed in; otherwise it's one
// of the lines below. You can change the line, the photo, or who's in it. Flip back page by page.
// Pages sync (store.KEYS.catDiary); the photos are ordinary photos, so they're in Photos too.

import { el, pick, plural } from "../core/dom.js";
import { dayKey, formatLong, formatShort } from "../core/dates.js";
import { store, KEYS, read, write, catName, addPhoto, photoById, photoURL } from "../core/store.js";
import { preparePhoto, photoErrorMessage } from "../core/images.js";
import { purr } from "../cat/sound.js";
import { captionPhoto } from "../cloud/ai.js";
import { openPhoto } from "./photos.js";

const LINES = {
  cat: [
    "Posed for the human. Expect royalties.",
    "Was photographed doing nothing. I am very good at nothing.",
    "Sat exactly where the light was. Obviously.",
    "Looked majestic. You're welcome.",
    "The human pointed the shiny rectangle at me again. Fine.",
    "Today I was a loaf. Tomorrow, who knows.",
  ],
  both: [
    "Took a picture with my human. They look happy. So do I, secretly.",
    "Me and the human. Mostly me.",
    "The human held me for a photo. I allowed it. Briefly.",
    "Two of us. One is the cat. The other is also nice.",
  ],
};

const base64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const pages = () => read(KEYS.catDiary, []).filter((p) => !p.deleted).sort((a, b) => a.day.localeCompare(b.day));
const pageFor = (day) => pages().find((p) => p.day === day) ?? null;

function savePage(page) {
  const all = read(KEYS.catDiary, []).filter((p) => p.id !== page.id);
  write(KEYS.catDiary, [...all, { ...page, updatedAt: Date.now() }]);
  store.save(); // re-renders, and sync picks it up
}

export function wireCatDiary(mimi, { panel, tab, input, openTranslator }) {
  let showing = dayKey(); // the day on screen
  let who = "cat"; // who's in the next photo
  let busy = false;
  let editing = false;
  let replacing = null; // the page whose photo is being changed

  function whoPicker() {
    const name = catName();
    const option = (value, label) => el("button", {
      type: "button",
      class: "cat-diary-who-option",
      "aria-pressed": String(who === value),
      text: label,
      onclick: () => {
        who = value;
        render();
      },
    });
    return el("div", { class: "cat-diary-who", role: "group", "aria-label": "Who's in the photo" },
      option("cat", name), option("both", `${name} & me`));
  }

  function photoBox(page) {
    const img = el("img", { alt: page.who === "both" ? `${catName()} and you` : catName() });
    const photo = photoById(page.photoId);
    if (photo) {
      photoURL(photo.id, "full").then((url) => url && (img.src = url))
        .catch(() => photoURL(photo.id, "thumb").then((url) => url && (img.src = url)));
    }
    return photo
      ? el("button", { type: "button", class: "cat-diary-photo", "aria-label": "Open photo", onclick: () => openPhoto(photo.id) }, img)
      : el("p", { class: "cat-diary-photo is-missing muted small", text: "This photo was removed." });
  }

  function lineBox(page) {
    const name = catName();
    if (editing) {
      const box = el("textarea", { class: "text-input cat-diary-edit", maxlength: "160", rows: "2" });
      box.value = page.line;
      const save = () => {
        const line = box.value.trim().slice(0, 160);
        editing = false;
        if (line) savePage({ ...page, line });
        else render();
      };
      queueMicrotask(() => box.focus());
      return el("div", { class: "cat-diary-editing" }, box, el("div", { class: "row" },
        el("button", { type: "button", class: "pixel-button primary", text: "Save", onclick: save }),
        el("button", { type: "button", class: "pixel-button", text: "Cancel", onclick: () => { editing = false; render(); } }),
      ));
    }
    return el("figure", { class: "cat-diary-line" },
      el("blockquote", { text: page.line }),
      el("figcaption", { text: `— ${name}${page.who === "both" ? " (and you)" : ""}` }),
    );
  }

  function pageView(page) {
    return el("article", { class: "cat-diary-page" },
      photoBox(page),
      lineBox(page),
      !editing && el("div", { class: "cat-diary-actions" },
        el("button", { type: "button", class: "link-button", text: "Change the words", onclick: () => { editing = true; render(); } }),
        el("label", { class: "link-button", for: input.id, onclick: () => { replacing = page; who = page.who; } }, "Change the photo"),
      ),
    );
  }

  function emptyToday() {
    const name = catName();
    return el("div", { class: "cat-diary-empty" },
      el("p", { class: "cat-diary-empty-title", text: `No photo of ${name} today yet.` }),
      el("p", { class: "muted small", text: `Take one and ${name} will write about it.` }),
      whoPicker(),
      el("label", { class: `pixel-button primary cat-diary-add${busy ? " is-busy" : ""}`, for: input.id, onclick: () => { replacing = null; } },
        busy ? `${name} is writing…` : "Add today's photo"),
    );
  }

  function render() {
    const name = catName();
    tab.textContent = `${name}'s diary`;
    const all = pages();
    const today = dayKey();
    // Days you can flip to: every page, plus today.
    const days = [...new Set([...all.map((p) => p.day), today])].sort();
    if (!days.includes(showing)) showing = today;
    const i = days.indexOf(showing);
    const page = pageFor(showing);

    const nav = el("div", { class: "panel-row cat-diary-nav" },
      el("button", { type: "button", class: "icon-button small", "aria-label": "Previous page", disabled: i <= 0, onclick: () => go(days[i - 1]) }, "‹"),
      el("h3", { class: "panel-heading flush", text: showing === today ? `Today · ${formatShort(showing)}` : formatLong(showing) }),
      el("button", { type: "button", class: "icon-button small", "aria-label": "Next page", disabled: i >= days.length - 1, onclick: () => go(days[i + 1]) }, "›"),
    );

    panel.replaceChildren(...[
      el("button", { type: "button", class: "pixel-button cat-diary-translate", onclick: openTranslator }, `What is ${name} saying? Cat translator`),
      el("p", { class: "muted small cat-diary-count", text: all.length ? `${plural(all.length, "day")} of ${name} so far.` : `A photo a day of ${name}, and what ${name} thinks about it.` }),
      nav,
      page ? pageView(page) : emptyToday(),
      all.length > 1 && el("div", { class: "cat-diary-strip", "aria-label": "All pages" }, ...all.slice().reverse().map((p) => strip(p))),
    ].filter(Boolean));
  }

  function strip(p) {
    const img = el("img", { alt: formatShort(p.day), loading: "lazy" });
    photoURL(p.photoId, "thumb").then((url) => url && (img.src = url)).catch(() => {});
    return el("button", {
      type: "button",
      class: `cat-diary-thumb${p.day === showing ? " is-current" : ""}`,
      "aria-label": formatLong(p.day),
      onclick: () => go(p.day),
    }, img);
  }

  function go(day) {
    showing = day;
    editing = false;
    render();
  }

  async function add(file) {
    const name = catName();
    const day = replacing?.day ?? dayKey();
    busy = true;
    render();
    mimi.setActivity("is writing in their diary…");
    try {
      const prepared = await preparePhoto(file);
      const said = await captionPhoto(await base64(prepared.thumb), who, { catName: name });
      const line = said.line || pick(LINES[who]);
      const photo = await addPhoto({ full: prepared.full, thumb: prepared.thumb, caption: line, day });
      showing = day;
      savePage({ id: day, day, photoId: photo.id, who, line });
      mimi.setActivity(null);
      if (store.settings.sound) purr({ volume: 0.5 });
      mimi.react(["✎", `wrote in their diary: “${line}”`], { hearts: 3, hold: 4200 });
    }
    catch (err) {
      mimi.setActivity(null);
      mimi.react(["mrrp?", photoErrorMessage(err)], { hearts: 0, hold: 3200 });
    }
    finally {
      busy = false;
      replacing = null;
      render();
    }
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    if (file && !busy) add(file);
  });

  store.on(() => {
    if (!editing) render();
  });
  render();
}
