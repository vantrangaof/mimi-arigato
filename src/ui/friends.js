// Settings → Friends: invite a friend (link or code), accept an invite, see your friends and
// visit their rooms, and choose whether friends see your things from your life.

import { el } from "../core/dom.js";
import { store } from "../core/store.js";
import { cloudConfigured, cloudStatus, onCloudChange } from "../cloud/sync.js";
import {
  myInvite, peekInvite, acceptInvite, loadFriends, cachedFriends, removeFriend,
  takeInviteFromLink, pendingInvite, clearPendingInvite, formatCode, normalizeCode, isCode, inviteLink,
} from "../cloud/friends.js";
import { FURS } from "../cat/sprite.js";

export function wireFriends(mimi, { section, body, settings, opener, visit }) {
  let friends = null; // null until loaded
  let loadError = null;
  let invite = null; // { code } | { error } | "loading"
  let offer = null; // { code, catName } | { code, error }: an invite waiting for yes / not now
  let message = null; // { text, error? }
  let confirmRemove = null; // friend id
  let busy = false;
  let signedIn = false;

  takeInviteFromLink();

  function swatch(friend) {
    const fur = friend.fur === "custom" ? friend.customFur : FURS[friend.fur] ?? FURS.pink;
    const s = el("span", { class: "swatch" });
    s.style.background = fur?.body ?? FURS.pink.body;
    s.style.borderColor = fur?.outline ?? FURS.pink.outline;
    return s;
  }

  function friendRow(friend) {
    if (confirmRemove === friend.id) {
      return el("li", { class: "friend" },
        el("span", { class: "friend-name", text: `Stop being friends with ${friend.catName}'s human?` }),
        el("button", { type: "button", class: "pixel-button", text: "Remove", onclick: () => remove(friend) }),
        el("button", { type: "button", class: "link-button", text: "Cancel", onclick: () => { confirmRemove = null; render(); } }));
    }
    return el("li", { class: "friend" },
      el("button", { type: "button", class: "friend-visit", onclick: () => visit.open(friend) },
        swatch(friend), el("span", { class: "friend-name", text: friend.catName }), el("span", { class: "friend-go", text: "Visit ›" })),
      el("button", {
        type: "button", class: "icon-button small", "aria-label": `Remove ${friend.catName}`, title: "Remove friend", text: "×",
        onclick: () => { confirmRemove = friend.id; render(); },
      }));
  }

  function offerView() {
    if (!offer) return null;
    if (offer.error) {
      return el("div", { class: "friend-offer" },
        el("p", { class: "muted error", text: offer.error }),
        el("button", { type: "button", class: "link-button", text: "OK", onclick: () => { offer = null; clearPendingInvite(); render(); } }));
    }
    return el("div", { class: "friend-offer" },
      el("p", { class: "friend-offer-q", text: `Be friends with ${offer.catName}'s human?` }),
      el("p", { class: "muted", text: "You'll be able to visit each other's rooms. Only the room: never your good things, diary or photos." }),
      el("div", { class: "row" },
        el("button", { type: "button", class: "pixel-button primary", text: "Yes", disabled: busy, onclick: () => accept(offer.code, offer.catName) }),
        el("button", { type: "button", class: "link-button", text: "Not now", onclick: () => { offer = null; clearPendingInvite(); render(); } })));
  }

  function inviteView() {
    if (!invite) {
      return el("button", { type: "button", class: "pixel-button", text: "Invite a friend", onclick: makeInvite });
    }
    if (invite === "loading") return el("p", { class: "muted", text: "Making a code…" });
    if (invite.error) return el("p", { class: "muted error", text: invite.error });
    const link = inviteLink(invite.code);
    const text = `Come visit ${store.settings.name.trim() || "Mimi"} in Mimi Arigato! Open ${link} or type the code ${formatCode(invite.code)} in Settings → Friends.`;
    return el("div", { class: "invite-box" },
      el("p", { class: "invite-code", text: formatCode(invite.code) }),
      el("p", { class: "muted", text: "Send your friend this code or the link. It works once, for 7 days." }),
      el("div", { class: "row" },
        navigator.share && el("button", {
          type: "button", class: "pixel-button primary", text: "Share invite",
          onclick: () => navigator.share({ title: "Mimi Arigato", text }).catch(() => {}),
        }),
        el("button", {
          type: "button", class: "pixel-button", text: "Copy link",
          onclick: async (e) => {
            try {
              await navigator.clipboard.writeText(link);
              e.target.textContent = "Copied!";
            } catch {
              e.target.textContent = "Couldn't copy";
            }
          },
        })));
  }

  function codeForm() {
    const input = el("input", {
      class: "text-input", id: "friendCode", type: "text", inputmode: "text", autocomplete: "off", autocapitalize: "characters",
      spellcheck: "false", maxlength: 9, placeholder: "ABC-234",
    });
    return el("form", {
      class: "row",
      onsubmit: (e) => {
        e.preventDefault();
        const code = normalizeCode(input.value);
        if (!isCode(code)) {
          message = { error: true, text: "A code has 6 letters and numbers, like ABC-234." };
          render();
          return;
        }
        offerInvite(code);
      },
    },
    el("label", { class: "visually-hidden", for: "friendCode", text: "Friend's code" }),
    input,
    el("button", { type: "submit", class: "pixel-button", text: "Add friend", disabled: busy }));
  }

  function shareSwitch() {
    const box = el("input", { type: "checkbox", checked: store.settings.shareThings !== false });
    box.addEventListener("change", () => {
      store.settings.shareThings = box.checked;
      store.save("settings");
    });
    return el("label", { class: "switch" }, box,
      el("span", { text: "Show my things to friends" }),
      el("span", { class: "muted small", text: "The coffee mug, books and other things from your life in the room." }));
  }

  function render() {
    section.hidden = !cloudConfigured();
    if (section.hidden) return;
    if (!signedIn) {
      body.replaceChildren(el("p", { class: "muted", text: pendingInvite()
        ? "A friend invited you! Sign in above, then say yes here."
        : "Sign in to visit your friends' rooms and let them visit yours." }));
      return;
    }
    const list = friends === null
      ? el("p", { class: "muted", text: loadError ?? "Looking for your friends…" })
      : friends.length
        ? el("ul", { class: "friends" }, ...friends.map(friendRow))
        : el("p", { class: "muted", text: "No friends here yet. Invite someone and visit each other's rooms." });
    body.replaceChildren(...[
      offerView(),
      list,
      friends !== null && loadError && el("p", { class: "muted small", text: loadError }),
      message && el("p", { class: `muted${message.error ? " error" : ""}`, "aria-live": "polite", text: message.text }),
      inviteView(),
      el("p", { class: "sheet-label friend-sub", text: "Have a code?" }),
      codeForm(),
      shareSwitch(),
    ].filter(Boolean));
  }

  async function refresh({ greet = false } = {}) {
    if (!signedIn) return;
    friends ??= await cachedFriends();
    const result = await loadFriends();
    if (result.error) {
      loadError = navigator.onLine ? result.error : "You're offline. Connect to visit friends.";
    } else {
      loadError = null;
      friends = result.friends;
      if (greet && result.added.length) {
        mimi.later(result.added.map((f) => ["a friend!", `is friends with ${f.catName} now. You can visit them in Settings → Friends.`, { hearts: 3, hold: 3600 }]));
      }
    }
    render();
  }

  async function makeInvite() {
    invite = "loading";
    render();
    invite = await myInvite();
    render();
  }

  async function offerInvite(code) {
    busy = true;
    message = null;
    render();
    const result = await peekInvite(code);
    busy = false;
    offer = result.error ? { code, error: result.error } : { code, catName: result.catName };
    render();
  }

  async function accept(code, name) {
    busy = true;
    render();
    const result = await acceptInvite(code);
    busy = false;
    clearPendingInvite();
    offer = null;
    if (result.error) {
      message = { error: true, text: result.error };
    } else {
      message = { text: `You and ${name}'s human are friends now!` };
      mimi.react(["a friend!", `can't wait to meet ${name}.`], { hearts: 3, hold: 3200 });
    }
    await refresh();
  }

  async function remove(friend) {
    confirmRemove = null;
    const result = await removeFriend(friend.id);
    if (result.error) message = { error: true, text: result.error };
    else friends = friends?.filter((f) => f.id !== friend.id) ?? null;
    render();
  }

  // An invite from a link: open Settings at Friends once signed in (or to sign in first).
  function showPendingInvite() {
    const code = pendingInvite();
    if (!code) return;
    if (!settings.open) opener.click(); // the same way you open Settings, so every section renders
    section.scrollIntoView({ block: "start" });
    if (signedIn && !offer) offerInvite(code);
  }

  let started = false;
  onCloudChange(() => {
    const now = Boolean(cloudStatus().email);
    if (now !== signedIn) {
      signedIn = now;
      friends = null;
      invite = null;
      offer = null;
      message = null;
      if (signedIn) {
        refresh({ greet: true });
        showPendingInvite();
      }
    }
    if (!started && cloudStatus().state !== "off") {
      started = true;
      if (!signedIn) showPendingInvite();
    }
    render();
  });
  settings.addEventListener("close", () => { invite = null; message = null; confirmRemove = null; });
  render();

  return { refresh };
}
