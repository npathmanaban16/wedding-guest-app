import { supabase } from '@/lib/supabase';
import type { PackingCategory, WeddingPackingList } from '@/constants/weddingData';

interface WeddingPackingListRow {
  wedding_id: string;
  page_title: string;
  page_subtitle_tag: string | null;
  page_subtitle: string | null;
  completion_message: string | null;
  categories: PackingCategory[] | null;
  tip_footer: { title: string; text: string } | null;
}

const COLUMNS =
  'wedding_id, page_title, page_subtitle_tag, page_subtitle, completion_message, categories, tip_footer';

export async function fetchWeddingPackingList(
  weddingId: string,
): Promise<WeddingPackingList | null> {
  const { data, error } = await supabase
    .from('wedding_packing_lists')
    .select(COLUMNS)
    .eq('wedding_id', weddingId)
    .maybeSingle<WeddingPackingListRow>();
  if (error) throw error;
  if (!data) return null;
  return {
    pageTitle: data.page_title,
    pageSubtitleTag: data.page_subtitle_tag ?? undefined,
    pageSubtitle: data.page_subtitle ?? undefined,
    completionMessage: data.completion_message ?? undefined,
    categories: data.categories ?? [],
    tipFooter: data.tip_footer ?? undefined,
  };
}

// Admin write path — used by the packing-list editor. Full-replace
// (not partial-per-column) because the editor always holds the whole
// intended state client-side and writing the full row keeps the DB in
// lockstep with a single upsert. Assumes the tenant already has a row;
// callers should check hasEditablePackingList on WeddingContext before
// offering the editor.
export async function updateWeddingPackingList(
  weddingId: string,
  patch: {
    pageTitle: string;
    pageSubtitleTag: string | null;
    pageSubtitle: string | null;
    completionMessage: string | null;
    categories: PackingCategory[];
    tipFooter: { title: string; text: string } | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('wedding_packing_lists')
    .update({
      page_title: patch.pageTitle,
      page_subtitle_tag: patch.pageSubtitleTag,
      page_subtitle: patch.pageSubtitle,
      completion_message: patch.completionMessage,
      categories: patch.categories,
      tip_footer: patch.tipFooter,
      updated_at: new Date().toISOString(),
    })
    .eq('wedding_id', weddingId);
  if (error) throw error;
}
