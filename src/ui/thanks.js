// Thank-you cards: turn a good thing about someone into a pixel card from you and Mimi
// that you can send them.

import { download } from "../core/dom.js";
import { dayKey } from "../core/dates.js";
import { store, catName, userName, totalThings } from "../core/store.js";
import { drawSpriteCanvas } from "../cat/sprite.js";
import { validWear } from "../world/world.js";
import { thankee } from "../memory/insights.js";
import { W, H, PIXEL, BODY, wrapLines, graphPaper, toPNG } from "./share.js";

const HEART = ["dd.dd", "dHHHd", "dHHHd", ".dHd.", "..d.."];

function drawHeart(ctx, x0, y0, cell) {
  HEART.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ".") return;
    ctx.fillStyle = ch === "d" ? "#d64f86" : "#ff9ebe";
    ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
  }));
}

async function makeCard(to, text) {
  const { canvas, ctx } = await graphPaper();

  const cell = 13;
  const catX = (W - 32 * cell) / 2;
  drawSpriteCanvas(ctx, catX, 90, cell, { fur: store.settings.fur, wear: validWear(store.settings.wear, totalThings()) });
  drawHeart(ctx, catX + 31 * cell, 70, 14);

  ctx.textAlign = "center";
  ctx.fillStyle = "#43263a";
  ctx.font = `60px ${PIXEL}`;
  ctx.fillText("Thank you,", W / 2, 560);
  ctx.fillStyle = "#d64f86";
  let size = 110;
  ctx.font = `${size}px ${PIXEL}`;
  while (ctx.measureText(`${to}!`).width > W - 160 && size > 48) ctx.font = `${(size -= 6)}px ${PIXEL}`;
  ctx.fillText(`${to}!`, W / 2, 560 + size + 10);

  ctx.fillStyle = "#43263a";
  ctx.font = `42px ${BODY}`;
  let lines = wrapLines(ctx, `“${text}”`, W - 220);
  if (lines.length > 6) lines = [...lines.slice(0, 5), `${lines[5].replace(/\s*\S*$/, "")}…”`];
  let y = 560 + size + 120;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 60;
  }

  const from = userName() ? `${userName()} & ${catName()}` : catName();
  ctx.fillStyle = "#94687f";
  ctx.font = `38px ${BODY}`;
  ctx.fillText(`with love from ${from}`, W / 2, H - 130);
  ctx.font = `26px ${PIXEL}`;
  ctx.fillText(location.protocol.startsWith("http") ? `Mimi Arigato · ${location.host}` : "Mimi Arigato", W / 2, H - 64);

  return toPNG(canvas);
}

export function wireThanks(mimi, els) {
  let text = "";
  let file = null;
  let timer;

  async function render() {
    const to = els.to.value.trim() || "you";
    const blob = await makeCard(to, text);
    file = new File([blob], `thank-you-${to.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")}-${dayKey()}.png`, { type: "image/png" });
    if (els.img.src) URL.revokeObjectURL(els.img.src);
    els.img.src = URL.createObjectURL(blob);
    els.share.hidden = !navigator.canShare?.({ files: [file] });
  }

  els.to.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, 250);
  });
  els.save.addEventListener("click", () => download(file.name, file));
  els.share.addEventListener("click", () => {
    navigator.share({ files: [file], text: "Thank you ♡" }).catch(() => {});
  });
  els.dialog.addEventListener("click", (e) => {
    if (e.target === els.dialog) els.dialog.close();
  });

  return {
    async open(entryText) {
      text = entryText;
      els.to.value = thankee(entryText);
      await render();
      els.dialog.showModal();
      mimi.react(["♡", "is signing the card with a paw."], { hearts: 2, hold: 2400 });
    },
  };
}
