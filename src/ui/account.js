// Settings → Account & sync: sign in or create an account with email + password, see sync status, sign out.

import { el } from "../core/dom.js";
import { cloudConfigured, cloudStatus, onCloudChange, signIn, signOut, signUp, syncNow } from "../cloud/sync.js";

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function ago(ms) {
  const s = Math.round((ms - Date.now()) / 1000);
  if (s > -45) return "just now";
  if (s > -3600) return relative.format(Math.round(s / 60), "minute");
  if (s > -86400) return relative.format(Math.round(s / 3600), "hour");
  return relative.format(Math.round(s / 86400), "day");
}

export function wireAccount(body) {
  let mode = "sign-in"; // sign-in | sign-up
  let typedEmail = "";
  let message = null; // { text, error? }
  let confirmSignOut = false;

  function signedOutView() {
    const creating = mode === "sign-up";
    const email = el("input", { class: "text-input", id: "accountEmail", type: "email", autocomplete: "email", placeholder: "you@example.com", required: true, value: typedEmail });
    const password = el("input", {
      class: "text-input", id: "accountPassword", type: "password", required: true, minlength: 6,
      autocomplete: creating ? "new-password" : "current-password",
      placeholder: creating ? "Choose a password (6+ characters)" : "Password",
    });
    const button = el("button", { class: "pixel-button", type: "submit", text: creating ? "Create account" : "Sign in" });
    const form = el("form", {
      class: "account-form",
      onsubmit: async (e) => {
        e.preventDefault();
        typedEmail = email.value.trim();
        if (!typedEmail || !password.value) return;
        button.disabled = true;
        button.textContent = creating ? "Creating…" : "Signing in…";
        const result = await (creating ? signUp : signIn)(typedEmail, password.value);
        message = result.error ? { error: true, text: result.error } : result.notice ? { text: result.notice } : null;
        if (result.notice || result.existing) mode = "sign-in";
        render();
      },
    },
    el("label", { class: "visually-hidden", for: "accountEmail", text: "Email" }),
    email,
    el("label", { class: "visually-hidden", for: "accountPassword", text: "Password" }),
    password,
    button);
    const switchMode = () => { typedEmail = email.value.trim(); mode = creating ? "sign-in" : "sign-up"; message = null; render(); };
    return [
      el("p", { class: "muted", text: "Sign in to keep your good things safe in the cloud and see them on all your devices." }),
      form,
      message && el("p", { class: `muted${message.error ? " error" : ""}`, "aria-live": "polite", text: message.text }),
      el("p", { class: "muted" },
        creating ? "Already have an account? " : "New here? ",
        el("button", { type: "button", class: "link-button", text: creating ? "Sign in" : "Create an account", onclick: switchMode })),
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
    if (status.email) { message = null; mode = "sign-in"; }
    const parts = status.email ? signedInView(status) : signedOutView();
    body.replaceChildren(...parts.filter(Boolean));
  }

  onCloudChange(render);
  setInterval(() => cloudStatus().lastSync && !confirmSignOut && render(), 60_000);
  render();
}
