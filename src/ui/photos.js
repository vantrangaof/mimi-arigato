// Photos: the album tab, the full-size viewer, and small thumbnails used elsewhere
// (journal, calendar, scrapbook, month).

import { el, pick, plural } from "../core/dom.js";
import { formatLong } from "../core/dates.js";
import {
  store, catName, photoList, photoById, photoURL, addPhoto, updatePhoto, removePhoto,
} from "../core/store.js";
import { preparePhoto, photoErrorMessage } from "../core/images.js";
import { meow } from "../cat/sound.js";
import { cloudConfigured, cloudStatus, fetchPhotoFile } from "../cloud/sync.js";

const REACTIONS = [
  ["ooh!", "loves this photo."],
  ["!!", "wants a copy for the fridge."],
  ["purr~", "thinks you both look lovely."],
  ["mrrp!", "is keeping this one forever."],
];

let viewer; // set by wirePhotos

// An image's URL: from this device, or downloaded from the cloud when missing.
async function imageURL(id, size) {
  const local = await photoURL(id, size);
  if (local) return local;
  return (await fetchPhotoFile(id, size)) ? photoURL(id, size) : null;
}

// A small square thumbnail that opens the viewer.
export function photoThumb(photo, className = "photo-thumb") {
  const img = el("img", { alt: photo.caption || `Photo from ${formatLong(photo.day)}`, loading: "lazy" });
  imageURL(photo.id, "thumb").then((url) => {
    if (url) img.src = url;
  });
  return el("button", { type: "button", class: className, "aria-label": `Open photo${photo.caption ? `: ${photo.caption}` : ""}`, onclick: () => openPhoto(photo.id) }, img);
}

export function openPhoto(id) {
  viewer?.open(id);
}

function wireViewer({ dialog, image, caption, meta, actions }) {
  let currentId = null;
  let confirming = false;

  function renderActions() {
    actions.replaceChildren(...(confirming
      ? [
        el("span", { class: "muted small", text: "Delete this photo for good?" }),
        el("button", { type: "button", class: "pixel-button primary", text: "Delete", onclick: () => { removePhoto(currentId); dialog.close(); } }),
        el("button", { type: "button", class: "link-button", text: "Keep it", onclick: () => { confirming = false; renderActions(); } }),
      ]
      : [el("button", { type: "button", class: "link-button danger", text: "Delete photo", onclick: () => { confirming = true; renderActions(); } })]));
  }

  async function open(id) {
    const photo = photoById(id);
    if (!photo) return;
    currentId = id;
    confirming = false;
    image.removeAttribute("src");
    image.alt = photo.caption || `Photo from ${formatLong(photo.day)}`;
    caption.value = photo.caption;
    meta.textContent = `${formatLong(photo.day)}${photo.entryId ? ", with a good thing" : ""}`;
    renderActions();
    dialog.showModal();
    const thumb = await photoURL(id, "thumb");
    if (thumb && currentId === id) image.src = thumb;
    const full = await imageURL(id, "full");
    if (full && currentId === id) image.src = full;
  }

  caption.addEventListener("change", () => {
    if (currentId) updatePhoto(currentId, { caption: caption.value.trim().slice(0, 140) });
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  return { open };
}

export function wirePhotos(mimi, { panel, input, viewer: viewerEls }) {
  viewer = wireViewer(viewerEls);
  let status = "";

  async function addFiles(files) {
    if (!files.length) return;
    const errors = [];
    let added = null;
    status = files.length > 1 ? `Saving ${files.length} photos…` : "Saving your photo…";
    render();
    for (const file of files) {
      try {
        added = await addPhoto(await preparePhoto(file));
      } catch (err) {
        errors.push(photoErrorMessage(err));
      }
    }
    status = errors[0] ?? "";
    render();
    if (added) {
      if (store.settings.sound) meow();
      mimi.react(pick(REACTIONS), { hearts: 3, hold: 2600 });
      if (files.length === 1) openPhoto(added.id); // straight to adding a caption
    }
  }

  input.addEventListener("change", () => {
    addFiles([...input.files]);
    input.value = "";
  });

  function render() {
    const list = photoList();
    const name = catName();
    const cloud = cloudConfigured() && !cloudStatus().email ? " Sign in under Settings to keep them in the cloud too." : "";
    panel.replaceChildren(...[
      el("div", { class: "panel-row" },
        el("h3", { class: "panel-heading flush", text: list.length ? `Our photos (${list.length})` : "Our photos" }),
        el("label", { class: "pixel-button", for: input.id, text: "Add photos" }),
      ),
      status && el("p", { class: "muted small", role: "status", text: status }),
      list.length
        ? el("div", { class: "photo-grid" }, ...list.map((p) => el("figure", { class: "photo-tile" },
          photoThumb(p),
          p.caption && el("figcaption", { text: p.caption }),
        )))
        : el("p", { class: "muted", text: `Add photos of you and ${name}. They're saved in the app.${cloud}` }),
      list.length > 0 && el("p", { class: "muted small", text: `${plural(list.length, "photo")} saved.${cloud}` }),
    ].filter(Boolean));
  }

  store.on(render);
  render();
}
