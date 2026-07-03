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
  // Guest_groups.id values. When non-empty, only guests in one of these
  // groups see the event; combined with wedding_party_only as an AND
  // filter so both remain enforceable at once. Added by migration 042.
  visible_to_groups: string[];
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

// New column list including visible_to_groups (migration 042). Retry with
// the pre-042 list on unknown-column so an un-migrated database still
// loads events — visible_to_groups falls back to [] and the client
// filter behaves exactly as it did before.
const COLUMNS_PRE_042 =
  'wedding_id, event_id, sort_order, title, emoji, date_label, time_label, venue, address, dress_code, description, notes, wedding_party_only, start_at, end_at, outdoor_note, extras';
const COLUMNS = `${COLUMNS_PRE_042}, visible_to_groups`;

export async function fetchWeddingEvents(weddingId: string): Promise<WeddingEvent[]> {
  const query = (columns: string) =>
    supabase
      .from('wedding_events')
      .select(columns)
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true });
  let { data, error } = await query(COLUMNS);
  if (error) ({ data, error } = await query(COLUMNS_PRE_042));
  if (error) throw error;
  // Supabase's typed select can't infer a shape from a runtime string,
  // so `data` comes back as unknown[]. The two column lists above are
  // both compatible with WeddingEventRow (visible_to_groups is
  // optional at runtime via the fallback in rowToWeddingEvent), so a
  // cast is safe.
  const rows = (data ?? []) as unknown as WeddingEventRow[];
  return rows.map(rowToWeddingEvent);
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
    // Falls back to [] for un-migrated databases so the client filter's
    // "empty means no group gating" branch takes over cleanly.
    visibleToGroups: row.visible_to_groups ?? [],
    startDate: row.start_at,
    endDate: row.end_at ?? undefined,
    outdoorNote: row.outdoor_note ?? undefined,
    colorPalette: extras.colorPalette,
    indianAttire: extras.indianAttire,
    blackTieGuide: extras.blackTieGuide,
  };
}
