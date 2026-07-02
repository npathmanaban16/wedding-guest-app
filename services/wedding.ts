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
  planner_name: string | null;
  photo_album_url: string | null;
  // Feature flag: when false the Attendees tab (Messages screen) and the
  // guest profile editor (My Details) are hidden. Missing/undefined on
  // databases that predate migration 038 — consumers treat anything that
  // isn't exactly `false` as enabled.
  attendees_enabled?: boolean | null;
}

export interface GuestRow {
  canonical_name: string;
  is_wedding_party: boolean;
  // Bridesmaids/bridesman — subset of the wedding party with extra
  // packing items.
  is_bridal_party: boolean;
  gender: Gender | null;
  // Optional profile picture URL (from the guest-profile-images bucket).
  // Null falls back to initials in the Attendees directory.
  profile_photo_url: string | null;
  // Optional short "how I know the couple" bio shown on the guest's
  // Attendees card.
  bio: string | null;
  // True for the two rows representing the couple getting married. Used
  // by the Attendees directory to hide the couple from the "who's here"
  // list (they aren't attending as guests).
  is_couple: boolean;
  // Free-text role identifying WHY someone is in the wedding party.
  // See migration 036 for suggested values ('bridesmaid', 'groomsman',
  // 'family', 'partner'). Null means "no role set" — legacy rows fall
  // through to the "show badge if is_wedding_party" backward-compat
  // path in the Attendees directory. 'partner' explicitly suppresses
  // the badge so spouses of party members aren't labeled Wedding
  // party while still keeping is_wedding_party access.
  wedding_party_role: string | null;
}

export type AdminRole = 'planner' | 'dj' | 'makeup_artist';

export interface AdminRow {
  guest_name: string;
  // Optional per-admin gating; only consulted when the admin isn't also
  // in public.guests (see WeddingContext).
  is_wedding_party: boolean;
  gender: Gender | null;
  // Optional vendor-style role. Admins with no role (or 'planner') get
  // full admin powers; vendor roles like 'dj' are login-only.
  role: AdminRole | null;
}

// Column list before migration 038 — kept as a fallback select so an
// un-migrated database still loads the app (attendees_enabled comes back
// undefined, which consumers read as "enabled").
const WEDDING_COLUMNS_PRE_038 =
  'id, invite_code, couple_names, wedding_date, location, destination_city, hashtag, website, contact_email, registry_url, hero_image_url, theme_color, planner_name, photo_album_url';

const WEDDING_COLUMNS = `${WEDDING_COLUMNS_PRE_038}, attendees_enabled`;

async function selectWedding(
  column: 'id' | 'invite_code',
  value: string,
): Promise<WeddingRow | null> {
  const query = (columns: string) =>
    supabase.from('weddings').select(columns).eq(column, value).maybeSingle();
  let { data, error } = await query(WEDDING_COLUMNS);
  // Unknown-column error before migration 038 — retry with the legacy list.
  if (error) ({ data, error } = await query(WEDDING_COLUMNS_PRE_038));
  if (error) throw error;
  return data as WeddingRow | null;
}

export async function fetchWedding(weddingId: string): Promise<WeddingRow | null> {
  return selectWedding('id', weddingId);
}

// Invite codes are stored as-entered; normalize to upper for lookup so guests
// can type "abc123" and still match a stored "ABC123".
export async function fetchWeddingByInviteCode(inviteCode: string): Promise<WeddingRow | null> {
  const code = inviteCode.trim().toUpperCase();
  if (!code) return null;
  return selectWedding('invite_code', code);
}

// Admin-only: persists per-wedding feature flags from the App Features
// screen. Fields left undefined aren't touched.
export async function updateWeddingSettings(
  weddingId: string,
  patch: { attendees_enabled?: boolean },
): Promise<void> {
  const update: Record<string, boolean> = {};
  if (patch.attendees_enabled !== undefined) update.attendees_enabled = patch.attendees_enabled;
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from('weddings')
    .update(update)
    .eq('id', weddingId);
  if (error) throw error;
}

export async function fetchGuests(weddingId: string): Promise<GuestRow[]> {
  const { data, error } = await supabase
    .from('guests')
    .select('canonical_name, is_wedding_party, is_bridal_party, gender, profile_photo_url, bio, is_couple, wedding_party_role')
    .eq('wedding_id', weddingId);
  if (error) throw error;
  return data ?? [];
}

// Updates the profile-picture URL and/or bio for a single guest. Fields
// left undefined by the caller aren't touched; null clears the value.
export async function updateGuestProfile(
  weddingId: string,
  canonicalName: string,
  patch: { profile_photo_url?: string | null; bio?: string | null },
): Promise<void> {
  const update: Record<string, string | null> = {};
  if (patch.profile_photo_url !== undefined) update.profile_photo_url = patch.profile_photo_url;
  if (patch.bio !== undefined) update.bio = patch.bio;
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from('guests')
    .update(update)
    .eq('wedding_id', weddingId)
    .eq('canonical_name', canonicalName);
  if (error) throw error;
}

export async function fetchAdmins(weddingId: string): Promise<AdminRow[]> {
  const { data, error } = await supabase
    .from('wedding_admins')
    .select('guest_name, is_wedding_party, gender, role')
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
