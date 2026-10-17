// The cat translator: add a photo of your real cat, and Mimi's AI reads their body language
// ("slow blink, ears relaxed, tail up") and says what they mean, in the cat's own voice ("I love
// you. Also, dinner was 4 minutes ago."). Translations are kept in a phrasebook (synced,
// store.KEYS.catTranslations) and the photo goes to Photos. Needs you to be signed in and online.

import { el, plural } from "../core/dom.js";
import { dayKey, formatShort } from "../core/dates.js";
import { store, KEYS, read, write, catName, addPhoto, photoURL } from "../core/store.js";
import { preparePhoto, photoErrorMessage } from "../core/images.js";
import { meow } from "../cat/sound.js";
import { translateCat } from "../cloud/ai.js";
import { savePhotoComment } from "../memory/photo-comments.js";

const SHOWN = 30;

const base64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const phrasebook = () => read(KEYS.catTranslations, []).filter((t) => !t.deleted).sort((a, b) => b.updatedAt - a.updatedAt);

export function wireTranslator(mimi, { dialog, body, input, title }) {
  let shown = null; // the translation on screen: { ...t, url }
  let status = ""; // "looking" | an error message | ""

  function result(t) {
    const name = catName();
    return el("figure", { class: `translation mood-${t.mood}` },
      el("div", { class: "translation-photo" },
        t.url ? el("img", { src: t.url, alt: `Photo of ${name}` }) : null,
        el("p", { class: "translation-bubble", text: t.says }),
      ),
      el("figcaption", {},
        t.signs && el("p", { class: "translation-signs" }, el("span", { class: "translation-label", text: "What I see: " }), t.signs),
        el("p", { class: "translation-mood", text: `${name} is feeling ${t.mood}.` }),
      ),
    );
  }

  function render() {
    const name = catName();
    title.textContent = `What is ${name} saying?`;
    const book = phrasebook();
    body.replaceChildren(...[
      status === "looking"
        ? el("p", { class: "translator-status", text: `Reading ${name}'s ears, eyes, whiskers and tail…` })
        : shown ? result(shown)
        : el("p", { class: "muted", text: `Take a photo of ${name} doing anything at all. The translator reads their body language and tells you what they mean.` }),
      status && status !== "looking" && el("p", { class: "muted small translator-error", text: status }),
      el("div", { class: "row" },
        el("label", { class: `pixel-button primary${status === "looking" ? " is-busy" : ""}`, for: input.id }, shown ? "Translate another" : `Translate ${name}`),
      ),
      book.length > 0 && el("h3", { class: "sheet-label translator-book-title", text: `${name}'s phrasebook · ${plural(book.length, "phrase")}` }),
      book.length > 0 && el("ul", { class: "translator-book" }, ...book.slice(0, SHOWN).map((t) => {
        const img = el("img", { alt: "", loading: "lazy" });
        photoURL(t.photoId, "thumb").then((url) => url && (img.src = url)).catch(() => {});
        return el("li", {}, el("button", { type: "button", class: "translator-entry", onclick: () => showSaved(t) },
          el("span", { class: "translator-thumb" }, img),
          el("span", { class: "translator-says" },
            el("span", { text: `“${t.says}”` }),
            el("span", { class: "entry-date", text: formatShort(t.day) }),
          ),
        ));
      })),
    ].filter(Boolean));
  }

  async function showSaved(t) {
    shown = { ...t, url: await photoURL(t.photoId, "full").catch(() => null) ?? await photoURL(t.photoId, "thumb").catch(() => null) };
    status = "";
    render();
    dialog.scrollTop = 0;
  }

  async function translate(file) {
    const name = catName();
    status = "looking";
    shown = null;
    render();
    try {
      const prepared = await preparePhoto(file);
      const said = await translateCat(await base64(prepared.thumb), { catName: name });
      if (said.error) {
        status = said.error === "signed-out" ? "The translator needs you to be signed in (Settings → Account & sync)."
          : said.error === "sleepy" ? `${name}'s translator is tired for today. Try again tomorrow.`
          : "The translator can't be reached right now. Are you online?";
        render();
        return;
      }
      const url = URL.createObjectURL(prepared.thumb);
      if (!said.cat) {
        // No cat: say what the translator thinks, but don't keep it.
        shown = { says: said.says, signs: "", mood: said.mood, url };
        status = `No cat in this one. Try a photo of ${name}!`;
        render();
        return;
      }
      const photo = await addPhoto({ full: prepared.full, thumb: prepared.thumb, caption: said.says });
      savePhotoComment(photo.id, said.says);
      const t = { id: photo.id, photoId: photo.id, day: dayKey(), signs: said.signs, says: said.says, mood: said.mood, updatedAt: Date.now() };
      write(KEYS.catTranslations, [...read(KEYS.catTranslations, []), t]);
      shown = { ...t, url };
      status = "";
      store.save();
      if (store.settings.sound) meow({ volume: 0.6 });
      mimi.react(["!", "listened to the translation and agrees completely."], { hearts: 2, hold: 3200 });
      render();
    }
    catch (err) {
      status = photoErrorMessage(err);
      render();
    }
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    if (file && status !== "looking") translate(file);
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  return {
    open() {
      shown = null;
      status = "";
      render();
      dialog.showModal();
    },
  };
}
