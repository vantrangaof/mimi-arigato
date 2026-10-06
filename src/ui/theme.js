// Light or dark. By default it follows the time of day, like the sky in Mimi's window:
// light from 6 am, dark from 7 pm. Settings → Appearance can follow the phone instead, or fix one.
// The choice is mirrored to localStorage so the inline script in index.html can apply it
// before the page first draws (no flash of the wrong theme). Keep its hours in sync with NIGHT.

const COLORS = { light: "#fcf2f6", dark: "#1e1522" }; // --paper in each theme, for the browser bar
const KEY = "mimi-theme";
const NIGHT = { from: 19, to: 6 };

export const THEMES = [
  { id: "daynight", label: "Day & night" },
  { id: "system", label: "Match my phone" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const isNight = (hour = new Date().getHours()) => hour >= NIGHT.from || hour < NIGHT.to;

// The theme to force right now, or null to let the phone decide.
function resolve(theme) {
  if (theme === "light" || theme === "dark") return theme;
  if (theme === "system") return null;
  return isNight() ? "dark" : "light"; // "daynight" and anything unknown
}

let current = "daynight";

export function applyTheme(theme = current) {
  current = theme;
  const forced = resolve(theme);
  if (forced) document.documentElement.dataset.theme = forced;
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const own = meta.media.includes("dark") ? "dark" : "light";
    meta.content = COLORS[forced ?? own];
  }
}

// Day & night switches over while the app stays open.
setInterval(() => applyTheme(), 60_000);
addEventListener("visibilitychange", () => document.hidden || applyTheme());
