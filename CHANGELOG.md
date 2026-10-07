# Changelog

Progress log for Mimi Arigato. Newest first.

## 2026-10-07

### Mimi keeps every good thing
- The AI no longer decides whether a good thing is "real". It now picks a verdict: **good** (a reply about that exact thing), **small** ("idk", "today was okay": kept, and Mimi says something like "i'll keep this little one"), **oops** (keyboard mashing only: stays in the box, "did a paw slip?"), or **hard** (comfort, as before). Small ones earn fish, water and cuddles like any other.
- Removed "Not saved: Mimi only gets treats for real good things". The oops hint is now "Not saved yet: fix it and tap Tell again."
- The app still understands the old `unclear` verdict, in case an older server answers.

### Nothing special today
- A "Nothing special today" link under "Stuck?" (only before your first good thing). Mimi says "some days are just days. Here's a fish anyway." and you get one fish, water and cuddle to give. It isn't saved as a good thing and only counts for today on this device (`quietDay`).

### Roadmap from a design review
- Reviewed another AI's ideas against what's built. Agreed order (see README "Next up"): AI tags people/places/things → tappable room objects with memories → a page per person or thing → theories you can correct → "Mimi remembers before you do". Skipped for now: memory graph view, personality modes, stats and chapters (save for Wrapped), friendship tree.

## 2026-10-06

### Showing how to earn treats
- **Treat tray** above Mimi's buttons says what to do: "Tell Mimi a good thing to earn a fish, water and a cuddle ↓" → "You earned treats! Tap Fish, Water or Cuddle…" → "All given! Tell Mimi another good thing to earn more (1 of 5 today)" → "completely spoiled today ♡". When it's asking, tapping it scrolls to the good-things box, focuses it and makes it glow.
- Fish/Water/Cuddle look dashed and faded when there's nothing to give; tapping one takes you to the box too. A good thing that gets accepted pops "+1" on each.
- A line under the box: "Each good thing earns Mimi a fish, water and a cuddle." If the AI doesn't accept it: "Not saved: Mimi only gets treats for real good things, even tiny ones."

### Where we stopped
- Talked through rewards: food and water come from telling Mimi good things (AI checks they're real, built) and from doing tasks (not designed yet). Next session: push and test the AI on the live site, then design tasks. See README "Next up".

### Mimi's AI: real good things, fish & water, Chat with Mimi
- **AI check:** when signed in, Mimi reads each good thing first (Gemini 2.5 Flash-Lite through `api/mimi.mjs`). Not a real good thing (gibberish, filler, padding) → Mimi tilts her head and asks what was good; it stays in the box and isn't saved. Something painful → Mimi comforts you instead. Real ones get a reply about that exact thing. Signed out, offline, or AI down → accepted as before.
- **Fish, water and cuddles** replace "Give a treat": each good thing told today earns one of each to give when you like. Mimi never gets hungry or thirsty (no-guilt rule kept).
- **Chat with Mimi:** a chat sheet (look borrowed from Urban Bento's Hiro chat: round bubbles, chips, pill input, typing dots). Mimi knows your names, days together, recent good things and wishes, never your diary. The chat stays on this device; "Start over" clears it.
- `api/mimi.mjs` keeps the prompts and model on the server (it can't be used as a general AI), checks your Supabase sign-in, and allows 120 AI calls per person per day (`ai_usage` table, `mimi_ai_call()`).
- **Setup:** add `GEMINI_API_KEY` in Vercel → Settings → Environment Variables, and re-run `supabase/schema.sql`.

### Light mode
- **Settings → Appearance:** Day & night (default: light 6 am–7 pm, dark otherwise, switching while the app is open) / Match my phone / Light / Dark. Saved with your settings (syncs), and mirrored to localStorage so an inline script applies it before the page draws. The browser bar color follows the choice.

### Friends and visiting (multiplayer, step 1)
- **Settings → Friends** (when signed in): "Invite a friend" makes a one-use code (`ABC-234`, 7 days) plus a link (`#invite=…`) to share or copy. A friend opens the link (Settings opens on "Be friends with Xiao Mi's human?") or types the code under "Have a code?" (for when an iPhone opens the link in Safari instead of the installed app).
- Tap a friend to **visit their room** in a sheet: their cat (fur, including a photo palette, and what they wear), unlocks, treasures, seasonal decor and things from their life, read-only. Tapping their cat or things gets visitor lines ("Mochi sniffs you politely."). Never good things, diary, photos or theories.
- **Show my things to friends** switch (on by default; synced with settings).
- Mimi greets you when someone accepted your invite. Removing a friend ends it for both people.
- Sync uploads a room snapshot (`rooms` table) whenever it changes.
- Mimi's startup greetings now wait for any greeting already playing instead of cutting it off (`mimi.later`).
- **Schema change:** re-run `supabase/schema.sql` (adds `friend_invites`, `friends`, `rooms`, `peek_invite()`, `accept_invite()`).
- Decided with the user: things-from-your-life switch, a hidden treasure stays in your room, invite link plus code. Next: hide a treasure.

## 2026-10-04

### Sticky notes (reminders)
- New **Sticky notes** card: "text Mom tomorrow at 6", "pay rent on the 1st every month"… parsed on-device (`memory/reminders.js`) into day, time and repeat, editable before saving.
- Mimi mentions due notes on open (once a day) and at a note's time while the app is open; a sticky note appears on the room wall while something is due. ✓ / later (tomorrow) / add to calendar (.ics with alert and repeat rule) / remove. Never scolds.
- `core/ics.js` shared by the daily reminder and sticky notes.
- Notes sync in `user_state` (newest change per note wins) and are in backups. No schema change.
- Design for review: visiting cats + hide a treasure (first multiplayer game), in `docs/superpowers/specs/`.

### Mimi remembers your life
- New tagline: **"A tiny cat who remembers your life."** (README, page description, manifest).
- **One year ago today:** a card at the top of the journal with good things from this date in earlier years (and their photos), plus Mimi's remark (a thing or person that's still around, a wish that came true, or something warm). Mimi mentions it once per day on open.
- **Mimi's theories:** `memory/theories.js` connects good things (people + categories, people + themes, theme pairs, long-time favorites, things that went quiet, what kind of person you are, weekday and time of day). At most one new theory every 3 days after 10 good things; numbered cards in Memories. `{cat}` in theory text becomes the cat's name.
- **Wishes:** "I want to… / I'd love to… / someday I'll…" in a good thing becomes a wish in the jar (paper tag on the jar). A later good thing with the same keyword marks it come true ("Did you just do it?!"). The jar sometimes hands back a waiting wish (after 14 days). Memories has "Wishes in the jar" and "Wishes that came true".
- **Things from your life:** 18 themes (`memory/themes.js`); 3 mentions puts a pixel object in the room (4 floor slots, 2 on a wall shelf), kept forever.
- Names at the start of an entry ("Anna made me laugh") now count for theories, what Mimi has learned, and the year-ago remark when that name shows up elsewhere.
- Theories, wishes and room things sync inside `user_state` and are in backups (version 5). No schema change; no `schema.sql` re-run needed.

### Eight small things
- **Mimi's good thing:** after your first good thing each day Mimi shares one of their own; shown under the journal for the rest of the day.
- **Your photo on the wall:** the wall picture (75) shows a pixelated photo; "Hang in Mimi's room" in the photo viewer picks which one (`settings.framePhoto`).
- **Fur from a photo:** Settings → Fur builds a palette from a photo of your cat (`settings.customFur`, synced with settings).
- **Seasons:** Halloween (pumpkin + bat; witch hat, ghost costume), Christmas (wreath; Santa hat), Lunar New Year (lantern; lucky knot), and a cake on your yearly anniversary with Mimi. Costumes are only wearable during the event.
- **Jar of good things:** stars fill a jar on a shelf; tap or shake to pull out a past good thing. Rainy/stormy diary weather makes the stars glimmer and Mimi sit by the jar more often.
- **Thank-you cards:** envelope button on today's good things that mention someone; makes a shareable card.
- **Bedtime:** "Tuck in" from 9 pm; Mimi reads back today's good things, the room dims, a blanket comes out, and Mimi sleeps until 6 am.
- **Weekly postcard:** on Sundays a postcard about the week appears on the floor.
- README: "Next up" lists visiting cats and Mimi Wrapped.
- No schema change; no `schema.sql` re-run needed for this release.

## 2026-10-03

### Diary
- New **Diary** tab: one private page per day, saves as you type, past pages listed underneath (tap to read or edit).
- Mood weather per page (sunny, cloudy, rainy, stormy) as pixel icons; shown in the Calendar's day corners, and a day's detail links to its diary page.
- A small sleeping Mimi sits on the page and flicks her tail while you type; big Mimi "is curled up next to your diary." She never reads or quotes it, and diary text stays out of Memories, Scrapbook, Month, share pictures and search.
- Syncs to a new `diary_pages` table (one row per day; an older offline edit can't overwrite a newer page). Included in backups (version 4). Local database upgraded to v3.
- **Needs** `supabase/schema.sql` re-run for the new table.

### Email + password accounts
- Replaced the emailed sign-in link with email + password: "Create an account" or "Sign in" under Settings → Account & sync. Sign-in now happens inside the installed app (the link used to open in the phone's browser instead).
- Friendly messages for wrong password, existing account, short password, too many tries. If Supabase's "Confirm email" is on, sign-up asks you to confirm first.
- No "forgot password" yet; reset from Supabase → Authentication → Users.

### Photos
- Photos tab: add several photos at once, view large, caption, delete.
- Camera button on the journal attaches a photo to a good thing; attached photos also show in the calendar, scrapbook pages, and the monthly favorite.
- Photos are resized on the device (1600 px + 480 px thumbnail, JPEG) and rotated upright.
- Synced to a private Supabase Storage bucket (`photos/<user id>/…`); thumbnails download eagerly, full images on open.
- Local database upgraded to v2 (`photos`, `photoFiles` stores). Schema adds `photos` table, `entries.photo_id`, bucket + per-folder policies.

### Sign-in and sync visibility
- "Sign in" / cloud status button in the top bar (Synced, Syncing…, Sync problem) that opens Account & sync.
- Fixed: the extra top-bar button made the page wider than phone screens; columns now shrink and the five tabs wrap.

### Earlier the same night
- New note from Mimi on every visit (about 60 notes, shuffled with no repeats, plus time-of-day and personal ones).
- Wardrobe: one item per slot (head, neck, face) with live preview. Free: party hat, bell collar, round glasses. Unlockable: flower 5, bow 15, scarf 40, beret 120, crown 200.
- PNG app icons (192, 512, maskable, Apple touch, favicon) so the installed app shows the cat.
- Sound: unlocks on first touch, falls back to `<audio>`; on iPhone the silent switch mutes web sounds.
- Fixed: scarf stripe color.

## 2026-10-02

- Redesign: pink graph-paper page where one square equals one sprite pixel; redrawn cat; DotGothic16 + M PLUS Rounded 1c.
- Journal ("tell Mimi good things"): one is a good day, five is Mimi's favorite; keyword reactions; "Stuck?" prompts; echoes of past entries.
- Mimi's behavior: petting, treats, laser play, eyes follow the mouse, sleep at night, idle habits, time-of-day moods, memories.
- Days together and milestones instead of streaks; Mimi asks your name.
- Mimi's room grows with good things (plant → starry window); rare surprises (treasures, dreams).
- Memories cabinet, scrapbook, monthly recap, calendar with search.
- Settings: names, fur colors, calendar-file reminder, backup/restore, share picture.
- Desktop two-column layout; recorded meow and purr clips.
- Code reorganized into `src/core`, `cat`, `world`, `memory`, `ui`, `cloud`; styles split by concern.
- Storage moved to IndexedDB (auto-migrates old localStorage data).
- Cloud sync with Supabase + email magic link: local-first, tombstoned deletions, field-level settings merge, row-level security.
- Deployed on Vercel at https://mimi-arigato.vercel.app (auto-deploys from GitHub `main`).

## Open items

- Decide: should diary weather affect the jar? Hang your photo before 75 good things? (See README "To decide".)
- Redraw the ghost costume before Halloween starts on Oct 18.

- Run the latest `supabase/schema.sql` in the Supabase project (photos table, `entries.photo_id`, storage bucket are missing as of 2026-10-03).
- Try a real sign-in and sync on the live site (sync has only been tested against a mock Supabase so far).
- In Supabase Auth → URL Configuration: Site URL `https://mimi-arigato.vercel.app`, redirect URLs `https://mimi-arigato.vercel.app/**` and `http://localhost:5173/**`.
- Consider custom SMTP in Supabase (the built-in sender allows only a few emails per hour).
- If sound is still silent on a phone after the silent switch is off, debug on that device.
