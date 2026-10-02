// A picture of today's good things, sized for stories (1080×1350).

import { store, dayKey, entriesFor, catTitle } from "./store.js";
import { drawSpriteCanvas } from "./sprite.js";
import { download } from "./settings.js";

const W = 1080;
const H = 1350;
const PIXEL = '"DotGothic16", monospace';
const BODY = '"M PLUS Rounded 1c", sans-serif';
const longFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

function wrapLines(ctx, text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function layout(ctx, items, size, width, maxLines) {
  ctx.font = `${size}px ${BODY}`;
  return items.map((t) => {
    let lines = wrapLines(ctx, t, width);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
    }
    return lines;
  });
}

async function makeCard() {
  await Promise.all([
    document.fonts.load(`72px ${PIXEL}`),
    document.fonts.load(`40px ${BODY}`),
  ]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fcf2f6";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(214, 79, 134, 0.10)";
  for (let x = 0; x < W; x += 30) ctx.fillRect(x, 0, 2, H);
  for (let y = 0; y < H; y += 30) ctx.fillRect(0, y, W, 2);

  const items = entriesFor(dayKey()).slice(0, 5);
  const top = 730;
  const bottom = H - 70;
  const textX = 200;
  const width = W - textX - 110;
  let size = 40;
  let lines;
  let listHeight = 0;
  for (size of [40, 36, 32, 28]) {
    lines = layout(ctx, items, size, width, 3);
    listHeight = lines.reduce((h, l) => h + l.length * size * 1.4 + size * 0.6, 0);
    if (top + listHeight <= bottom) break;
  }
  // Center the whole composition vertically when the list is short.
  const shift = Math.max(0, (bottom - top - listHeight) / 2);

  const cell = 15;
  drawSpriteCanvas(ctx, (W - 32 * cell) / 2, 60 + shift, cell, store.settings);

  ctx.textAlign = "center";
  ctx.fillStyle = "#43263a";
  ctx.font = `72px ${PIXEL}`;
  ctx.fillText(catTitle(), W / 2, 590 + shift);
  ctx.fillStyle = "#9a7088";
  ctx.font = `34px ${BODY}`;
  ctx.fillText(`Good things on ${longFmt.format(new Date())}`, W / 2, 648 + shift);

  ctx.textAlign = "left";
  let y = top + shift;
  lines.forEach((itemLines, i) => {
    ctx.fillStyle = "#d64f86";
    ctx.font = `${size}px ${PIXEL}`;
    ctx.fillText(String(i + 1), textX - 60, y);
    ctx.fillStyle = "#43263a";
    ctx.font = `${size}px ${BODY}`;
    for (const line of itemLines) {
      ctx.fillText(line, textX, y);
      y += size * 1.4;
    }
    y += size * 0.6;
  });

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function wireShare(els) {
  let file;
  els.open.addEventListener("click", async () => {
    const blob = await makeCard();
    file = new File([blob], `mimi-${dayKey()}.png`, { type: "image/png" });
    if (els.img.src) URL.revokeObjectURL(els.img.src);
    els.img.src = URL.createObjectURL(blob);
    els.share.hidden = !navigator.canShare?.({ files: [file] });
    els.dialog.showModal();
  });
  els.save.addEventListener("click", () => download(file.name, file));
  els.share.addEventListener("click", () => {
    navigator.share({ files: [file], title: `Good things with ${catTitle()}` }).catch(() => {});
  });
  els.dialog.addEventListener("click", (e) => {
    if (e.target === els.dialog) els.dialog.close();
  });
}
