// A memory page in a sheet: tap a thing in Mimi's room, or a person, place or thing in Memories,
// to see every good thing about it, what it tends to come with, and Mimi's theories about it.

import { el } from "../core/dom.js";
import { formatShortYear } from "../core/dates.js";
import { catName } from "../core/store.js";
import { aboutSubject, aboutLine } from "../memory/about.js";
import { theoryText } from "../memory/theories.js";

const SHOWN = 20;

export function wireAbout({ dialog, title, body }) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // subject: { kind: "theme" | "person" | "place", id }; line: what Mimi says (optional).
  function open(subject, line = null) {
    const info = aboutSubject(subject);
    if (!info) return;
    const name = catName();
    const n = info.entries.length;
    const together = (label, items) => items.length > 0 && el("p", { class: "about-with" },
      el("span", { class: "about-with-label", text: label }),
      el("span", { text: items.join(" · ") }),
    );
    // Tapping a person or place in "often with" opens their page.
    const links = (kind, items) => items.map((id) => el("button", {
      type: "button", class: "link-button", text: id, onclick: () => open({ kind, id }),
    }));

    title.textContent = info.title;
    body.replaceChildren(...[
      line && el("p", { class: "about-mimi", text: `${name} ${line}` }),
      el("p", { class: "about-count", text: `${n === 1 ? "One good thing" : `${n} good things`} since ${formatShortYear(info.first)}.` }),
      el("p", { class: "muted small", text: aboutLine(subject, info) }),
      info.people.length > 0 && el("p", { class: "about-with" },
        el("span", { class: "about-with-label", text: "Often with" }), ...links("person", info.people)),
      info.places.length > 0 && el("p", { class: "about-with" },
        el("span", { class: "about-with-label", text: "Places" }), ...links("place", info.places)),
      together("Goes with", info.things),
      info.theories.length > 0 && el("ul", { class: "about-theories" },
        ...info.theories.map((t) => el("li", {}, el("span", { class: "theory-number", text: `${name}'s theory` }), el("span", { text: theoryText(t) })))),
      el("ul", { class: "about-entries" }, ...info.entries.slice(0, SHOWN).map((e) => el("li", {},
        el("span", { class: "entry-date", text: formatShortYear(e.key) }),
        el("span", { text: e.text }),
      ))),
      n > SHOWN && el("p", { class: "muted small", text: `…and ${n - SHOWN} more. ${name} remembers all of them.` }),
    ].filter(Boolean));
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  return { open };
}
