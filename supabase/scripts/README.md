# One-off migration scripts

Small bootstrap scripts that don't fit as SQL seeds — mostly things
that need to upload files into Supabase Storage as well as insert rows.

## migrate_legacy_travel_photos.mjs

Promotes N&N and Emma & James's Travel-tab photo carousel from the
bundled `SWITZERLAND_FULL_GUIDE` constant in
`constants/weddingData.ts` to a DB-backed `wedding_guides` row (like
Arjun & Ila already has), so the admin **Edit App Content → Travel
Photos** editor works for them.

There are two ways to run the migration — pick whichever you prefer.
Both leave the DB and Storage bucket in the same state.

### Option A — Supabase dashboard only (no CLI)

1. Upload the six PNGs from `assets/images/` to the
   `wedding-guide-images` bucket in the Supabase dashboard, once
   into each of two folders (multi-select all six from your local
   `assets/images/` to do each folder in one shot):
   - `a0000000-0000-0000-0000-000000000001/`  (N&N SaaS)
   - `a0000000-0000-0000-0000-000000000002/`  (Emma & James)
2. Open `supabase/seed_nn_ej_switzerland_guide.sql`, replace every
   `<SUPABASE_URL>` with your project URL (e.g.
   `https://xxxxxxxx.supabase.co`), paste the whole file into the
   SQL Editor and Run.

### Option B — Node script (uploads + row upsert in one command)

Run once per Supabase project, from the repo root:

```sh
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  node supabase/scripts/migrate_legacy_travel_photos.mjs
```

Default targets both SaaS-project tenants — N&N (SaaS) and Emma &
James. To run against the original single-tenant N&N project instead,
point the env vars at that project and pass
`TARGETS=00000000-0000-0000-0000-000000000001`. Comma-separate for
multiple ids.

Prereqs:
- Migration 027 (`wedding_guides` table) applied.
- Migration 031 (`wedding-guide-images` bucket) applied.
- `@supabase/supabase-js` installed (it's in `package.json`).

Idempotent — safe to re-run. Storage uploads use `upsert`; the
`wedding_guides` row upsert uses `ON CONFLICT DO UPDATE`. After it
completes, admins can add / remove / reorder photos from the app.

The Switzerland content the script writes into the row is a one-time
snapshot of `SWITZERLAND_FULL_GUIDE` (kept in
`switzerland_guide_data.json`). Once the migration has run the DB row
is the source of truth for those weddings — subsequent edits happen
in the app, not in that JSON.
