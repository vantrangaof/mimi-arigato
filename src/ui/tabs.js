// Accessible tabs (arrow keys move between them); the last tab used is remembered.

const STORAGE_KEY = "mimi.tab";

export function wireTabs(tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panelOf = (tab) => document.getElementById(tab.getAttribute("aria-controls"));

  function select(tab, focus = false) {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panelOf(t).hidden = !on;
    }
    if (focus) tab.focus();
    try {
      localStorage.setItem(STORAGE_KEY, tab.id);
    } catch {}
  }

  tablist.addEventListener("click", (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) select(tab);
  });
  tablist.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(tabs[(i + moves[e.key] + tabs.length) % tabs.length], true);
  });

  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {}
  select(tabs.find((t) => t.id === saved) ?? tabs[0]);
}
