// Today's challenge card: what to do, a slot per photo (or good thing), and a button to add a
// photo. Mimi's AI looks at each photo when you're signed in; a photo that shows the right thing
// fills a slot and is kept in Photos. Finishing it gives Mimi's treat bag (memory/challenges.js).

import { el } from "../core/dom.js";
import { store, catName, addPhoto, photoById } from "../core/store.js";
import { preparePhoto, photoErrorMessage } from "../core/images.js";
import { meow, purr } from "../cat/sound.js";
import { lookAtPhoto } from "../cloud/ai.js";
import {
  todaysChallenge, challengeProgress, challengeComplete, challengeRewarded, rewardChallenge,
  alreadySeen, markFound, markSeen, foundToday,
} from "../memory/challenges.js";
import { savePhotoComment } from "../memory/photo-comments.js";
import { photoThumb } from "./photos.js";

const base64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export function wireChallenge(mimi, { card, text, count, slots, add, input, note }) {
  let looking = false;
  let day = null;

  function render() {
    const c = todaysChallenge();
    const name = catName();
    const done = challengeProgress(c);
    if (day !== c.id) {
      day = c.id;
      note.textContent = "";
    }
    text.textContent = c.text(name);
    count.textContent = challengeComplete(c) ? "done ♡" : `${done} of ${c.count}`;
    slots.replaceChildren(...Array.from({ length: c.count }, (_, i) => {
      const photo = !c.goodThings && foundPhotos()[i];
      if (photo) return photoThumb(photo, "photo-thumb challenge-slot is-done");
      return el("span", { class: `challenge-slot${i < done ? " is-done" : ""}`, "aria-hidden": "true", text: i < done ? "♡" : "?" });
    }));
    add.hidden = Boolean(c.goodThings) || challengeComplete(c);
    add.classList.toggle("is-busy", looking);
    card.classList.toggle("is-complete", challengeComplete(c));
    if (challengeComplete(c) && !note.textContent) {
      note.textContent = `Treat bag given: one fish, water and a cuddle for ${name}. New challenge tomorrow!`;
    }
    if (challengeComplete(c) && !challengeRewarded()) reward();
  }

  // The photos that counted today, oldest first.
  const foundPhotos = () => foundToday().map(photoById).filter(Boolean);

  function reward() {
    rewardChallenge();
    const name = catName();
    note.textContent = `Treat bag given: one fish, water and a cuddle for ${name}. New challenge tomorrow!`;
    if (store.settings.sound) meow({ volume: 0.7 });
    mimi.later([["challenge done!", "got a treat bag: a fish, water and a cuddle! ♡", { hearts: 4, hold: 3400 }]]);
    store.save(); // the Fish, Water and Cuddle buttons fill up
  }

  async function check(file) {
    const c = todaysChallenge();
    const name = catName();
    const fingerprint = `${file.size}-${file.lastModified}`;
    if (alreadySeen(fingerprint)) {
      note.textContent = `${name} has seen this one already! Find another.`;
      return;
    }
    looking = true;
    add.classList.add("is-busy");
    note.textContent = `${name} is looking closely…`;
    mimi.setActivity("is looking closely at your photo…");
    try {
      const prepared = await preparePhoto(file);
      const seen = await lookAtPhoto(c.look, await base64(prepared.thumb), { catName: name });
      // Signed out or the AI can't be reached: Mimi trusts you.
      const found = seen.error ? true : seen.found;
      const reply = seen.error ? "squints… looks right to me!" : seen.reply;
      if (found) {
        const photo = await addPhoto({ full: prepared.full, thumb: prepared.thumb, caption: c.text(name) });
        markFound(photo.id, fingerprint);
        if (!seen.error) savePhotoComment(photo.id, reply);
        if (store.settings.sound) purr({ volume: 0.5 });
        note.textContent = `${name}: “${reply}”`;
        mimi.setActivity(null);
        if (!challengeComplete(c)) mimi.react(["!!", `“${reply}”`], { hearts: 2, hold: 3600 });
      }
      else {
        markSeen(fingerprint);
        note.textContent = `${name}: “${reply}” Try another photo!`;
        mimi.setActivity(null);
        mimi.react(["hmm…", `“${reply}”`], { hearts: 0, hold: 3600 });
      }
    }
    catch (err) {
      mimi.setActivity(null);
      note.textContent = photoErrorMessage(err);
    }
    finally {
      looking = false;
      store.save();
    }
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = "";
    if (file && !looking) check(file);
  });

  store.on(render);
  render();
  setInterval(render, 10 * 60_000); // a new day brings a new challenge
}
