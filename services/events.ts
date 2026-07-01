import { supabase } from '@/lib/supabase';
import type { WeddingEvent } from '@/constants/weddingData';

// Raw row shape from public.wedding_events. Mirrors the column names from
// migration 026. Kept exported so the resolver in WeddingContext can tell
// "no rows" (length 0) from a fetch failure.
export interface WeddingEventRow {
  wedding_id: string;
  event_id: string;
  sort_order: number;
  title: string;
  emoji: string | null;
  date_label: string;
  time_label: string;
  venue: string;
  address: string;
  dress_code: string | null;
  description: string;
  notes: string | null;
  wedding_party_only: boolean;
  start_at: string;
  end_at: string | null;
  outdoor_note: string | null;
  extras: WeddingEventExtras | null;
}

// Optional "rich" fields collapsed into one jsonb column so that adding a
// new optional field doesn't require a schema migration. Shape mirrors the
// optional fields on WeddingEvent.
export interface WeddingEventExtras {
  colorPalette?: { name: string; hex: string }[];
  indianAttire?: { forWomen: string[]; forMen: string[] };
  blackTieGuide?: { men: string; women: string };
}

const COLUMNS =
  'wedding_id, event_id, sort_order, title, emoji, date_label, time_label, venue, address, dress_code, description, notes, wedding_party_only, start_at, end_at, outdoor_note, extras';

export async function fetchWeddingEvents(weddingId: string): Promise<WeddingEvent[]> {
  const { data, error } = await supabase
    .from('wedding_events')
    .select(COLUMNS)
    .eq('wedding_id', weddingId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToWeddingEvent);
}

function rowToWeddingEvent(row: WeddingEventRow): WeddingEvent {
  const extras = row.extras ?? {};
  return {
    id: row.event_id,
    title: row.title,
    emoji: row.emoji ?? '',
    date: row.date_label,
    time: row.time_label,
    venue: row.venue,
    address: row.address,
    dressCode: row.dress_code ?? '',
    description: row.description,
    notes: row.notes ?? undefined,
    weddingPartyOnly: row.wedding_party_only,
    startDate: row.start_at,
    endDate: row.end_at ?? undefined,
    outdoorNote: row.outdoor_note ?? undefined,
    colorPalette: extras.colorPalette,
    indianAttire: extras.indianAttire,
    blackTieGuide: extras.blackTieGuide,
  };
}
