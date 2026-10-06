// Visiting a friend's room: their cat and room, read-only, drawn the same way as yours.

import { el, pick } from "../core/dom.js";
import { catName } from "../core/store.js";
import { renderCat, applyLook, FURS } from "../cat/sprite.js";
import { renderRoom, validWear, ROOM_W } from "../world/world.js";
import { snapshotSeason } from "../world/room-snapshot.js";
import { visitRoom } from "../cloud/friends.js";

const SVG = "http://www.w3.org/2000/svg";

// Room lines are written for your own room ("sniffs your coffee mug"); in a friend's room
// the things belong to their human.
const asVisitor = (text) => text
  .replace("so you can't leave without them", "so nobody can leave without them")
  .replace(/\byour\b/g, "their human's");

const VISITOR_LINES = [
  "sniffs you politely.",
  "does a slow blink at you. That means hello.",
  "smells a little bit of {mine} on you.",
  "shows you their favorite spot on the cushion.",
  "bumps their head on your hand.",
  "pretends not to be excited you came.",
];

function svg(className, viewBox) {
  const node = document.createElementNS(SVG, "svg");
  node.setAttribute("class", className);
  node.setAttribute("viewBox", viewBox);
  node.setAttribute("shape-rendering", "crispEdges");
  node.setAttribute("aria-hidden", "true");
  return node;
}

export function wireVisit({ dialog, title, body }) {
  let opened = 0; // ignores a slow load after the sheet was closed or reopened

  function say(line, text) {
    line.textContent = text;
  }

  function show(friend, room) {
    const name = room.catName || friend.catName;
    title.textContent = `${name}'s room`;

    const art = svg("room-art", "0 0 46 34");
    const sprite = svg("cat", "0 0 32 29");
    const cat = el("button", { class: "cat-wrap", type: "button", "aria-label": `Say hello to ${name}` }, sprite);
    const stage = el("div", { class: "room" }, art, cat);
    const line = el("p", { class: "visit-line", "aria-live": "polite", text: `${name} is happy to see you.` });
    body.replaceChildren(el("div", { class: "visit-room" }, stage), line);

    const season = snapshotSeason(room);
    renderRoom(art, {
      onItem: (text) => say(line, `${name} ${asVisitor(text)}`),
      onJar: () => say(line, `That's ${name}'s jar of good things. It's private, but it's full of stars.`),
      onPostcard: () => {},
      onSticky: () => {},
    })({
      total: room.total ?? 0,
      found: (room.treasures ?? []).map((id) => ({ id })),
      season,
      things: room.things ?? [],
    });

    renderCat(sprite);
    const fur = room.fur === "custom" ? (room.customFur ? "custom" : "pink") : FURS[room.fur] ? room.fur : "pink";
    applyLook(cat, { fur, customFur: room.customFur, wear: validWear(room.wear, room.total ?? 0, season) });

    let last = "";
    cat.addEventListener("click", () => {
      let text;
      do text = pick(VISITOR_LINES); while (text === last);
      last = text;
      say(line, `${name} ${text.replace("{mine}", catName())}`);
      cat.classList.remove("is-happy");
      void cat.offsetWidth;
      cat.classList.add("is-happy");
      setTimeout(() => cat.classList.remove("is-happy"), 1600);
    });
    fit();
  }

  // One room pixel = a whole number of screen pixels, as big as the sheet allows.
  function fit() {
    const room = body.querySelector(".visit-room");
    if (!room) return;
    const px = Math.max(4, Math.min(10, Math.floor(body.clientWidth / ROOM_W)));
    room.style.setProperty("--px", `${px}px`);
  }

  async function open(friend) {
    const visit = ++opened;
    title.textContent = `${friend.catName}'s room`;
    body.replaceChildren(el("p", { class: "muted", text: "Knocking on the door…" }));
    if (!dialog.open) dialog.showModal();
    const { room, error } = await visitRoom(friend.id);
    if (visit !== opened || !dialog.open) return;
    if (error) body.replaceChildren(el("p", { class: "muted error", text: error }));
    else if (!room) body.replaceChildren(el("p", { class: "muted", text: `${friend.catName}'s room isn't ready yet. It appears after their next sync.` }));
    else show(friend, room);
  }

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    opened++;
  });
  addEventListener("resize", fit);

  return { open };
}
