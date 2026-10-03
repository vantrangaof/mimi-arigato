// Fur colors from a photo of your real cat: the most common color near the middle of the
// photo becomes the body, and the rest of the palette is mixed from it.

const SIZE = 64;

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// The average color of the biggest bucket of similar colors in the middle of the photo.
function mainColor(data) {
  const buckets = new Map();
  for (let y = Math.round(SIZE * 0.2); y < SIZE * 0.85; y++) {
    for (let x = Math.round(SIZE * 0.2); x < SIZE * 0.8; x++) {
      const i = (y * SIZE + x) * 4;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
      const bucket = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
      bucket.n += 1;
      bucket.sum = [bucket.sum[0] + r, bucket.sum[1] + g, bucket.sum[2] + b];
      buckets.set(key, bucket);
    }
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  return top.sum.map((v) => v / top.n);
}

export function paletteFrom(body) {
  const dark = luminance(body) < 0.3;
  const ink = rgb("#2b1a2e");
  return {
    body: hex(body),
    chest: hex(mix(body, [255, 255, 255], dark ? 0.2 : 0.55)),
    outline: hex(dark ? mix(body, [0, 0, 0], 0.55) : mix(body, ink, luminance(body) > 0.8 ? 0.35 : 0.5)),
    inner: hex(mix(body, rgb("#ff8bb0"), 0.65)),
    eye: dark ? "#ffd76a" : "#2b1a2e",
    shine: "#ffffff",
    blush: hex(mix(body, rgb("#ff9ebe"), 0.6)),
    nose: hex(mix(body, rgb("#e0708f"), 0.75)),
    mouth: hex(dark ? mix(body, [255, 255, 255], 0.5) : mix(body, ink, 0.6)),
  };
}

// Throws Error("unsupported") if the file can't be read as an image.
export async function furFromPhoto(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("unsupported");
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  // Cover-crop to a square so the cat (usually in the middle) fills the sample.
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  return paletteFrom(mainColor(ctx.getImageData(0, 0, SIZE, SIZE).data));
}
