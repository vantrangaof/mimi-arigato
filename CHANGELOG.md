# Changelog

Progress log for Mimi Arigato. Newest first.

## 2026-10-03

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

- Run the latest `supabase/schema.sql` in the Supabase project (photos table, `entries.photo_id`, storage bucket are missing as of 2026-10-03).
- Try a real sign-in and sync on the live site (sync has only been tested against a mock Supabase so far).
- In Supabase Auth → URL Configuration: Site URL `https://mimi-arigato.vercel.app`, redirect URLs `https://mimi-arigato.vercel.app/**` and `http://localhost:5173/**`.
- Consider custom SMTP in Supabase (the built-in sender allows only a few emails per hour).
- If sound is still silent on a phone after the silent switch is off, debug on that device.
