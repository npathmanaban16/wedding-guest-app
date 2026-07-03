import { supabase } from '@/lib/supabase';

export interface GuestGroup {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  // Canonical names of every guest currently in this group. Loaded via a
  // second query in fetchGuestGroups so the admin UI can render membership
  // counts + chips in a single pass without a nested select.
  members: string[];
}

interface GuestGroupRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

interface GuestGroupMemberRow {
  group_id: string;
  guest_canonical_name: string;
}

// Loads every guest group for a wedding along with its member roster.
// Two-query approach (groups + members) keeps the join simple and lets
// callers reuse a single membership map if they need it separately.
export async function fetchGuestGroups(weddingId: string): Promise<GuestGroup[]> {
  const { data: groupRows, error: groupsError } = await supabase
    .from('guest_groups')
    .select('id, name, description, icon, sort_order')
    .eq('wedding_id', weddingId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (groupsError) throw groupsError;
  const groups = (groupRows ?? []) as GuestGroupRow[];
  if (groups.length === 0) return [];

  const { data: memberRows, error: membersError } = await supabase
    .from('guest_group_members')
    .select('group_id, guest_canonical_name')
    .eq('wedding_id', weddingId);
  if (membersError) throw membersError;
  const members = (memberRows ?? []) as GuestGroupMemberRow[];

  const membersByGroup = new Map<string, string[]>();
  for (const m of members) {
    const list = membersByGroup.get(m.group_id);
    if (list) list.push(m.guest_canonical_name);
    else membersByGroup.set(m.group_id, [m.guest_canonical_name]);
  }

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    icon: g.icon,
    sort_order: g.sort_order,
    members: (membersByGroup.get(g.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}

// Creates a new group and inserts its initial members in a single call.
// Sort order defaults to the largest existing sort_order + 1 so new groups
// land at the bottom of the list.
export async function createGuestGroup(
  weddingId: string,
  input: {
    name: string;
    description: string | null;
    icon: string | null;
    members: string[];
  },
): Promise<GuestGroup> {
  const { data: maxRow } = await supabase
    .from('guest_groups')
    .select('sort_order')
    .eq('wedding_id', weddingId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from('guest_groups')
    .insert({
      wedding_id: weddingId,
      name: input.name,
      description: input.description,
      icon: input.icon,
      sort_order: nextOrder,
    })
    .select('id, name, description, icon, sort_order')
    .single();
  if (insertError) throw insertError;
  const row = inserted as GuestGroupRow;

  if (input.members.length > 0) {
    const { error: memberError } = await supabase
      .from('guest_group_members')
      .insert(
        input.members.map((name) => ({
          group_id: row.id,
          wedding_id: weddingId,
          guest_canonical_name: name,
        })),
      );
    if (memberError) throw memberError;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sort_order: row.sort_order,
    members: [...input.members].sort((a, b) => a.localeCompare(b)),
  };
}

// Renames/updates the metadata of an existing group. Members are managed
// separately via updateGuestGroupMembers so the two writes stay atomic
// per intent.
export async function updateGuestGroupMetadata(
  groupId: string,
  patch: { name: string; description: string | null; icon: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('guest_groups')
    .update({
      name: patch.name,
      description: patch.description,
      icon: patch.icon,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId);
  if (error) throw error;
}

// Full-replace of a group's membership. Deletes rows for guests no longer
// in the set and inserts rows for anyone new. Doing it as delete-then-
// insert keeps the logic simple; the admin UI never expects granular
// timestamps on membership rows, so churning them is fine.
export async function updateGuestGroupMembers(
  groupId: string,
  weddingId: string,
  memberNames: string[],
): Promise<void> {
  const { data: existingRows, error: readError } = await supabase
    .from('guest_group_members')
    .select('guest_canonical_name')
    .eq('group_id', groupId);
  if (readError) throw readError;
  const existing = new Set((existingRows ?? []).map((r) => r.guest_canonical_name as string));
  const desired = new Set(memberNames);

  const toRemove = [...existing].filter((n) => !desired.has(n));
  const toAdd = [...desired].filter((n) => !existing.has(n));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('guest_group_members')
      .delete()
      .eq('group_id', groupId)
      .in('guest_canonical_name', toRemove);
    if (error) throw error;
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('guest_group_members')
      .insert(
        toAdd.map((name) => ({
          group_id: groupId,
          wedding_id: weddingId,
          guest_canonical_name: name,
        })),
      );
    if (error) throw error;
  }
}

export async function deleteGuestGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('guest_groups')
    .delete()
    .eq('id', groupId);
  if (error) throw error;
}

// Single-cell toggle for the spreadsheet admin view: add or remove one
// guest from one group. Kept as its own service call (rather than
// routing through updateGuestGroupMembers) so a single checkbox flip
// is one network round-trip, not two.
//
// Idempotent: an add on an existing membership no-ops via ON CONFLICT,
// a remove on a missing membership deletes zero rows.
export async function toggleGuestGroupMember(
  weddingId: string,
  groupId: string,
  canonicalName: string,
  include: boolean,
): Promise<void> {
  if (include) {
    const { error } = await supabase
      .from('guest_group_members')
      .upsert(
        {
          group_id: groupId,
          wedding_id: weddingId,
          guest_canonical_name: canonicalName,
        },
        { onConflict: 'group_id,guest_canonical_name' },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('guest_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('guest_canonical_name', canonicalName);
    if (error) throw error;
  }
}

// Bulk membership rewrite for a single group, used by the CSV importer.
// Deletes members that shouldn't be in the group anymore then inserts
// the ones that should — same delete-then-insert pattern as
// updateGuestGroupMembers but scoped to a caller-provided add/remove
// list so we don't need to refetch the current members first.
export async function bulkApplyGuestGroupMembership(
  weddingId: string,
  groupId: string,
  add: string[],
  remove: string[],
): Promise<void> {
  if (remove.length > 0) {
    const { error } = await supabase
      .from('guest_group_members')
      .delete()
      .eq('group_id', groupId)
      .in('guest_canonical_name', remove);
    if (error) throw error;
  }
  if (add.length > 0) {
    const { error } = await supabase
      .from('guest_group_members')
      .upsert(
        add.map((name) => ({
          group_id: groupId,
          wedding_id: weddingId,
          guest_canonical_name: name,
        })),
        { onConflict: 'group_id,guest_canonical_name' },
      );
    if (error) throw error;
  }
}

