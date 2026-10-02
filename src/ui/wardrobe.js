// Wardrobe: dress Mimi up, one item per slot (head, neck, face), with a live preview.

import { el, capitalize } from "../core/dom.js";
import { store, catName, totalThings } from "../core/store.js";
import { renderCat, applyLook, accessoryPreview, FURS } from "../cat/sprite.js";
import { meow } from "../cat/sound.js";
import { ACCESSORIES, SLOTS, validWear } from "../world/world.js";

// Earlier versions stored a single `accessory`; move it into its slot.
function migrateSingleAccessory() {
  const old = store.settings.accessory;
  if (typeof old !== "string") return;
  const item = ACCESSORIES.find((a) => a.id === old);
  if (item) store.settings.wear = { ...store.settings.wear, [item.slot]: item.id };
  delete store.settings.accessory;
  store.save("settings");
}

export function wireWardrobe(mimi, { open, dialog, preview, previewCat, slots, next }) {
  migrateSingleAccessory();
  renderCat(previewCat);
  let changed = false;

  function wear(slot, id) {
    store.settings.wear = { ...store.settings.wear, [slot]: id };
    changed = true;
    store.save("settings");
  }

  function tile(slot, item, worn, total) {
    const locked = item && total < item.need;
    const on = (item?.id ?? "none") === worn;
    return el("button", {
      type: "button",
      class: "wear-tile",
      "aria-pressed": String(on),
      disabled: locked,
      onclick: () => wear(slot, on ? "none" : item?.id ?? "none"),
    },
    item ? accessoryPreview(item.id, "wear-art") : el("span", { class: "wear-none", text: "—" }),
    el("span", { class: "wear-label", text: item ? capitalize(item.label) : "Nothing" }),
    locked && el("span", { class: "lock", text: `at ${item.need}` }));
  }

  function render() {
    const total = totalThings();
    const current = validWear(store.settings.wear, total);
    applyLook(preview, { fur: FURS[store.settings.fur] ? store.settings.fur : "pink", wear: current });

    slots.replaceChildren(...SLOTS.map(({ id: slot, label }) => el("section", { class: "wear-slot" },
      el("h3", { class: "panel-heading", text: label }),
      el("div", { class: "wear-grid" },
        tile(slot, null, current[slot], total),
        ...ACCESSORIES.filter((a) => a.slot === slot).map((a) => tile(slot, a, current[slot], total)),
      ),
    )));

    const upcoming = ACCESSORIES.filter((a) => total < a.need).sort((a, b) => a.need - b.need)[0];
    next.textContent = upcoming
      ? `Tell ${catName()} ${upcoming.need - total} more good things to unlock the ${upcoming.label}.`
      : "Every outfit is unlocked.";
  }

  open.addEventListener("click", () => {
    changed = false;
    render();
    dialog.showModal();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (!changed) return;
    if (store.settings.sound) meow();
    mimi.react(["ta-da!", "is showing off their new look."], { hearts: 2, hold: 2600 });
  });

  store.on(() => {
    if (dialog.open) render();
  });
}
