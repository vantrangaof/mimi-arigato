// Pixel art is drawn as one 1×1 SVG rect per character of a string grid.

export const SVGNS = "http://www.w3.org/2000/svg";

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function group(parent, className) {
  const g = svgEl("g", className ? { class: className } : {});
  parent.appendChild(g);
  return g;
}

export function drawPixels(parent, x0, y0, rows, colorOf, classOf) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const fill = colorOf(ch);
    if (!fill) return;
    const rect = svgEl("rect", { x: x0 + x, y: y0 + y, width: 1, height: 1, fill });
    const cls = classOf?.(ch);
    if (cls) rect.classList.add(cls);
    parent.appendChild(rect);
  }));
}

export function pixelSVG(rows, colors, className) {
  const svg = svgEl("svg", {
    viewBox: `0 0 ${rows[0].length} ${rows.length}`,
    "shape-rendering": "crispEdges",
    "aria-hidden": "true",
  });
  if (className) svg.setAttribute("class", className);
  drawPixels(svg, 0, 0, rows, (ch) => colors[ch]);
  return svg;
}
