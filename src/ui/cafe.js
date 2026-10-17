// The cat café: the Café button opens a list of cafés (yours, and each friend's, with how many
// cats are there right now). Inside, every cat present sits on a cushion. Tap someone's cat to
// pet them (everyone sees the hearts); chat floats above your cat and fills a little log.
// Only the host and the host's friends can come in. Live only: nothing is saved (cloud/cafe.js).

import { el, pick } from "../core/dom.js";
import { store, catName } from "../core/store.js";
import { renderCat, applyLook, FURS } from "../cat/sprite.js";
import { meow, purr } from "../cat/sound.js";
import { cloud, cloudStatus, onCloudChange } from "../cloud/sync.js";
import { loadFriends, cachedFriends } from "../cloud/friends.js";
import { joinCafe, peekCafes } from "../cloud/cafe.js";
import { currentWear } from "./habitat.js";

const SVG = "http://www.w3.org/2000/svg";
const BUBBLE_MS = 6000;
const LOG_MAX = 40;
const CHAT_GAP_MS = 800; // at most a message a little under every second
const PET_GAP_MS = 350;

const PET_LINES = ["purrs at {from}.", "leans into {from}'s paw.", "does a slow blink at {from}.", "rolls over for {from}.", "headbutts {from} back."];

function catSVG(person) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "cat");
  svg.setAttribute("viewBox", "0 0 32 29");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  renderCat(svg);
  return svg;
}

export function wireCafe(mimi, { button, dialog, title, body }) {
  let visit = null; // { host, hostName, cafe, people, log, seats: Map(uid → seat) }
  let opened = 0;
  let lastChat = 0;
  let lastPet = 0;

  const me = () => ({
    catName: catName(),
    fur: store.settings.fur,
    customFur: store.settings.fur === "custom" ? store.settings.customFur : null,
    wear: currentWear(),
  });
  const myId = () => visit?.cafe?.uid;

  // ---- the list of cafés ----

  async function showList() {
    const visitNo = ++opened;
    leave();
    title.textContent = "The cat café";
    body.replaceChildren(el("p", { class: "muted", text: "Looking for cafés…" }));
    const { uid } = (await cloud()) ?? {};
    if (!uid) {
      body.replaceChildren(el("p", { class: "muted", text: "The café needs you to be signed in (Settings → Account & sync)." }));
      return;
    }
    const loaded = await loadFriends();
    const friends = loaded.friends ?? (await cachedFriends()) ?? [];
    if (visitNo !== opened) return;
    const hosts = [{ id: uid, catName: catName(), mine: true }, ...friends];
    const counts = new Map();
    const row = (host) => {
      const count = el("span", { class: "cafe-count muted small", text: "…" });
      counts.set(host.id, count);
      return el("li", {}, el("button", { type: "button", class: "cafe-pick", onclick: () => enter(host) },
        el("span", { class: "cafe-pick-name", text: host.mine ? `Your café (${host.catName})` : `${host.catName}'s café` }),
        count,
      ));
    };
    body.replaceChildren(...[
      el("p", { class: "muted", text: `Cats meet here. Pet each other's cats and chat. Only friends of the café's host can come in, and nothing is saved.` }),
      el("ul", { class: "cafe-list" }, ...hosts.map(row)),
      friends.length === 0 && el("p", { class: "muted small", text: "Invite a friend in Settings → Friends, then visit each other's cafés." }),
    ].filter(Boolean));
    const live = await peekCafes(hosts.map((h) => h.id));
    if (visitNo !== opened) return;
    for (const [id, node] of counts) {
      const n = live.get(id);
      node.textContent = n == null ? "" : n === 0 ? "empty" : n === 1 ? "1 cat here" : `${n} cats here`;
      node.classList.toggle("is-busy", Boolean(n));
    }
  }

  // ---- inside a café ----

  async function enter(host) {
    const visitNo = ++opened;
    leave();
    const hostName = host.mine ? catName() : host.catName;
    title.textContent = `${hostName}'s café`;
    const scene = el("div", { class: "cafe-scene", "aria-label": "Cats in the café" });
    const log = el("ol", { class: "cafe-log", "aria-live": "polite" });
    const input = el("input", { class: "text-input", type: "text", maxlength: "140", placeholder: "Say something…", "aria-label": "Say something", autocomplete: "off" });
    const form = el("form", { class: "thanks-form cafe-say" }, input, el("button", { class: "thanks-send", type: "submit" }, "Say"));
    body.replaceChildren(
      el("button", { type: "button", class: "link-button game-back", text: "‹ All cafés", onclick: showList }),
      scene,
      el("p", { class: "muted small cafe-hint", text: "Tap a cat to pet them." }),
      log,
      form,
    );
    visit = { host, hostName, cafe: null, people: [], scene, log, seats: new Map() };
    note(`You and ${catName()} walk into ${host.mine ? "your café" : `${hostName}'s café`}. ☕`);

    const cafe = await joinCafe(host.id, me(), {
      onPeople: (list) => visit && seat(list),
      onJoin: (p) => {
        note(`${p.catName} came in.`);
        if (store.settings.sound) meow({ volume: 0.4, rate: 1.2 });
      },
      onLeave: (p) => note(`${p.catName} went home.`),
      onPet: ({ from, to }) => petted(from, to),
      onChat: ({ from, text }) => said(from, text),
      onError: () => note("The café's door is stuck. Check that you're online, then try again.", true),
    });
    if (visitNo !== opened) {
      cafe.leave?.();
      return;
    }
    if (cafe.error) {
      note("The café needs you to be signed in.", true);
      return;
    }
    visit.cafe = cafe;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim().slice(0, 140);
      if (!text || Date.now() - lastChat < CHAT_GAP_MS) return;
      lastChat = Date.now();
      input.value = "";
      cafe.say(text);
      said(cafe.uid, text);
    });
  }

  const nameOf = (uid) => visit?.people.find((p) => p.uid === uid)?.catName ?? "A cat";

  function seat(list) {
    visit.people = list;
    const ids = new Set(list.map((p) => p.uid));
    for (const [uid, s] of visit.seats) {
      if (!ids.has(uid)) {
        s.node.remove();
        visit.seats.delete(uid);
      }
    }
    for (const p of list) {
      if (visit.seats.has(p.uid)) continue;
      const mine = p.uid === myId();
      const wrap = el("button", { type: "button", class: "cat-wrap", "aria-label": mine ? `${p.catName} (your cat)` : `Pet ${p.catName}` }, catSVG(p));
      const fur = p.fur === "custom" ? (p.customFur ? "custom" : "pink") : FURS[p.fur] ? p.fur : "pink";
      applyLook(wrap, { fur, customFur: p.customFur, wear: p.wear ?? {} });
      const bubble = el("p", { class: "cafe-bubble", hidden: true });
      const node = el("div", { class: `cafe-seat${mine ? " is-mine" : ""}${p.uid === visit.host.id ? " is-host" : ""}` },
        bubble, wrap, el("p", { class: "cafe-name", text: `${p.catName}${mine ? " (you)" : p.uid === visit.host.id ? " ☕" : ""}` }));
      wrap.addEventListener("click", () => pet(p.uid));
      visit.seats.set(p.uid, { node, wrap, bubble, timer: 0 });
      visit.scene.append(node);
    }
    // Keep the arrival order (the host's cat first when they're here).
    const order = [...list].sort((a, b) => (b.uid === visit.host.id) - (a.uid === visit.host.id));
    for (const p of order) visit.scene.append(visit.seats.get(p.uid).node);
    const alone = list.length <= 1;
    visit.scene.classList.toggle("is-alone", alone);
  }

  function happy(uid) {
    const s = visit?.seats.get(uid);
    if (!s) return;
    s.wrap.classList.remove("is-happy");
    void s.wrap.offsetWidth;
    s.wrap.classList.add("is-happy");
    const heart = el("span", { class: "cafe-heart", "aria-hidden": "true", text: "♥" });
    heart.addEventListener("animationend", () => heart.remove());
    s.node.append(heart);
    setTimeout(() => s.wrap.classList.remove("is-happy"), 1400);
  }

  function pet(uid) {
    if (!visit?.cafe || Date.now() - lastPet < PET_GAP_MS) return;
    lastPet = Date.now();
    happy(uid);
    if (store.settings.sound) purr({ volume: 0.35 });
    if (uid === myId()) return; // petting your own cat stays on your screen
    visit.cafe.pet(uid);
    note(`You pet ${nameOf(uid)}. ${nameOf(uid)} ${pick(PET_LINES).replace("{from}", catName())}`);
  }

  function petted(from, to) {
    if (!visit) return;
    happy(to);
    if (to === myId()) {
      if (store.settings.sound) purr({ volume: 0.4 });
      note(`${nameOf(from)} pet ${catName()}! ♡`);
    }
    else note(`${nameOf(from)} pet ${nameOf(to)}.`);
  }

  function said(from, text) {
    if (!visit) return;
    const s = visit.seats.get(from);
    if (s) {
      s.bubble.textContent = text;
      s.bubble.hidden = false;
      clearTimeout(s.timer);
      s.timer = setTimeout(() => { s.bubble.hidden = true; }, BUBBLE_MS);
    }
    line(el("li", {}, el("span", { class: "cafe-log-name", text: `${from === myId() ? catName() : nameOf(from)}: ` }), text));
  }

  function note(text, error = false) {
    line(el("li", { class: `cafe-log-note${error ? " error" : ""}`, text }));
  }

  function line(node) {
    if (!visit) return;
    visit.log.append(node);
    while (visit.log.children.length > LOG_MAX) visit.log.firstChild.remove();
    visit.log.scrollTop = visit.log.scrollHeight;
  }

  function leave() {
    visit?.cafe?.leave();
    visit = null;
  }

  // The Café button shows while you're signed in.
  const render = () => {
    button.hidden = !cloudStatus().email;
  };
  onCloudChange(render);
  render();

  button.addEventListener("click", () => {
    dialog.showModal();
    showList();
    mimi.react(["mrrp!", "puts on their café scarf."], { hearts: 1, hold: 1800 });
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    opened++;
    leave();
  });
  addEventListener("pagehide", leave);
}
