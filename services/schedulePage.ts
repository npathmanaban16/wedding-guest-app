import { supabase } from '@/lib/supabase';
import type { WeddingMapLegendItem, WeddingSchedulePage } from '@/constants/weddingData';

interface WeddingSchedulePageRow {
  wedding_id: string;
  venue_photo_url: string | null;
  venue_map_image_urls: string[] | null;
  venue_map_title: string | null;
  venue_map_legend: WeddingMapLegendItem[] | null;
  timezone_note: string | null;
}

const COLUMNS =
  'wedding_id, venue_photo_url, venue_map_image_urls, venue_map_title, venue_map_legend, timezone_note';

export async function fetchWeddingSchedulePage(
  weddingId: string,
): Promise<WeddingSchedulePage | null> {
  const { data, error } = await supabase
    .from('wedding_schedule_pages')
    .select(COLUMNS)
    .eq('wedding_id', weddingId)
    .maybeSingle<WeddingSchedulePageRow>();
  if (error) throw error;
  if (!data) return null;

  const legend = data.venue_map_legend ?? [];
  const imageUrls = data.venue_map_image_urls ?? [];
  // The map card only renders when there's something to show — at least
  // one map image, some legend rows, or a custom title. Otherwise leave
  // the card hidden.
  const hasMapContent = imageUrls.length > 0 || legend.length > 0 || !!data.venue_map_title;

  return {
    venuePhoto: data.venue_photo_url ? { uri: data.venue_photo_url } : undefined,
    venueMap: hasMapContent
      ? {
          title: data.venue_map_title ?? 'Hotel Map',
          images: imageUrls.map((url) => ({ uri: url })),
          legend,
        }
      : undefined,
    timezoneNote: data.timezone_note ?? undefined,
  };
}
