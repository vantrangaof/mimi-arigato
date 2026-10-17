// What your cat said about a photo you shared (Photos, or one attached to a good thing). Mimi's
// AI looks at the photo when you're signed in; the line is kept and shows under the photo.
// Synced: store.KEYS.photoComments = [{ id: photo id, line, updatedAt }].

import { store, KEYS, read, write, catName, userName, photoFile } from "../core/store.js";
import { commentOnPhoto } from "../cloud/ai.js";

export const photoComment = (id) => read(KEYS.photoComments, []).find((c) => c.id === id)?.line ?? null;

export function savePhotoComment(id, line) {
  const all = read(KEYS.photoComments, []).filter((c) => c.id !== id);
  write(KEYS.photoComments, [...all, { id, line, updatedAt: Date.now() }]);
  store.save();
}

const base64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

// Looks at a photo and keeps what the cat says. thumb: the thumbnail blob (read from the device
// when not given). Returns the line, or null when the AI can't be reached (signed out, offline).
export async function scanPhoto(photo, { thumb = null, text = "" } = {}) {
  try {
    const blob = thumb ?? await photoFile(photo.id, "thumb");
    if (!blob) return null;
    const said = await commentOnPhoto(await base64(blob), { text: text || photo.caption || "", catName: catName(), userName: userName() });
    if (!said.line) return null;
    savePhotoComment(photo.id, said.line);
    return said.line;
  } catch {
    return null;
  }
}
