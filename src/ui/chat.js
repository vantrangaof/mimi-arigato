// Chat with Mimi: a little conversation with your cat, powered by api/mimi.mjs.
// The conversation stays on this device (never synced). Mimi knows your recent good things
// and wishes, never your diary.

import { el, pick } from "../core/dom.js";
import { store, read, write, catName, userName, allEntries } from "../core/store.js";
import { renderCat, applyLook, FURS } from "../cat/sprite.js";
import { daysTogether } from "../memory/relationship.js";
import { openWishes } from "../memory/wishes.js";
import { chatWithMimi } from "../cloud/ai.js";
import { cloudConfigured, cloudStatus, onCloudChange } from "../cloud/sync.js";
import { currentWear } from "./habitat.js";

const KEY = "chat";
const KEEP = 40; // messages kept on this device
const MAX_LENGTH = 500;

const CHIPS = ["Guess what happened today!", "Today was a bit hard.", "Tell me a tiny cat story.", "What are you up to?", "I'm bored."];

const HELLOS = [
  (you) => `hi${you}! I was just napping in a sunbeam. how's your day going?`,
  (you) => `oh! hello${you} 🐾 come sit with me. what's on your mind?`,
  (you) => `mrrp! you're here${you}. tell me anything.`,
];

const TROUBLE = {
  sleepy: "*big yawn* I've talked so much today, my whiskers are tired. can we chat more tomorrow?",
  offline: "I can't hear you from here… (you're offline). I'll be right here when you're back.",
  unavailable: "mrrp… my ears aren't working right now. try again in a little bit?",
};

const SVG = "http://www.w3.org/2000/svg";

function avatar() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "cat");
  svg.setAttribute("viewBox", "0 0 32 29");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  const wrap = el("span", { class: "chat-avatar" }, svg);
  renderCat(svg);
  const fur = FURS[store.settings.fur] ? store.settings.fur : "pink";
  applyLook(wrap, { fur, wear: currentWear() });
  return wrap;
}

// What Mimi knows for this chat: names, how long you've known each other, recent good things, wishes.
function context() {
  return {
    catName: catName(),
    userName: userName(),
    days: daysTogether(),
    recent: allEntries().slice(-12).reverse().map((e) => e.text),
    wishes: openWishes().map((w) => w.what),
  };
}

export function wireChat({ open, dialog, title, head, log, chips, form, input, send, note, reset }) {
  let messages = read(KEY, []); // [{ role: "you" | "mimi", text, at }]
  let waiting = false;

  const save = () => write(KEY, messages.slice(-KEEP));
  const signedIn = () => cloudConfigured() && Boolean(cloudStatus().email);

  function bubble(m) {
    return el("li", { class: `chat-msg from-${m.role}${m.trouble ? " is-trouble" : ""}` },
      el("p", { class: "chat-bubble", text: m.text }));
  }

  function render() {
    title.textContent = `Chat with ${catName()}`;
    head.replaceChildren(avatar());
    const shown = messages.length ? messages : [{ role: "mimi", text: pick(HELLOS)(userName() ? ` ${userName()}` : "") }];
    if (!messages.length) messages = shown; // keep the hello so the chat starts with it
    log.replaceChildren(...shown.map(bubble));
    if (waiting) {
      log.append(el("li", { class: "chat-msg from-mimi" },
        el("p", { class: "chat-bubble chat-typing", "aria-label": `${catName()} is typing` }, el("span"), el("span"), el("span"))));
    }
    log.scrollTop = log.scrollHeight;

    const can = signedIn();
    form.hidden = !can;
    chips.hidden = !can || messages.some((m) => m.role === "you");
    note.textContent = can
      ? `${catName()} is a small AI cat and can get things wrong. Your chat stays on this device.`
      : cloudConfigured()
        ? `Sign in (Settings → Account & sync) to chat with ${catName()}.`
        : `Chat needs cloud sign-in, which isn't set up for this copy of Mimi.`;
    reset.hidden = messages.length < 2;
    send.disabled = waiting;
  }

  async function say(text) {
    text = text.trim().slice(0, MAX_LENGTH);
    if (!text || waiting) return;
    messages.push({ role: "you", text, at: Date.now() });
    input.value = "";
    waiting = true;
    render();
    const history = messages.filter((m) => !m.trouble).map(({ role, text: t }) => ({ role, text: t }));
    const { reply, error } = await chatWithMimi(history, context());
    waiting = false;
    if (reply) messages.push({ role: "mimi", text: reply, at: Date.now() });
    else messages.push({ role: "mimi", text: TROUBLE[error] ?? TROUBLE.unavailable, at: Date.now(), trouble: true });
    save();
    render();
    if (dialog.open) input.focus();
  }

  chips.replaceChildren(...CHIPS.map((text) => el("button", {
    type: "button",
    class: "chat-chip",
    text,
    onclick: () => {
      input.value = text;
      input.focus();
    },
  })));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    say(input.value);
  });
  reset.addEventListener("click", () => {
    messages = [];
    save();
    render();
  });
  open.addEventListener("click", () => {
    render();
    dialog.showModal();
    if (signedIn()) input.focus();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  onCloudChange(() => dialog.open && render());
}
