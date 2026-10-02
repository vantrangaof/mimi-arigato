# Mimi Arigato

A tiny pink pixel cat you tell five good things to each day.

Mimi Arigato is a gratitude journal with a virtual pet. Each day you tell your cat up to five good things that happened. The cat reacts, remembers them, and grows a little wardrobe as you keep coming back. "Arigato" means thank you in Japanese. "Mimi" is the default name, and you can rename the cat (for example, Xiao Mi).

It's a small installable web app (PWA). It works offline, has no account and no server, and keeps everything on the device.

---

## The core loop

1. Open the app. The cat greets you based on the time of day.
2. Write one to five good things about today. The cat reacts to each one.
3. Fill all five hearts and the cat "glows with thanks" until tomorrow.
4. Come back daily to keep your streak and unlock accessories.

---

## What you can do

### Journal: five good things a day
- Write up to **five entries per day** (140 characters each).
- Five pixel hearts fill in as you go ("2 of 5 today").
- Remove an entry with × (for typos).
- After the fifth entry the input closes until tomorrow: "Mimi will keep these safe. Come back tomorrow for five more."
- The day resets at midnight on your device's clock.

### Pet the cat
- **Tap the cat** to pet them. They get happy eyes (^ ^), blush, wag their tail quickly, a pixel heart floats up, and a speech bubble appears ("purr~", "mrrp!", "nya~"...).
- Each pet changes the status line under the name ("is purring softly.", "wiggles their ears."...).
- A counter at the bottom tracks pets today.
- **Memories:** about 1 in 4 pets, the cat recalls a random past entry: *remembers "Pho with my sister" from Sep 28.*

### Activities
- **Give a treat:** a pixel fish drops in and the cat chomps it ("nom nom"). Limit of 3 treats a day; after that the cat shakes their head ("is too full for more treats today").
- **Play (laser dot):** a red dot appears for 20 seconds. It wanders on its own, or you can steer it with your finger or mouse. When it lands on the cat, they pounce ("got it!"). At the end: "caught the dot 4 times!"
- **Eyes follow your mouse** on desktop.

### Moods and time of day
- **Night (10 pm to 6 am):** the cat is asleep (closed eyes, "z z z" bubble, still tail). Tapping wakes them for about 90 seconds, then they doze off again.
- **Morning:** "is stretching. Good morning!" **Lunch:** "is thinking about lunch." **Evening:** "is ready to hear about your day."
- **Coming back after 2+ days away:** "you're back! / missed you so much."
- After all five entries: "is glowing with thanks."

### Streaks
- A paw print and "4-day streak" at the top. The streak counts consecutive days with at least one entry.
- The paw is filled in once you've written today, and outlined if today still needs an entry. The streak stays alive until the end of today.

### Calendar and search
- **Month view:** each day gets a deeper pink the more entries it has (0–5). Five entries shows a solid pink square.
- Tap a day to read what you wrote. Use the arrows to see past months.
- **Search** across every entry, with matches highlighted.

### Rewards: the wardrobe
Accessories unlock based on the total number of good things you've written:

| Total good things | Unlocks |
|---|---|
| 5 | Ribbon bow |
| 15 | Little flower |
| 35 | Cozy scarf |
| 70 | Tiny crown |

When one unlocks, the cat puts it on automatically ("ooh! got a ribbon bow for hearing 5 good things!"). You can switch or remove it in Settings.

### Customizing
- **Name:** rename the cat. The new name appears everywhere (title, buttons, messages).
- **Fur color:** Strawberry (pink), Peach, Cloud (gray), Midnight (black with amber eyes), Snow (white).

### Share a picture of today
- "Make a picture of today" creates a 1080×1350 image (Instagram story / portrait size): the pixel cat in their current fur and accessory, the name, the date, and today's entries.
- Save it, or use the phone's share sheet where supported.

### Daily reminder
- Pick a time and tap "Add to calendar". This downloads a repeating daily calendar event ("Tell Mimi five good things") that your phone's calendar app uses to remind you.
- This works around a limitation: web apps can't reliably schedule notifications on their own without a server.

### Backup and restore
- **Download backup** saves all entries and settings as a `.json` file.
- **Restore backup** merges a backup into the current data. It never deletes anything and skips duplicates. Useful for moving to a new phone.

### Works everywhere
- **Phone:** single column with the cat on top, then the journal, then the calendar.
- **Desktop:** two columns. The cat is large on the left and stays in view; the journal and calendar scroll on the right.
- Light and dark mode follow the system setting.
- Installable to the home screen and works offline after the first visit.
- Keyboard accessible, with screen-reader labels, and respects "reduce motion".

---

## Look and feel

- **Visual concept:** the whole page is pink graph paper, and each grid square is exactly one pixel of the cat, so the cat looks drawn onto the sheet.
- **Fonts:** DotGothic16 (a Japanese pixel font) for the name and buttons; M PLUS Rounded 1c for body text.
- **Palette:** soft pink paper `#fcf2f6`, plum ink `#43263a`, strawberry accent `#d64f86`; dark mode uses deep plum `#1e1522`.
- **Tone:** gentle and cozy. The cat speaks in small sounds (purr~, nya!, mrrp~, arigato!); status lines are short and kind.

---

## Current limitations

- **Data lives in one browser on one device.** Clearing site data or switching phones loses it unless you use Backup.
- No accounts, no sync, no cloud.
- No real push notifications (the calendar-event reminder is the workaround).
- English only.
- Not deployed online yet. It runs locally (`python3 -m http.server 5173`, then open http://localhost:5173).

---

## Open questions for improving the concept

- Should the cat have needs that change over time (hunger, happiness), or stay low-pressure with no guilt mechanics?
- What should happen on a missed day? Currently the streak just resets quietly.
- Should rewards be more varied (backgrounds, furniture, new animations, other cats/friends) and tied to streaks as well as totals?
- Should entries support prompts ("something someone did for you", "something small you noticed") for days you're stuck?
- Weekly or monthly reflections ("Your October in good things")?
- A social element (send a friend a good thing, shared cats) versus keeping it fully private?
- What would make someone open it every day beyond streaks?

---

## Tech overview (for developers)

Plain HTML/CSS/JavaScript ES modules with no framework and no build step.

| File | Role |
|---|---|
| `index.html` | Page structure, settings and share dialogs |
| `styles.css` | All styling, themes, animations, responsive layout |
| `app.js` | Starts everything; petting, streak, name/fur, layout sizing |
| `sprite.js` | Pixel cat data (32×29 grid), fur palettes, accessories, SVG and canvas drawing |
| `store.js` | localStorage data: entries, settings, streaks, backup/restore |
| `mimi.js` | Moods, sleep schedule, reactions, floating hearts |
| `journal.js` | Five-good-things form and list, accessory unlocks |
| `calendar.js` | Month view and search |
| `play.js` | Treats and laser-dot play |
| `settings.js` | Settings dialog, reminder `.ics`, backup download/restore |
| `share.js` | Share-picture generation (canvas) |
| `sw.js` | Offline support (network first, cached copy when offline) |
| `manifest.webmanifest`, `icon.svg` | Install-to-home-screen metadata and icon |

Data is stored in localStorage under `mimi.days` (entries by date), `mimi.settings`, `mimi.pets`, `mimi.treats` and `mimi.lastVisit`.
