// Settings → Account & sync: sign in with an emailed link, see sync status, sign out.

import { el } from "../core/dom.js";
import { cloudConfigured, cloudStatus, onCloudChange, sendSignInLink, signOut, syncNow } from "../cloud/sync.js";

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function ago(ms) {
  const s = Math.round((ms - Date.now()) / 1000);
  if (s > -45) return "just now";
  if (s > -3600) return relative.format(Math.round(s / 60), "minute");
  if (s > -86400) return relative.format(Math.round(s / 3600), "hour");
  return relative.format(Math.round(s / 86400), "day");
}

export function wireAccount(body) {
  let sentTo = null;
  let sendError = null;
  let confirmSignOut = false;

  function signedOutView() {
    if (sentTo) {
      return [
        el("p", { class: "muted", text: `Check your inbox at ${sentTo}. Open the link from Mimi to finish signing in.` }),
        el("button", { type: "button", class: "link-button", text: "Use a different email", onclick: () => { sentTo = null; render(); } }),
      ];
    }
    const input = el("input", { class: "text-input", id: "accountEmail", type: "email", autocomplete: "email", placeholder: "you@example.com", required: true });
    const form = el("form", {
      class: "row",
      onsubmit: async (e) => {
        e.preventDefault();
        const email = input.value.trim();
        if (!email) return;
        button.disabled = true;
        button.textContent = "Sending…";
        sendError = await sendSignInLink(email);
        sentTo = sendError ? null : email;
        render();
      },
    },
    el("label", { class: "visually-hidden", for: "accountEmail", text: "Email" }),
    input);
    const button = el("button", { class: "pixel-button", type: "submit", text: "Email me a sign-in link" });
    form.append(button);
    return [
      el("p", { class: "muted", text: "Sign in to keep your good things safe in the cloud and see them on all your devices. No password needed." }),
      form,
      sendError && el("p", { class: "muted error", text: sendError }),
    ];
  }

  function signedInView(status) {
    const line = status.state === "syncing" ? "Syncing…"
      : status.state === "error" ? status.error
      : status.lastSync ? `Synced ${ago(status.lastSync)}.`
      : "Ready to sync.";

    if (confirmSignOut) {
      return [
        el("p", { class: "muted", text: "Keep a copy of your good things on this device? Choose “Remove” on a shared device." }),
        el("div", { class: "row" },
          el("button", { type: "button", class: "pixel-button", text: "Sign out, keep a copy", onclick: async () => { confirmSignOut = false; await signOut(); } }),
          el("button", { type: "button", class: "pixel-button", text: "Sign out and remove", onclick: async () => { confirmSignOut = false; await signOut({ forgetDevice: true }); } }),
          el("button", { type: "button", class: "link-button", text: "Cancel", onclick: () => { confirmSignOut = false; render(); } }),
        ),
      ];
    }
    return [
      el("p", { class: "account-email", text: `Signed in as ${status.email}` }),
      el("p", { class: `muted${status.state === "error" ? " error" : ""}`, id: "syncStatus", "aria-live": "polite", text: line }),
      el("div", { class: "row" },
        el("button", { type: "button", class: "pixel-button", text: "Sync now", disabled: status.state === "syncing", onclick: () => syncNow() }),
        el("button", { type: "button", class: "link-button", text: "Sign out", onclick: () => { confirmSignOut = true; render(); } }),
      ),
    ];
  }

  function render() {
    if (!cloudConfigured()) {
      body.replaceChildren(el("p", { class: "muted", text: "Cloud sync isn't set up for this copy of Mimi yet. See “Cloud sync” in the README." }));
      return;
    }
    const status = cloudStatus();
    if (status.email) sentTo = null; // the emailed link has done its job
    const parts = status.email ? signedInView(status) : signedOutView();
    body.replaceChildren(...parts.filter(Boolean));
  }

  onCloudChange(render);
  setInterval(() => cloudStatus().lastSync && !confirmSignOut && render(), 60_000);
  render();
}
