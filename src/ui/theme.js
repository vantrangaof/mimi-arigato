// Light or dark: follows the phone ("auto") unless you pick one in Settings → Appearance.
// The choice is mirrored to localStorage so the inline script in index.html can apply it
// before the page first draws (no flash of the wrong theme).

const COLORS = { light: "#fcf2f6", dark: "#1e1522" }; // --paper in each theme, for the browser bar
const KEY = "mimi-theme";

export const THEMES = [
  { id: "auto", label: "Match my phone" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function applyTheme(theme) {
  const forced = theme === "light" || theme === "dark" ? theme : null;
  if (forced) document.documentElement.dataset.theme = forced;
  else delete document.documentElement.dataset.theme;
  try {
    if (forced) localStorage.setItem(KEY, forced);
    else localStorage.removeItem(KEY);
  } catch {}
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const own = meta.media.includes("dark") ? "dark" : "light";
    meta.content = COLORS[forced ?? own];
  }
}
