#!/usr/bin/env node
// ============================================================
// Migrate legacy travel photos into wedding_guides
// ============================================================
// One-time bootstrap that promotes N&N and Emma & James from the
// bundled SWITZERLAND_FULL_GUIDE constant to the same DB-backed
// wedding_guides row that Arjun & Ila already have — so the admin
// "Travel Photos" editor works for them too.
//
// For each target wedding it:
//   1. Uploads the six PNGs from assets/images/ to the
//      wedding-guide-images bucket at
//      `<wedding_id>/legacy-<filename>` (upsert, so re-running is safe)
//   2. Upserts the wedding_guides row with all Switzerland content
//      (title/subtitle/sections/quick facts/filter pills) from
//      switzerland_guide_data.json plus the six uploaded photo URLs
//
// Prereqs (all one-time):
//   * Migration 027 (wedding_guides table)  applied
//   * Migration 031 (wedding-guide-images)  applied
//   * @supabase/supabase-js installed        (already in package.json)
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//     node supabase/scripts/migrate_legacy_travel_photos.mjs
//
// By default it targets both SaaS-project tenants (N&N SaaS + Emma &
// James). To run against the single-tenant N&N project instead, point
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY at that project and pass
// TARGETS=00000000-0000-0000-0000-000000000001. Multiple ids are
// comma-separated.
//
// Idempotent: safe to re-run — storage uploads use upsert, the
// wedding_guides upsert uses ON CONFLICT DO UPDATE.
// ============================================================

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const ASSETS_DIR = join(REPO_ROOT, 'assets', 'images');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.',
  );
  process.exit(1);
}

// Default targets are the two SaaS-project tenants. Override with the
// TARGETS env var to run against a different project (e.g. the
// single-tenant N&N project uses id 00000000-0000-0000-0000-000000000001).
const TARGETS = (process.env.TARGETS ?? [
  'a0000000-0000-0000-0000-000000000001', // N&N in SaaS/Tetherly schema
  'a0000000-0000-0000-0000-000000000002', // Emma & James (SaaS demo)
].join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const BUCKET = 'wedding-guide-images';
const DATA_FILE = join(HERE, 'switzerland_guide_data.json');
const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function uploadPhoto(weddingId, file) {
  const path = `${weddingId}/legacy-${file}`;
  const buffer = readFileSync(join(ASSETS_DIR, file));
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`upload ${file}: ${error.message}`);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

async function seedWedding(weddingId) {
  console.log(`\n→ ${weddingId}`);

  const photoStrip = [];
  for (const p of data.photos) {
    process.stdout.write(`   uploading ${p.file} ... `);
    const url = await uploadPhoto(weddingId, p.file);
    photoStrip.push({ url, label: p.label });
    console.log('OK');
  }

  process.stdout.write('   upserting wedding_guides row ... ');
  const { error } = await supabase.from('wedding_guides').upsert(
    {
      wedding_id: weddingId,
      page_title: data.pageTitle,
      page_subtitle_tag: data.pageSubtitleTag,
      page_subtitle: data.pageSubtitle,
      currency_code: data.currencyCode,
      filter_pills: data.filterPills,
      sections: data.sections,
      quick_facts: data.quickFacts,
      photo_strip: photoStrip,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wedding_id' },
  );
  if (error) throw new Error(`upsert row: ${error.message}`);
  console.log('OK');
}

async function main() {
  console.log(
    `Migrating travel photos for ${TARGETS.length} wedding(s) against ${SUPABASE_URL}`,
  );
  for (const id of TARGETS) {
    await seedWedding(id);
  }
  console.log('\nDone. Open the app as an admin → Edit App Content → Travel Photos.');
}

main().catch((err) => {
  console.error(`\nMigration failed: ${err.message ?? err}`);
  process.exit(1);
});
