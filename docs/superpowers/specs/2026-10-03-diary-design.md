# Diary — design

**Goal.** A private place to write what happened today or what's on your mind, not only good things. Agreed with the user on 2026-10-03.

## What the user sees
- A **Diary** tab in "Mimi's things" (after Memories). It opens on today's page.
- **Mood weather:** four pixel icons (sunny, cloudy, rainy, stormy). Tap one to set the day's weather and tap it again to clear it. Optional.
- **The page:** a lined-paper text area that saves as you type ("Saved" appears a moment later). Up to 20,000 characters.
- **Mimi keeps you company:** a small sleeping Mimi sits in the corner of the page, and her ears twitch while you type. The big Mimi's status reads "is curled up next to your diary." She never reacts to or quotes what you write.
- **Past pages:** a list underneath (date, weather icon, first line). Tap one to read or edit it, and "Back to today" returns.
- **Calendar:** days with a diary page show their weather icon in a corner. The day's detail has an "Open diary page" button. Calendar search does not search the diary.

## Privacy
Diary text never appears in Memories, Scrapbook, Month, the picture of today, Mimi's "remember?" lines, or calendar search. It is included in backups and cloud sync, so it's private to your account. It isn't end-to-end encrypted.

## Data
- On the device: IndexedDB v3 adds a `diary` store keyed by day, holding `{ day, text, mood, updatedAt, synced }`. The localStorage fallback uses `mimi.db.diary`.
- In the cloud: table `public.diary_pages` with primary key `(user_id, day)`, columns `text` and `mood` (null or sunny/cloudy/rainy/stormy), `updated_at`, and a server-stamped `synced_at`, protected by row-level security.
- Sync: changed pages are upserted, pages changed since the last pull are fetched, and the newer `updated_at` wins for the whole page. Editing the same day on two devices at once keeps the later edit.
- Backup: version 4 adds `diary`; restoring merges each day and the newer page wins.

## Not in this version
Weather in Mimi's window (the window unlocks at 100 good things), the "Let it go" page, prompts, "a year ago today", and a lock.

## Testing
Headless Chrome with a mock Supabase client. Write a page, set its weather, reload and check it persisted, open a past page, check the calendar marker, and confirm sync pushes `diary_pages` rows. Check the layout at phone width.
