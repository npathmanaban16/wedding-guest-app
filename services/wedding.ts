import { supabase } from '@/lib/supabase';

export type Gender = 'male' | 'female';

export interface WeddingRow {
  id: string;
  invite_code: string;
  couple_names: string;
  wedding_date: string;
  location: string;
  destination_city: string;
  hashtag: string | null;
  website: string | null;
  contact_email: string | null;
  registry_url: string | null;
  hero_image_url: string | null;
  theme_color: string | null;
}

export interface GuestRow {
  canonical_name: string;
  is_wedding_party: boolean;
  gender: Gender | null;
}

export interface AdminRow {
  guest_name: string;
}

const WEDDING_COLUMNS =
  'id, invite_code, couple_names, wedding_date, location, destination_city, hashtag, website, contact_email, registry_url, hero_image_url, theme_color';

export async function fetchWedding(weddingId: string): Promise<WeddingRow | null> {
  const { data, error } = await supabase
    .from('weddings')
    .select(WEDDING_COLUMNS)
    .eq('id', weddingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Invite codes are stored as-entered; normalize to upper for lookup so guests
// can type "abc123" and still match a stored "ABC123".
export async function fetchWeddingByInviteCode(inviteCode: string): Promise<WeddingRow | null> {
  const code = inviteCode.trim().toUpperCase();
  if (!code) return null;
  const { data, error } = await supabase
    .from('weddings')
    .select(WEDDING_COLUMNS)
    .eq('invite_code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchGuests(weddingId: string): Promise<GuestRow[]> {
  const { data, error } = await supabase
    .from('guests')
    .select('canonical_name, is_wedding_party, gender')
    .eq('wedding_id', weddingId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdmins(weddingId: string): Promise<AdminRow[]> {
  const { data, error } = await supabase
    .from('wedding_admins')
    .select('guest_name')
    .eq('wedding_id', weddingId);
  if (error) throw error;
  return data ?? [];
}

export interface ResolvedWedding {
  wedding: WeddingRow;
  guests: GuestRow[];
  admins: AdminRow[];
}

// Full bundle needed to validate a guest name on the invite screen before
// persisting session state. Returns null if the invite code doesn't match
// any wedding so callers can show an error.
export async function resolveWeddingByInviteCode(
  inviteCode: string,
): Promise<ResolvedWedding | null> {
  const wedding = await fetchWeddingByInviteCode(inviteCode);
  if (!wedding) return null;
  const [guests, admins] = await Promise.all([
    fetchGuests(wedding.id),
    fetchAdmins(wedding.id),
  ]);
  return { wedding, guests, admins };
}
