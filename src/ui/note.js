// A note from Mimi under their name: a new one on every visit, and another on tap.

import { store, catName } from "../core/store.js";
import { replay } from "../core/dom.js";
import { nextNote } from "../memory/quotes.js";

export function wireNote({ button, text, signature }) {
  const sign = () => {
    signature.textContent = `— ${catName()}`;
  };
  const show = () => {
    text.textContent = `“${nextNote()}”`;
    replay(button, "is-new");
  };

  button.addEventListener("click", show);
  store.on(sign);
  sign();
  show();
}
