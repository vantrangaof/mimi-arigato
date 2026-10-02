// Mimi keeps a scrapbook page at 10, 25, 50, 75, 100 good things, then every 50.

import { store, totalThings } from "../core/store.js";
import { pickKeepsake } from "./insights.js";

export const FIRST_PAGE = 10;

export function pageThresholds(total) {
  const out = [FIRST_PAGE, 25, 50, 75, 100].filter((t) => t <= total);
  for (let t = 150; t <= total; t += 50) out.push(t);
  return out;
}

// Adds any pages that are due. Returns the new pages (usually zero or one).
export function fillScrapbook() {
  const have = new Set(store.scrapbook.map((p) => p.at));
  const added = [];
  for (const at of pageThresholds(totalThings())) {
    if (have.has(at)) continue;
    const keepsake = pickKeepsake();
    if (!keepsake) break;
    const page = { at, key: keepsake.key, text: keepsake.text };
    store.scrapbook.push(page);
    added.push(page);
  }
  if (added.length) store.scrapbook.sort((a, b) => a.at - b.at);
  return added;
}
