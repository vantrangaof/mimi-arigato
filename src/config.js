// Cloud sync (optional). Leave empty to keep everything on this device only.
//
// To turn it on: create a Supabase project, run supabase/schema.sql in its SQL Editor,
// then paste the Project URL and the "anon public" key from Project Settings → API.
// The anon key is designed to be public; row-level security keeps each person's data
// private. Never put the service_role key here.

export const SUPABASE_URL = "https://gbcobrwtrbsfdhqvnmow.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_bzx2uSoGkBcj3q8UMwJxYg_7mFnfbyR";

// Notifications from Mimi (Web Push): the public half of the VAPID key pair. The private half
// lives only in Vercel (VAPID_PRIVATE_KEY), used by api/nudge.mjs.
export const VAPID_PUBLIC_KEY = "BEXVxSdWnHADR2VuffR0HxlxXr7R6ovulc_eNiad_ZBkEF78chn05UFzVhj8BItlWMw5rLTD_V7XMWuhM8JHH5E";
