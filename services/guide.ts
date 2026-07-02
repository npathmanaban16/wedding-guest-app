import { supabase } from '@/lib/supabase';
import type { GuideSection, QuickFact, WeddingGuide } from '@/constants/weddingData';

interface WeddingGuideRow {
  wedding_id: string;
  page_title: string;
  page_subtitle_tag: string | null;
  page_subtitle: string | null;
  currency_code: string | null;
  filter_pills: string[] | null;
  sections: GuideSection[] | null;
  quick_facts: QuickFact[] | null;
  photo_strip: GuidePhotoRow[] | null;
}

// Persisted shape for one photo-strip entry — same field names used
// by the wedding_guides.photo_strip jsonb column. `label` is the caption
// shown under the image on the destination tab.
export interface GuidePhotoRow {
  url: string;
  label: string;
}

const COLUMNS =
  'wedding_id, page_title, page_subtitle_tag, page_subtitle, currency_code, filter_pills, sections, quick_facts, photo_strip';

export async function fetchWeddingGuide(weddingId: string): Promise<WeddingGuide | null> {
  const { data, error } = await supabase
    .from('wedding_guides')
    .select(COLUMNS)
    .eq('wedding_id', weddingId)
    .maybeSingle<WeddingGuideRow>();
  if (error) throw error;
  if (!data) return null;
  return rowToWeddingGuide(data);
}

function rowToWeddingGuide(row: WeddingGuideRow): WeddingGuide {
  return {
    pageTitle: row.page_title,
    pageSubtitleTag: row.page_subtitle_tag ?? undefined,
    pageSubtitle: row.page_subtitle ?? undefined,
    currencyCode: row.currency_code ?? undefined,
    filterPills: row.filter_pills ?? ['All'],
    sections: row.sections ?? [],
    quickFacts: row.quick_facts ?? [],
    photoStrip: (row.photo_strip ?? []).map((p) => ({
      source: { uri: p.url },
      label: p.label,
    })),
  };
}

// ─── Photo strip admin helpers ─────────────────────────────────────────────
// Uploads / deletes to the `wedding-guide-images` storage bucket
// (migration 031) and persists the ordered list back to the
// `wedding_guides.photo_strip` jsonb column.
//
// A tenant with no wedding_guides row yet — legacy N&N + Emma & James
// fall back to the SWITZERLAND_FULL_GUIDE constant instead — can't have
// their photo strip edited from the admin UI. Callers should check for
// the row's presence before offering the editor. New tenants (Arjun & Ila
// and beyond) always have a row from the seed.

const GUIDE_IMAGES_BUCKET = 'wedding-guide-images';

// Uploads a photo to the guide bucket and returns its public URL. Path
// convention matches the other wedding-scoped buckets:
// `<wedding_id>/<timestamp>-<random>.<ext>`. Callers are expected to
// then write the URL into the photo_strip list via
// updateWeddingGuidePhotoStrip.
export async function uploadWeddingGuideImage(
  weddingId: string,
  localUri: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split('/')[1]?.toLowerCase() || 'jpg';
  const rand = Math.random().toString(36).slice(2, 8);
  const filename = `${Date.now()}-${rand}.${ext}`;
  const path = `${weddingId}/${filename}`;

  const arrayBuffer = await fetch(localUri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from(GUIDE_IMAGES_BUCKET)
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(GUIDE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Deletes a previously uploaded guide photo from the bucket, given the
// public URL that was stored on wedding_guides.photo_strip. No-op when
// the URL points at anything else (e.g. an externally hosted image).
export async function deleteWeddingGuideImage(publicUrl: string): Promise<void> {
  const marker = `/object/public/${GUIDE_IMAGES_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;
  const { error } = await supabase.storage.from(GUIDE_IMAGES_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

// Overwrites the ordered photo_strip array on the tenant's wedding_guides
// row with the given list. Full-replace (not partial) because the client
// already holds the intended full ordered state — matches how similar
// jsonb columns on this schema are updated elsewhere.
export async function updateWeddingGuidePhotoStrip(
  weddingId: string,
  photoStrip: GuidePhotoRow[],
): Promise<void> {
  const { error } = await supabase
    .from('wedding_guides')
    .update({ photo_strip: photoStrip })
    .eq('wedding_id', weddingId);
  if (error) throw error;
}
