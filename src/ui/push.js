// Settings → Daily reminder → "Turn on notifications": Mimi sends a little note at your daily
// reminder time on a day you haven't told them anything yet, and your sticky notes when they're
// due (cloud/push.js, api/nudge.mjs).

import { store, catName } from "../core/store.js";
import { onCloudChange, cloudStatus } from "../cloud/sync.js";
import { pushState, enablePush, disablePush, refreshPush, needsInstall } from "../cloud/push.js";

export function wirePush({ button, note, settings }) {
  let busy = false;
  let time = store.settings.reminder;
  const intro = () => `Or let ${catName()} send you a little note at that time, on a day you haven't told them anything yet (and your sticky notes when they're due).`;

  async function render(message = null) {
    const state = await pushState();
    const signedIn = Boolean(cloudStatus().email);
    button.hidden = state === "unsupported" && !needsInstall();
    button.disabled = busy;
    button.textContent = state === "on" ? "Turn off notifications" : "Turn on notifications";
    button.setAttribute("aria-pressed", String(state === "on"));
    note.textContent = message
      ?? (needsInstall() ? `${intro()} On iPhone, add ${catName()} to your Home Screen first, then turn this on from there.`
        : state === "blocked" ? `Notifications are blocked for this site. You can allow them in your browser's settings.`
        : state === "on" ? `On for this device. ${catName()} will send a note around ${store.settings.reminder} if you haven't stopped by.`
        : !signedIn ? `${intro()} Sign in first (Account & sync, below).`
        : intro());
  }

  button.addEventListener("click", async () => {
    if (busy) return;
    if (needsInstall()) return render();
    busy = true;
    render(`Asking…`);
    let message = null;
    try {
      if ((await pushState()) === "on") await disablePush();
      else {
        await enablePush(store.settings.reminder);
        message = `On! ${catName()} will send a note around ${store.settings.reminder} if you haven't stopped by.`;
      }
    }
    catch (err) {
      message = err?.message === "signed-out" ? `Sign in first (Account & sync, below), then turn this on.`
        : err?.message === "denied" ? `${catName()} can't send notes without permission. You can allow notifications in your browser's settings.`
        : `${catName()} couldn't set that up just now. Please try again in a moment.`;
    }
    busy = false;
    render(message);
  });

  // Keep the server's copy of your reminder time current.
  store.on(() => {
    if (store.settings.reminder === time) return;
    time = store.settings.reminder;
    refreshPush(time);
  });
  settings.addEventListener("click", () => render());
  onCloudChange(() => render());
  render();
}
