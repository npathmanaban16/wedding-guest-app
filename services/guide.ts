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
  photo_strip: { url: string; label: string }[] | null;
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
