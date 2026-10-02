# Mimi Arigato

**A tiny cat who collects the good things in your life.**

Every day, tell Mimi one small thing worth remembering. Mimi listens. Mimi remembers. Mimi grows a little world around your memories.

> Notice → Tell Mimi → Mimi reacts → Mimi remembers → Your little world grows

Mimi is a pet that never asks anything of you: no hunger bars, no punishments, no broken streaks. Missing a day takes nothing away. "Arigato" means thank you in Japanese; you can rename the cat (for example, Xiao Mi).

It's an installable web app (PWA). It works offline, needs no account, and keeps everything on your device.

---

## The five pillars

| Pillar | What it does |
|---|---|
| **Good things** | Tell Mimi up to five good things a day. One is a good day; five is Mimi's favorite. |
| **Mimi** | A pixel cat with moods, reactions to what you write, idle habits, and a purr. |
| **Memories** | Mimi notices patterns on their own: favorite things, people you mention, beautiful moments. |
| **Little world** | Mimi's room fills up with things as your good things add up, plus treasures Mimi finds. |
| **Scrapbook** | Every so often Mimi keeps one of your good things as a scrapbook page. |

---

## What you can do

### Meet Mimi
- On your first visit Mimi says hello and asks **"What's your name?"** Mimi then greets you by name ("Good morning, Trang!", "you're back, Trang!"). Choose "Maybe later" to skip; you can add or change it in Settings.

### Tell Mimi good things
- Write up to five entries a day. Hearts fill as you go: *"One is enough today"* → *"That's a good day"* → *"Mimi's favorite kind of day."*
- **Mimi reacts to what you wrote**, entirely on-device using keywords:
  - coffee → "Mimi approves." · rain → "likes rainy windows too." · a friend or family → "thinks that sounds special."
  - finished something → "is so proud of you." · someone was kind → "loves a little kindness."
  - a hard day → **"says that counts too."** (Mimi never forces positivity)
  - taxes → "doesn't understand taxes, but is proud of you."
- If you write something you've written before, Mimi remembers: *"remembers you wrote about this on Sep 28 too."*
- **Stuck?** Tap "Stuck? Pick something to think about" for prompts: something tiny, someone who was kind, something that made you laugh, something delicious, something you're proud of, something cute, something beautiful, something worth remembering.
- The first question of each day rotates ("Tell me something tiny…", "What made you smile?").
- Remove an entry with × (for typos).

### Days together (instead of streaks)
- The top bar shows **"Day 37 together"**: how long you've known Mimi, which never resets.
- Milestones are celebrated once: Day 1 "nice to meet you", Day 7 "recognizes you now", Day 30 "knows some of your favorite things", Day 100, one year; and 50 / 100 / 250 / 500 / 1,000 good things.
- After a few days away: *"you're back! Mimi kept your room cozy while you were away."*

### Mimi, the cat
- **Tap Mimi** to pet them: a **meow** or **purr** (real recordings), happy ^ ^ eyes, blush, tail wags, a floating heart, and a little line ("leans into your hand."). Sometimes Mimi recalls one of your past entries.
- **Sound on/off:** speaker button at the top right (remembered).
- **Idle habits:** every so often Mimi grooms a paw, yawns, dozes, stretches, chases their tail, stares at you, looks out the window, watches the aquarium fish, admires their accessory, or sits by the journal "waiting to hear about your day."
- **Time of day:** asleep 10 pm to 6 am ("z z z"; tap to wake). Morning stretch, lunchtime thoughts, evening "ready to hear about your day."
- **Treats:** a fish drops in and Mimi chomps it (3 a day).
- **Play:** a laser dot for 20 seconds; Mimi pounces when it lands on them. Steer it with your finger or mouse, or let it wander.
- **Eyes follow your mouse** on desktop.

### Mimi's little world
Everything unlocks by total good things and never goes away:

| Good things | Unlocks |
|---|---|
| 5 | Little flower (accessory) |
| 15 | Ribbon bow (accessory) |
| 30 | Tiny plant |
| 40 | Cozy scarf (accessory) |
| 50 | Cushion |
| 75 | Wall picture |
| 100 | Window (the sky outside follows the time of day) |
| 150 | Bookshelf |
| 200 | Tiny crown (accessory) |
| 250 | Aquarium |
| 500 | Starry window |

- The journal shows what's next: *"Next for Mimi's world: a cushion at 50 good things."*
- **Surprises** (rare, at most about three a week): Mimi finds a treasure (a tiny button, a seashell, a blue feather…) that appears on the floor of the room, or tells you a dream ("dreamed about noodles last night").
- Tap things in the room and Mimi comments on them.

### Mimi's things (tabs)
- **Memories:** *What Mimi has learned* ("Mimi thinks you really like coffee." "You talked about Lin 3 times. Mimi knows Lin must be important." "Your mom came up 4 times. That sounds special.") plus a **Memory cabinet** of drawers Mimi sorts on their own: People, Food, Things you were proud of, Things that made you laugh, Beautiful moments, Kindness, Rest, Moving your body, Hard days you got through, Little things, and Treasures Mimi found.
- **Scrapbook:** at 10, 25, 50, 75, 100 good things, then every 50, Mimi keeps one entry (preferring warm moments) as a taped-in page. Flip through them.
- **Month:** "Your October": how many good things across how many days, what kinds, "You mentioned coffee 11 times," and **Mimi's favorite memory** of the month.
- **Calendar:** days get pinker the more you wrote; tap a day to read it; search everything.

### Settings
- Your name, the cat's name, fur color (Strawberry, Peach, Cloud, Midnight, Snow), wardrobe.
- **Daily reminder:** adds a repeating event to your calendar app (web apps can't schedule notifications on their own).
- **Backup / Restore:** download everything as a file; restoring merges and never deletes.
- **Share a picture of today:** a 1080×1350 pixel card of the cat with today's good things.

---

## Running it

No build step and no dependencies. Serve the folder with any static server:

```sh
python3 -m http.server 5173
# open http://localhost:5173
```

---

## Project structure

```
index.html              Page markup (the room, journal, tabs, dialogs)
manifest.webmanifest    Install-to-home-screen metadata
sw.js                   Offline support (network first, cached copy when offline)
assets/
  icon.svg              App icon
  sounds/meow.m4a       0.9 s meow clip
  sounds/purr.m4a       1.5 s purr clip
styles/
  tokens.css            Colors, fonts, light/dark themes, the pixel unit
  base.css              Graph-paper page, buttons, inputs, utilities
  layout.css            Page layout; desktop two-column layout
  cat.css               The room, sprite states, idle animations, effects
  panels.css            Journal, tabs, memories, scrapbook, month, calendar, dialogs
src/
  main.js               Startup: opens the database and wires the modules together
  core/                 Infrastructure, no UI
    db.js               IndexedDB database (localStorage fallback)
    store.js            In-memory data + persistence, change events, backup/restore
    dates.js            Local day keys and date formatting
    dom.js              Small DOM helpers
    pixel.js            Draws pixel art as SVG
  cat/                  The cat itself
    sprite.js           Sprite data, fur palettes, accessories, SVG and canvas drawing
    mimi.js             Moods, reactions, idle habits, sleep schedule
    sound.js            Meow and purr playback
  world/
    world.js            Unlock list, the pixel room, treasures
    surprises.js        Rare finds and dreams
  memory/               How Mimi understands you (pure logic)
    insights.js         Keyword reactions, categories, learned facts, monthly recap
    relationship.js     Days together and milestones
    scrapbook.js        When pages are added and which entry is kept
  ui/                   One module per part of the page
    habitat.js          Room on screen, pixel sizing, petting
    topbar.js           Days together, sound toggle, settings icon
    intro.js            "What's your name?"
    journal.js          Writing good things, prompts, unlock and scrapbook events
    tabs.js             Accessible tabs
    memories.js         Memory cabinet
    scrapbook.js        Scrapbook pages
    month.js            Monthly recap
    calendar.js         Calendar and search
    play.js             Treats and laser play
    settings.js         Settings dialog, reminder file, backup
    share.js            Share picture
```

Conventions:
- **`core` and `memory` never touch the page**; `ui` modules each own one part of the page and re-render when the store changes (`store.on(render)`).
- Data changes go through the store: `addEntry` / `removeEntry` for good things; for everything else change `store.<name>` then call `store.save("<name>")`.
- New files must be added to `SHELL` in `sw.js` so they work offline.

---

## Data

Everything is stored **on the device** in an IndexedDB database named `mimi-arigato`:

| Store | Contents |
|---|---|
| `entries` | One record per good thing: `{ id, day: "YYYY-MM-DD", text, createdAt }`, indexed by day |
| `kv` | `settings` (your name, cat name, fur, accessory, sound, reminder), `scrapbook`, `treasures`, `firstMet`, `milestones`, `surprises`, daily `pets`/`treats` counters, `lastVisit` |

Data from earlier versions (plain localStorage) is moved into the database automatically on first load. If IndexedDB isn't available (some private-browsing modes), the app falls back to localStorage.

There's no server and no sync yet. Clearing site data or switching devices loses data unless you use **Backup**.

---

## Not doing (on purpose)

Hunger or health bars, punishment, "Mimi is sad you didn't visit", losing accessories, streak freezes, coins, energy, ads, quests. Mimi says one thing: *"Tell me one nice thing."*

## Ideas for later

- **Cloud sync** across devices (needs accounts and a hosted database, e.g. Supabase or Firebase).
- Put it online (GitHub Pages / Netlify) so it can be installed on a phone.
- More idle animations and room items; seasonal decorations.
- Optional AI reactions for entries the keyword rules don't recognize.

## Credits

Sounds: "Loud cat purring" (Freesound community) trimmed to 1.5 s, and a meow (yomecerlm3), trimmed to 0.9 s, both via Pixabay.
