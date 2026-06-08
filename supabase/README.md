# StudyLM — Supabase Setup

Run the migration files **in order** inside the Supabase SQL Editor:

| File | What it does |
|---|---|
| `migrations/20240001_schema.sql` | Creates all 7 tables |
| `migrations/20240002_rls.sql` | Enables RLS + all policies |
| `migrations/20240003_functions.sql` | `handle_new_user` trigger, `deduct_tokens`, `add_tokens`, `admin_grant_tokens` |
| `migrations/20240004_storage.sql` | Creates the `sources` storage bucket + policies |
| `seed.sql` | Optional — promotes a user to admin for local dev |

## How to run

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Click **New query**
3. Paste each file's contents and click **Run** — in the order listed above

## Key functions

### `handle_new_user` (trigger)
Fires automatically after every `auth.users` insert. Creates the `profiles` row and logs a 1,000-token welcome grant. **You never call this directly.**

### `deduct_tokens(p_user_id, p_amount, p_description)`
Atomically deducts tokens. Raises an error if balance is insufficient. Called from the app via `supabase.rpc('deduct_tokens', {...})`.

### `add_tokens(p_user_id, p_amount, p_description)`
Adds tokens after a successful Flutterwave payment. Called from `useFlutterwave.ts`.

### `admin_grant_tokens(p_admin_id, p_user_id, p_amount, p_description)`
Admin-only token grant. Validates caller is an admin before crediting.

## Storage bucket

The `sources` bucket is **private**. Files are stored at `{userId}/{notebookId}/{uuid}.{ext}` and accessed via signed URLs or the Supabase Storage API.
