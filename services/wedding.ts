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
  // Feature flags (App Features admin screen). Missing/undefined on
  // databases that predate migrations 038–040 — consumers treat anything
  // that isn't exactly `false` as enabled.
  // When false, hides the Attendees tab (Messages) and the guest profile
  // editor (My Details).
  attendees_enabled?: boolean | null;
  // When false, hides the guest Chat tab (Messages).
  chat_enabled?: boolean | null;
  // When false, guests are never redirected into the first-login
  // onboarding (arrival details) form.
  onboarding_enabled?: boolean | null;
  // When false, the floating "Ask" AI assistant FAB is hidden across
  // every tab. Past Q&A history stays intact and reappears when the
  // flag is turned back on.
  ai_enabled?: boolean | null;
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

export type AdminRole = 'planner' | 'dj' | 'makeup_artist' | 'henna_artist';

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

// Column list before migrations 038–040 + 044 — kept as a fallback
// select so an un-migrated database still loads the app (the feature
// flags come back undefined, which consumers read as "enabled").
// 038–040 + 044 should be applied together: if only some are present,
// the primary select still errors on the missing column and this
// fallback drops all the flags.
const WEDDING_COLUMNS_PRE_038 =
  'id, invite_code, couple_names, wedding_date, location, destination_city, hashtag, website, contact_email, registry_url, hero_image_url, theme_color, planner_name, photo_album_url';

const WEDDING_COLUMNS = `${WEDDING_COLUMNS_PRE_038}, attendees_enabled, chat_enabled, onboarding_enabled, ai_enabled`;

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
  patch: {
    attendees_enabled?: boolean;
    chat_enabled?: boolean;
    onboarding_enabled?: boolean;
    ai_enabled?: boolean;
  },
): Promise<void> {
  const update: Record<string, boolean> = {};
  if (patch.attendees_enabled !== undefined) update.attendees_enabled = patch.attendees_enabled;
  if (patch.chat_enabled !== undefined) update.chat_enabled = patch.chat_enabled;
  if (patch.onboarding_enabled !== undefined) update.onboarding_enabled = patch.onboarding_enabled;
  if (patch.ai_enabled !== undefined) update.ai_enabled = patch.ai_enabled;
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

// Admin write path for the guest-groups spreadsheet — flips a single
// guest's is_wedding_party flag. Sits alongside the group-membership
// writes since the "Wedding Party" default column in the spreadsheet
// syncs both dimensions so the legacy flag stays lined up with the
// group (which schedule + packing already read through).
export async function setGuestWeddingParty(
  weddingId: string,
  canonicalName: string,
  value: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({ is_wedding_party: value })
    .eq('wedding_id', weddingId)
    .eq('canonical_name', canonicalName);
  if (error) throw error;
}

// Admin write path for the guest-groups spreadsheet — sets a single
// guest's gender to male / female / null (unknown). The gender columns
// are radio-style: clicking a cell either picks that value or clears
// back to null if it was already selected.
export async function setGuestGender(
  weddingId: string,
  canonicalName: string,
  gender: Gender | null,
): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({ gender })
    .eq('wedding_id', weddingId)
    .eq('canonical_name', canonicalName);
  if (error) throw error;
}

// Bulk guest-flag write for CSV import. Combines is_wedding_party +
// gender updates into a single row-scoped statement so importing 100
// changed attendees takes 100 writes rather than 200. Fields left
// undefined are not touched.
export async function bulkUpdateGuestFlags(
  weddingId: string,
  canonicalName: string,
  patch: { is_wedding_party?: boolean; gender?: Gender | null },
): Promise<void> {
  const update: Record<string, boolean | Gender | null> = {};
  if (patch.is_wedding_party !== undefined) update.is_wedding_party = patch.is_wedding_party;
  if (patch.gender !== undefined) update.gender = patch.gender;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase
    .from('guests')
    .update(update)
    .eq('wedding_id', weddingId)
    .eq('canonical_name', canonicalName);
  if (error) throw error;
}

// Full guest removal — deletes them from public.guests plus every
// related table that doesn't cascade automatically. Used by the
// Guest Groups & Access sheet when an admin marks someone as not
// attending (last-minute drop, etc.).
//
// Cascade coverage:
//   guest_group_members — CASCADE via the composite FK on
//                         (wedding_id, canonical_name) (migration 041)
// Manually cleaned here (no guest-scoped FK on these tables):
//   guest_info, packing_checklist, song_requests, notifications
//   (only chat messages sent by the guest — admin-sent messages carry
//   the couple/planner label in `sender`, not the guest's canonical
//   name, so those stay), notification_reactions, notification_replies,
//   ai_questions.
//
// Not touched (out of scope for this pass):
//   * Storage buckets (message-images, guest-profile-images) — the
//     public URLs on any deleted notifications become orphan blobs.
//     Cleaning storage is a separate lifecycle concern; leaving the
//     files behind is safer than accidentally removing an unrelated
//     admin's uploaded photo that happened to share a filename.
//   * push_token on guest_info — deleted along with the row.
export async function deleteGuest(
  weddingId: string,
  canonicalName: string,
): Promise<void> {
  // Delete auxiliary rows first. Ordering doesn't matter functionally
  // since none of these have inter-table FKs; running them in parallel
  // via Promise.all keeps the round-trip short. Any single failure
  // throws — the caller shows the error and the guest stays on the
  // sheet.
  await Promise.all([
    supabase
      .from('guest_info')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('guest_name', canonicalName),
    supabase
      .from('packing_checklist')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('guest_name', canonicalName),
    supabase
      .from('notifications')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('sender', canonicalName),
    supabase
      .from('notification_reactions')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('guest_name', canonicalName),
    supabase
      .from('notification_replies')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('guest_name', canonicalName),
    supabase
      .from('song_requests')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('requested_by', canonicalName),
    supabase
      .from('ai_questions')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('guest_name', canonicalName),
  ]);
  // Finally the guests row itself; the composite FK on
  // guest_group_members takes care of memberships via CASCADE.
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('canonical_name', canonicalName);
  if (error) throw error;
}

// Bulk insert of new guests, used by the CSV importer when the admin
// opts in to creating attendees for unknown names in the file (the
// initial-upload flow for a fresh wedding). Skips names that already
// exist via ON CONFLICT DO NOTHING so partial retries after a
// network hiccup don't error. Returns every attempted row shaped as
// GuestRow so the caller can splice them into the in-memory attendees
// list without a refetch.
export async function createGuestsBulk(
  weddingId: string,
  guests: {
    canonicalName: string;
    isWeddingParty: boolean;
    gender: Gender | null;
  }[],
): Promise<GuestRow[]> {
  if (guests.length === 0) return [];
  const rows = guests.map((g) => ({
    wedding_id: weddingId,
    canonical_name: g.canonicalName,
    is_wedding_party: g.isWeddingParty,
    gender: g.gender,
  }));
  const { data, error } = await supabase
    .from('guests')
    .upsert(rows, { onConflict: 'wedding_id,canonical_name', ignoreDuplicates: true })
    .select('canonical_name, is_wedding_party, is_bridal_party, gender, profile_photo_url, bio, is_couple, wedding_party_role');
  if (error) throw error;
  // Postgrest returns `null` for the select when ignoreDuplicates is
  // set and every row conflicted; treat that as an empty result.
  return (data as GuestRow[] | null) ?? [];
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
