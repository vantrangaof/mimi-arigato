// Keep Mimi safe on this device: ask the browser to keep the app's data, and suggest adding
// Mimi to the Home Screen. Safari on iPhone can clear a website's data after about a week
// without a visit (signing you out and losing anything not synced); Home Screen apps are spared.

import { el } from "../core/dom.js";
import { store, catName, read, write, totalThings } from "../core/store.js";

const LATER = "installLater"; // when "Not now" was tapped (ms); asks again after two weeks
const AGAIN_MS = 14 * 86_400_000;

const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const iOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function keepData() {
  navigator.storage?.persist?.().catch(() => {});
}

export function wireInstall(card) {
  let prompt = null; // Chrome/Android's install prompt, saved for our button

  const render = () => {
    const later = read(LATER, 0);
    const show = !standalone() && totalThings() > 0 && Date.now() - later > AGAIN_MS && (prompt || iOS());
    card.hidden = !show;
    if (!show) return;
    const name = catName();
    const notNow = el("button", { type: "button", class: "link-button", text: "Not now", onclick: () => { write(LATER, Date.now()); render(); } });
    const how = prompt
      ? el("div", { class: "row" },
        el("button", { type: "button", class: "pixel-button primary", text: "Add to Home Screen", onclick: async () => {
          prompt.prompt();
          await prompt.userChoice.catch(() => null);
          prompt = null;
          render();
        } }),
        notNow)
      : el("div", { class: "install-steps" },
        el("p", { class: "small" }, "Tap ", el("strong", { text: "Share" }), " ", shareIcon(), " in Safari, then ", el("strong", { text: "Add to Home Screen" }), "."),
        notNow);
    card.replaceChildren(
      el("h2", { class: "card-title", text: `Keep ${name} safe on this phone` }),
      el("p", { class: "muted small", text: `Add ${name} to your Home Screen. ${name} opens like an app, you stay signed in, and your phone won't tidy away your good things.` }),
      how,
    );
  };

  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    render();
  });
  addEventListener("appinstalled", () => { prompt = null; render(); });
  store.on(render);
  render();
}

function shareIcon() {
  // Safari's share icon: a box with an arrow up.
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 7 9");
  svg.setAttribute("class", "share-icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.innerHTML = '<path fill="currentColor" d="M3 0h1v6H3zM2 1h1v1H2zM4 1h1v1H4zM1 2h1v1H1zM5 2h1v1H5zM0 4h2v1H1v3h5V5H5V4h2v5H0z"/>';
  return svg;
}
