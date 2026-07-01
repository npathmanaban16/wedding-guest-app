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
