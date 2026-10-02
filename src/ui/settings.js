// Settings sheet: names, fur, daily reminder, account, backup.

import { download } from "../core/dom.js";
import { dayKey } from "../core/dates.js";
import { store, catName, exportBackup, importBackup, totalThings } from "../core/store.js";
import { FURS } from "../cat/sprite.js";

function radio(name, value, checked, disabled, content) {
  const label = document.createElement("label");
  label.className = "choice";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.disabled = disabled;
  label.append(input, ...content);
  return label;
}

function span(className, text) {
  const s = document.createElement("span");
  if (className) s.className = className;
  if (text != null) s.textContent = text;
  return s;
}

function reminderICS(time) {
  const [hh, mm] = time.split(":");
  const d = new Date();
  const ymd = dayKey(d).replaceAll("-", "");
  const stamp = d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const name = catName();
  const url = location.protocol.startsWith("http") ? location.href.split("?")[0] : "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mimi Arigato//EN",
    "BEGIN:VEVENT",
    `UID:mimi-daily-${Date.now()}@mimi-arigato`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T${hh}${mm}00`,
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    `SUMMARY:Tell ${name} five good things`,
    `DESCRIPTION:${name} is waiting to hear about your day.${url ? `\\n${url}` : ""}`,
    ...(url ? [`URL:${url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:Tell ${name} five good things`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function wireSettings(els) {
  function renderFur() {
    els.fur.replaceChildren(...Object.entries(FURS).map(([id, f]) => {
      const swatch = span("swatch");
      swatch.style.background = f.body;
      swatch.style.borderColor = f.outline;
      return radio("fur", id, store.settings.fur === id, false, [swatch, span("", f.label)]);
    }));
  }

  function render() {
    if (document.activeElement !== els.name) els.name.value = store.settings.name;
    if (document.activeElement !== els.userName) els.userName.value = store.settings.userName;
    els.name.placeholder = "Mimi";
    els.reminder.value = store.settings.reminder;
    renderFur();
  }

  els.open.addEventListener("click", () => {
    els.backupNote.textContent = "";
    render();
    els.dialog.showModal();
  });
  els.dialog.addEventListener("click", (e) => {
    if (e.target === els.dialog) els.dialog.close();
  });

  els.userName.addEventListener("input", () => {
    store.settings.userName = els.userName.value.slice(0, 24);
    store.settings.nameAsked = true;
    store.save("settings");
  });
  els.name.addEventListener("input", () => {
    store.settings.name = els.name.value.slice(0, 16);
    store.save("settings");
  });
  els.fur.addEventListener("change", (e) => {
    store.settings.fur = e.target.value;
    store.save("settings");
  });
  els.reminder.addEventListener("change", () => {
    if (!els.reminder.value) return;
    store.settings.reminder = els.reminder.value;
    store.save("settings");
  });
  els.addReminder.addEventListener("click", () => {
    download("mimi-reminder.ics", new Blob([reminderICS(store.settings.reminder)], { type: "text/calendar" }));
  });

  els.backup.addEventListener("click", () => {
    download(`mimi-backup-${dayKey()}.json`, new Blob([exportBackup()], { type: "application/json" }));
    const days = Object.keys(store.days).length;
    els.backupNote.textContent = `Downloaded ${totalThings()} good things from ${days} day${days === 1 ? "" : "s"}.`;
  });
  els.restore.addEventListener("change", async () => {
    const file = els.restore.files[0];
    if (!file) return;
    try {
      const added = importBackup(await file.text());
      els.backupNote.textContent = added
        ? `Restored ${added} good thing${added === 1 ? "" : "s"} from the backup.`
        : "Everything in that backup is already here.";
    } catch {
      els.backupNote.textContent = "That file isn't a Mimi backup. Choose a file you downloaded with “Download backup”.";
    }
    els.restore.value = "";
    render();
  });

  store.on(() => {
    if (els.dialog.open) render();
  });
}
