// Settings sheet: name, fur, wardrobe, daily reminder, backup.

import { store, catName, dayKey, exportBackup, importBackup, totalThings } from "./store.js";
import { FURS, ACCESSORIES } from "./sprite.js";

export function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

  function renderWardrobe() {
    const total = totalThings();
    const options = [{ id: "none", label: "Nothing", need: 0 }, ...ACCESSORIES];
    els.wardrobe.replaceChildren(...options.map((a) => {
      const locked = total < a.need;
      const text = [span("", a.label)];
      if (locked) text.push(span("lock", `at ${a.need}`));
      return radio("accessory", a.id, store.settings.accessory === a.id, locked, text);
    }));
    const next = ACCESSORIES.find((a) => total < a.need);
    const told = `You've told ${catName()} ${total} good thing${total === 1 ? "" : "s"}.`;
    els.wardrobeNote.textContent = next
      ? `${told} The ${next.label.toLowerCase()} unlocks at ${next.need}.`
      : `${told} Everything is unlocked.`;
  }

  function render() {
    if (document.activeElement !== els.name) els.name.value = store.settings.name;
    els.name.placeholder = "Mimi";
    els.reminder.value = store.settings.reminder;
    renderFur();
    renderWardrobe();
  }

  els.open.addEventListener("click", () => {
    els.backupNote.textContent = "";
    render();
    els.dialog.showModal();
  });
  els.dialog.addEventListener("click", (e) => {
    if (e.target === els.dialog) els.dialog.close();
  });

  els.name.addEventListener("input", () => {
    store.settings.name = els.name.value.slice(0, 16);
    store.saveSettings();
  });
  els.fur.addEventListener("change", (e) => {
    store.settings.fur = e.target.value;
    store.saveSettings();
  });
  els.wardrobe.addEventListener("change", (e) => {
    store.settings.accessory = e.target.value;
    store.saveSettings();
  });
  els.reminder.addEventListener("change", () => {
    if (!els.reminder.value) return;
    store.settings.reminder = els.reminder.value;
    store.saveSettings();
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
