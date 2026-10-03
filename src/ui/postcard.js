// The weekly postcard on the floor of Mimi's room: tap it to read.

import { el } from "../core/dom.js";
import { formatShort } from "../core/dates.js";
import { store, catName, read, write } from "../core/store.js";
import { meow } from "../cat/sound.js";
import { weekPostcard, postcardSeen, markPostcardSeen } from "../memory/postcard.js";

// A greeting for opening the app when a new postcard arrives (said once per postcard), or null.
export function postcardGreeting() {
  const card = weekPostcard();
  if (!card || postcardSeen(card) || read("postcardAnnounced", null) === card.from) return null;
  write("postcardAnnounced", card.from);
  return ["mail!", "left you a postcard. It's on the floor.", { hearts: 1, hold: 3000 }];
}

export function wirePostcard(mimi, { dialog, body }) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  return {
    open() {
      const card = weekPostcard();
      if (!card) return;
      body.replaceChildren(el("article", { class: "postcard" },
        el("p", { class: "postcard-week", text: `${formatShort(card.from)} – ${formatShort(card.to)}` }),
        el("p", { class: "postcard-hello", text: "Dear you," }),
        el("ul", { class: "postcard-lines" }, ...card.lines.map((line) => el("li", { text: line }))),
        el("figure", { class: "postcard-favorite" },
          el("figcaption", { text: `${catName()}'s favorite this week` }),
          el("blockquote", { text: card.favorite.text }),
        ),
        el("p", { class: "postcard-sign", text: card.sign }),
      ));
      const first = !postcardSeen(card);
      markPostcardSeen(card);
      store.save(); // re-renders the room so the postcard stops sparkling
      dialog.showModal();
      if (first) {
        if (store.settings.sound) meow({ volume: 0.6 });
        mimi.react(["♡", "hopes you liked the postcard."], { hearts: 2, hold: 2400 });
      }
    },
  };
}
