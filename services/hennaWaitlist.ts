import { supabase } from '@/lib/supabase';

// Max active spots (waiting + in_progress) a single guest can hold
// via their added_by field. Prevents a bored guest from stacking the
// queue with their whole family from one account. Enforced at the
// service layer since the RLS policies stay permissive.
export const MAX_SPOTS_PER_GUEST = 3;

export type HennaStatus =
  | 'waiting'
  | 'in_progress'
  | 'done'
  | 'skipped'
  | 'cancelled';

export interface HennaStationRow {
  wedding_id: string;
  is_open: boolean;
  display_name: string | null;
  updated_at: string;
}

export interface HennaWaitlistEntry {
  id: string;
  wedding_id: string;
  guest_name: string;
  added_by: string;
  status: HennaStatus;
  served_by: string | null;
  joined_at: string;
  started_at: string | null;
  finished_at: string | null;
}

// ─── Station ─────────────────────────────────────────────────────
// The station row is a per-wedding singleton (PK = wedding_id). It
// may not exist for a wedding that hasn't opted into the feature —
// callers treat null as "closed, no display name". Toggling open
// upserts so the artist can flip it on for a wedding that never
// had a row.

export async function fetchStation(weddingId: string): Promise<HennaStationRow | null> {
  const { data, error } = await supabase
    .from('henna_stations')
    .select('wedding_id, is_open, display_name, updated_at')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error) throw error;
  return (data as HennaStationRow | null) ?? null;
}

export async function setStationOpen(
  weddingId: string,
  isOpen: boolean,
  displayName?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = {
    wedding_id: weddingId,
    is_open: isOpen,
    updated_at: new Date().toISOString(),
  };
  if (displayName !== undefined) patch.display_name = displayName;
  const { error } = await supabase
    .from('henna_stations')
    .upsert(patch, { onConflict: 'wedding_id' });
  if (error) throw error;
}

// ─── Waitlist reads ──────────────────────────────────────────────
// Returns every row that isn't terminated (waiting or in_progress),
// ordered by joined_at ascending. Terminated rows (done, skipped,
// cancelled) stay in the DB for history but are excluded from the
// live queue view — the artist screen shows a small "past" section
// if it wants them via fetchRecentCompleted.

export async function fetchActiveEntries(weddingId: string): Promise<HennaWaitlistEntry[]> {
  const { data, error } = await supabase
    .from('henna_waitlist')
    .select('id, wedding_id, guest_name, added_by, status, served_by, joined_at, started_at, finished_at')
    .eq('wedding_id', weddingId)
    .in('status', ['waiting', 'in_progress'])
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data as HennaWaitlistEntry[] | null) ?? [];
}

// ─── Join / cancel (guest actions) ───────────────────────────────

export interface JoinResult {
  ok: true;
  entry: HennaWaitlistEntry;
}
export interface JoinRejection {
  ok: false;
  reason: 'closed' | 'cap_reached' | 'duplicate';
}

// `addedBy` is the logged-in guest tapping the button. `guestName`
// is who's actually getting henna — may equal addedBy (signing self
// up) or be a family member's name typed in a modal. Both are
// stored so the pings can route back to the addedBy device and the
// queue display can label who the sign-up is for.
//
// Enforces the 3-spot cap against addedBy so a family member's
// sign-up counts toward the person who did it. The check is racy
// against a concurrent second tap, but the worst case is a 4th
// entry that the artist can just skip.
export async function joinWaitlist(
  weddingId: string,
  addedBy: string,
  guestName: string,
): Promise<JoinResult | JoinRejection> {
  const station = await fetchStation(weddingId);
  if (!station || !station.is_open) return { ok: false, reason: 'closed' };

  const active = await fetchActiveEntries(weddingId);
  const mine = active.filter((e) => e.added_by === addedBy);
  if (mine.length >= MAX_SPOTS_PER_GUEST) {
    return { ok: false, reason: 'cap_reached' };
  }
  // Block exact duplicates by (added_by, guest_name) to catch a
  // fat-finger double-tap. Different sign-ups for the same guest
  // by different family members are allowed — that's a coordination
  // problem the artist can resolve with a skip.
  const dupe = mine.some(
    (e) => e.guest_name.trim().toLowerCase() === guestName.trim().toLowerCase(),
  );
  if (dupe) return { ok: false, reason: 'duplicate' };

  const { data, error } = await supabase
    .from('henna_waitlist')
    .insert({
      wedding_id: weddingId,
      guest_name: guestName.trim(),
      added_by: addedBy,
    })
    .select('id, wedding_id, guest_name, added_by, status, served_by, joined_at, started_at, finished_at')
    .single();
  if (error || !data) throw error ?? new Error('Insert failed');
  return { ok: true, entry: data as HennaWaitlistEntry };
}

// Guest-initiated: cancel any of my active spots before I'm called.
// The artist screen uses `skipEntry` for their own "no show" flow.
export async function cancelEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('henna_waitlist')
    .update({ status: 'cancelled', finished_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('status', 'waiting');
  if (error) throw error;
}

// ─── Artist actions ──────────────────────────────────────────────
// startNext: pull the top-of-queue 'waiting' row into 'in_progress'
// assigned to the calling artist. Fires a "you're 2 away" push to
// whoever's newly at the top so they know to start walking over.
// Callers should refresh the local view after this returns.

export async function startEntry(
  weddingId: string,
  entryId: string,
  artistName: string,
): Promise<void> {
  const { error } = await supabase
    .from('henna_waitlist')
    .update({
      status: 'in_progress',
      served_by: artistName,
      started_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('status', 'waiting');
  if (error) throw error;

  // Fire the "you're 2 away" heads-up to whoever is now at the top
  // of the waiting queue. Best-effort — a failed push shouldn't
  // roll back the queue advance. Refetch the queue AFTER the update
  // above so the newly-started entry is out of the waiting slice.
  const active = await fetchActiveEntries(weddingId);
  const newTop = active.find((e) => e.status === 'waiting');
  if (newTop) {
    sendHennaPush(weddingId, newTop.added_by, {
      title: 'Henna line update',
      body: `${addressee(newTop)} you're 2 away — start heading toward the henna area.`,
    }).catch((err) => console.warn('[henna] 2-away push failed', err));
  }
}

// almostDone: no state change — fires the "come now" push to
// whoever's currently at the top of the waiting queue. The chair
// row stays in_progress; the artist hits `finishEntry` when they
// actually finish (usually a minute or two later).
export async function almostDoneAlert(weddingId: string): Promise<void> {
  await alertNextInLine(
    weddingId,
    (top) => `${addressee(top)} the person before you is almost done. Head to the henna chair now.`,
  );
}

// finishEntry: chair row → done. Also fires the "come now" push
// as a safety net for the case where the artist skipped Almost
// done — Start pings the person-after-next, not the person
// actually being pulled up, so without this ping the true next
// person might not know their turn came. If the artist DID hit
// Almost done a minute earlier, the top waiter gets a second
// nearly-identical push — mildly noisy but reliable, which we
// prefer for a live queue.
export async function finishEntry(weddingId: string, entryId: string): Promise<void> {
  const { error } = await supabase
    .from('henna_waitlist')
    .update({ status: 'done', finished_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('status', 'in_progress');
  if (error) throw error;
  await alertNextInLine(
    weddingId,
    (top) => `${addressee(top)} the person before you just finished. Head to the henna chair.`,
  );
}

// Shared "you're up next" push — finds the top of the waiting
// queue and pings their added_by device. Best-effort: swallows
// errors (a failed push shouldn't blow up the caller's queue
// mutation) and no-ops on an empty queue.
async function alertNextInLine(
  weddingId: string,
  bodyFor: (top: HennaWaitlistEntry) => string,
): Promise<void> {
  try {
    const active = await fetchActiveEntries(weddingId);
    const top = active.find((e) => e.status === 'waiting');
    if (!top) return;
    await sendHennaPush(weddingId, top.added_by, {
      title: 'Henna — you\'re up next',
      body: bodyFor(top),
    });
  } catch (err) {
    console.warn('[henna] next-in-line push failed', err);
  }
}

// skipEntry: any waiting row → skipped (no-show, guest wandered off,
// or artist wants a break and needs to bump this person). Kept in
// history with started_at=null so it's obvious it was never served.
export async function skipEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('henna_waitlist')
    .update({ status: 'skipped', finished_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('status', 'waiting');
  if (error) throw error;
}

// ─── Helpers ─────────────────────────────────────────────────────

// Push body starts with a personalized greeting when the added_by
// signed themselves up ("Priya, you're 2 away") or a plural reference
// when they added a family member ("Priya, Sara is 2 away"). Keeps
// the message clear when a parent tracked a kid's sign-up.
function addressee(entry: HennaWaitlistEntry): string {
  const first = entry.added_by.split(' ')[0];
  if (entry.guest_name.trim().toLowerCase() === entry.added_by.trim().toLowerCase()) {
    return `${first},`;
  }
  return `${first}, ${entry.guest_name} —`;
}

interface HennaPushPayload {
  title: string;
  body: string;
}

async function sendHennaPush(
  weddingId: string,
  guestName: string,
  payload: HennaPushPayload,
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-henna-push', {
    body: {
      weddingId,
      guestName,
      title: payload.title,
      body: payload.body,
    },
  });
  if (error) throw error;
}
