# Visiting cats + Hide a treasure — design

**Goal.** The first thing friends do together in Mimi: visit each other's rooms, and hide a treasure for a friend to find. Asynchronous, so you're never both needed at once. Chosen by the user on 2026-10-04 over "paint together" and "fishing together", which can reuse the friends and rooms built here.

## What the user sees

**Adding a friend**
- Settings → **Friends** (only when signed in). "Invite a friend" makes a link like `mimi-arigato.vercel.app/#invite=K7Q2-M9`. Send it however you like.
- When the friend opens it signed in, Mimi asks: "Be friends with Xiao Mi's human?" → **Yes**. Both of you now see each other in Friends, as cat name + fur ("Mochi").
- Links expire after 7 days and work once. Either side can remove the friendship.

**Visiting**
- Tap a friend → their room opens in a sheet: their cat (name, fur, what they're wearing), room unlocks, things from their life, treasures, seasonal decor. Read-only, with no good things, diary, photos or theories. It's only the room.
- Tapping their cat gives a visitor reaction ("Mochi sniffs you politely.").
- Phase 3: your cat shows up in their room for the rest of the day as a small visitor in the corner ("Xiao Mi came to visit today").

**Hide a treasure**
- In your own room, long-press a treasure Mimi found → **Hide it for a friend** → pick a friend → pick a spot: behind the cushion, in the jar, under the plant, on the bookshelf, behind the picture, by the window, under the rug, in the suitcase (only spots your room actually has).
- Your friend gets a sparkle on your name in Friends: "Xiao Mi hid something for you."
- In your room, the friend taps spots. Their cat says "not here…", "*sniff sniff* warmer!" for a spot next to it, and "found it!" for the right one. You can't lose and there's no limit on tries.
- **Found:** a copy goes into the friend's room with a tag, "a seashell from Xiao Mi's room", and you see "Mochi found your seashell!" next time you open Mimi. Your own treasure stays with you.
- One hidden treasure per friend at a time.

## Data (Supabase)

Run as an addition to `supabase/schema.sql` (the user re-runs it).

| Table | Columns | Who can read / write |
|---|---|---|
| `friend_invites` | `code` pk, `user_id`, `created_at`, `expires_at`, `used_by` | owner only; accepting goes through an RPC |
| `friends` | `user_id`, `friend_id`, `created_at` (one row each way) | read your own rows; created only by `accept_invite`; delete your own rows (a trigger removes the mirror row) |
| `rooms` | `user_id` pk, `snapshot` jsonb, `updated_at` | owner writes; **friends read** (policy: a `friends` row exists from owner to reader) |
| `hidden_treasures` | `id`, `owner_id`, `friend_id`, `treasure` (id + label), `spot`, `hidden_at`, `found_at` | owner reads/writes their own; the friend **cannot read `spot`**; guessing goes through an RPC |

RPCs (security definer, each checks `auth.uid()`):
- `accept_invite(code)`: validates the code and inserts both friendship rows.
- `hidden_for_me()`: hidden treasures waiting for me, without the spot.
- `guess_spot(id, spot)`: returns `found`, `warm` or `cold`. On `found` it stamps `found_at`.

**Room snapshot** (written on each sync when it changed): `{ v, catName, fur, customFur, wear, total, treasures, things, season, day }`. As built, the invite preview is a `peek_invite()` RPC (returns the cat name and whether it's your own code). It holds no entry text. Room things do reveal themes ("a coffee mug"); see the open questions.

**On the device:** `store.friends` (a cache for showing the list offline) and found gifts in `store.treasures` as `{ id, key, from: "Xiao Mi" }`. Gift treasures are keyed `id@owner` so they don't collide with your own (`unionBy` in `mergeCloudState` changes to that key).

## Build order
1. ✅ (2026-10-06) **Friends + room snapshot + visiting** (schema, invite link, Friends section, read-only room sheet that reuses `renderRoom` and `applyLook`).
2. **Hide a treasure** (long-press menu, spots per room, RPCs, gift treasures, "found it" greetings).
3. **Visitor cat** in a friend's room for a day (a small `visits` table).

Every part needs both people signed in. Offline, Friends shows "connect to visit".

## Decisions (user, 2026-10-05)
- **Things from your life:** friends see them, with a "Show my things to friends" switch in Settings (on by default). When it's off, the snapshot leaves out `roomThings`.
- **Hidden treasure:** stays in your room; the friend gets a copy when they find it.
- **Invites:** link **and** a short code to type (Settings → Friends → "Have a code?").

## Testing
Extend the mock Supabase used for the sync tests with `friends`, `rooms`, `hidden_treasures` and the three RPCs, and run two headless Chrome profiles as two users: invite → accept → visit → hide → guess cold/warm/found → gift appears with its tag. Then a real two-account test on the live site, since sign-in itself hasn't been tested live yet.
