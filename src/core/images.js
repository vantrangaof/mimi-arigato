// Shrinks a chosen photo before saving: a full image (longest side 1600 px) and a thumbnail
// (480 px), both JPEG. Phone photos are rotated upright using their EXIF orientation.

const FULL_PX = 1600;
const THUMB_PX = 480;
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

function encode(bitmap, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode-failed"))), "image/jpeg", quality);
  });
}

// Throws Error("too-big") or Error("unsupported") with a reason the UI can explain.
export async function preparePhoto(file) {
  if (file.size > MAX_INPUT_BYTES) throw new Error("too-big");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("unsupported");
  }
  try {
    return { full: await encode(bitmap, FULL_PX, 0.85), thumb: await encode(bitmap, THUMB_PX, 0.8) };
  } finally {
    bitmap.close?.();
  }
}

export function photoErrorMessage(err) {
  if (err?.message === "too-big") return "That photo is too large (over 40 MB).";
  if (err?.message === "unsupported") return "That file type can't be opened here. Try a JPEG or PNG photo.";
  return "Mimi couldn't save that photo. Please try another.";
}
