export const $ = (id) => document.getElementById(id);

// Small element builder: el("li", { class: "x", text: "hi", onclick: fn }, child, ...)
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children.filter((c) => c != null && c !== false));
  return node;
}

// Restart a CSS animation that is driven by a class.
export function replay(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

export function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
