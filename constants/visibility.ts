import type { PackingItem, WeddingEvent } from './weddingData';

// ============================================================
// VISIBILITY FILTERS
// ============================================================
// Single source of truth for "should this event / packing item show
// to this guest?". Consumed by the schedule screen, the home-tab
// featured-event picker, the packing screen, and the AI assistant so
// they can't drift apart.
//
// Design (locked in with product):
//   * Group filter is include-only. When visibleToGroups /
//     visible_to_groups is non-empty, the guest must be in at least
//     one of the referenced groups. When empty/omitted, no group gating.
//   * Legacy boolean flags (weddingPartyOnly, bridalPartyOnly,
//     excludeBridalParty, excludeWeddingParty, gender) stay in force
//     as an AND filter alongside the group check. Anything hidden by
//     the old flags is still hidden by them; anything hidden by the
//     new group check is hidden even if the legacy flags would have
//     shown it. Nothing is silently loosened.
//
// A hidden item can be revived by removing BOTH the legacy flag and
// the group entry — matching what an admin editor would expose.

interface EventVisibilityContext {
  inWeddingParty: boolean;
  // Set of guest_groups.id values the current user belongs to. Passed
  // as a Set so the "is user in any referenced group?" check is O(1)
  // per event / item.
  userGroupIds: ReadonlySet<string>;
}

interface PackingItemVisibilityContext extends EventVisibilityContext {
  inBridalParty: boolean;
  gender: 'male' | 'female' | null;
}

export function isEventVisible(
  event: WeddingEvent,
  { inWeddingParty, userGroupIds }: EventVisibilityContext,
): boolean {
  const groups = event.visibleToGroups;
  if (groups && groups.length > 0) {
    if (!groups.some((gid) => userGroupIds.has(gid))) return false;
  }
  if (event.weddingPartyOnly && !inWeddingParty) return false;
  return true;
}

export function isPackingItemVisible(
  item: PackingItem,
  { inWeddingParty, inBridalParty, gender, userGroupIds }: PackingItemVisibilityContext,
): boolean {
  const groups = item.visible_to_groups;
  if (groups && groups.length > 0) {
    if (!groups.some((gid) => userGroupIds.has(gid))) return false;
  }
  if (item.weddingPartyOnly && !inWeddingParty) return false;
  if (item.bridalPartyOnly && !inBridalParty) return false;
  if (item.excludeBridalParty && inBridalParty) return false;
  if (item.excludeWeddingParty && inWeddingParty) return false;
  // Unknown gender sees everything — matches the pre-groups behavior
  // and pairs with the planned AI-gender-inference follow-up.
  if (item.gender && gender && item.gender !== gender) return false;
  return true;
}
