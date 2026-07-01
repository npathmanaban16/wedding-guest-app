import { supabase } from '@/lib/supabase';
import type { WeddingMapLegendItem, WeddingSchedulePage } from '@/constants/weddingData';

interface WeddingSchedulePageRow {
  wedding_id: string;
  venue_photo_url: string | null;
  venue_map_image_url: string | null;
  venue_map_title: string | null;
  venue_map_legend: WeddingMapLegendItem[] | null;
  timezone_note: string | null;
}

const COLUMNS =
  'wedding_id, venue_photo_url, venue_map_image_url, venue_map_title, venue_map_legend, timezone_note';

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
  // The map card only renders when there's something to show — an image,
  // some legend rows, or a custom title. Otherwise leave the card hidden.
  const hasMapContent = !!data.venue_map_image_url || legend.length > 0 || !!data.venue_map_title;

  return {
    venuePhoto: data.venue_photo_url ? { uri: data.venue_photo_url } : undefined,
    venueMap: hasMapContent
      ? {
          title: data.venue_map_title ?? 'Hotel Map',
          image: data.venue_map_image_url ? { uri: data.venue_map_image_url } : undefined,
          legend,
        }
      : undefined,
    timezoneNote: data.timezone_note ?? undefined,
  };
}
