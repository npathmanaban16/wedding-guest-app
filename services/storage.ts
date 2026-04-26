/**
 * Storage service — persists guest data to Supabase with AsyncStorage as a
 * local cache/fallback for offline use.
 *
 * Every Supabase call is scoped to a wedding_id. Callers pass the active
 * wedding_id in from WeddingContext; AsyncStorage cache keys are also
 * namespaced by wedding_id so the same device can safely attach to a
 * different wedding later without mixing data.
 *
 * Run supabase/schema.sql (or schema_saas.sql for the SaaS variant) then
 * the migrations in supabase/migrations/ before using the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const KEYS = {
  myInfo: (weddingId: string, name: string) => `@wedding_my_info_${weddingId}_${name}`,
  packingChecklist: (weddingId: string, name: string) =>
    `@wedding_packing_checklist_${weddingId}_${name}`,
  packingCustomItems: (weddingId: string, name: string) =>
    `@wedding_packing_custom_items_${weddingId}_${name}`,
  photos: (weddingId: string) => `@wedding_photos_${weddingId}`,
  onboarding: (weddingId: string, name: string) =>
    `@wedding_onboarding_done_${weddingId}_${name}`,
  messagesLastRead: (weddingId: string, name: string) =>
    `@wedding_messages_last_read_${weddingId}_${name}`,
};

// ─── My Info ─────────────────────────────────────────────────────────────────

export interface MyInfo {
  // Editable by guest
  hotel: string;
  checkIn: string;
  checkOut: string;
  arrivalTime: string;
  flightNumber: string;
  extraNotes: string;
  phone: string;
  email: string;
  // Pre-collected from RSVP (read-only in app)
  dietary: string;
  meal1: string;
  meal2: string;
  meal3: string;
}

const DEFAULT_MY_INFO: MyInfo = {
  hotel: '',
  checkIn: '',
  checkOut: '',
  arrivalTime: '',
  flightNumber: '',
  extraNotes: '',
  phone: '',
  email: '',
  dietary: '',
  meal1: '',
  meal2: '',
  meal3: '',
};

export async function getMyInfo(weddingId: string, guestName: string): Promise<MyInfo> {
  try {
    const { data, error } = await supabase
      .from('guest_info')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('guest_name', guestName)
      .maybeSingle();

    if (!error && data) {
      const info: MyInfo = {
        hotel: data.hotel ?? '',
        checkIn: data.check_in ?? '',
        checkOut: data.check_out ?? '',
        arrivalTime: data.arrival_time ?? '',
        flightNumber: data.flight_number ?? '',
        extraNotes: data.extra_notes ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        dietary: data.dietary ?? '',
        meal1: data.meal_1 ?? '',
        meal2: data.meal_2 ?? '',
        meal3: data.meal_3 ?? '',
      };
      await AsyncStorage.setItem(KEYS.myInfo(weddingId, guestName), JSON.stringify(info));
      return info;
    }
  } catch {
    // Network unavailable — fall through to local cache
  }

  const raw = await AsyncStorage.getItem(KEYS.myInfo(weddingId, guestName));
  if (!raw) return DEFAULT_MY_INFO;
  return { ...DEFAULT_MY_INFO, ...JSON.parse(raw) };
}

// Permanently removes every row this guest has written across the schema and
// drops their AsyncStorage cache. The `guests` / `wedding_admins` rows are
// left alone — those are the couple's invitation list, not user-authored
// data. After this runs the caller should sign the user out.
export async function deleteMyAccount(weddingId: string, guestName: string): Promise<void> {
  const results = await Promise.all([
    supabase.from('guest_info').delete().eq('wedding_id', weddingId).eq('guest_name', guestName),
    supabase.from('packing_checklist').delete().eq('wedding_id', weddingId).eq('guest_name', guestName),
    supabase.from('notification_reactions').delete().eq('wedding_id', weddingId).eq('guest_name', guestName),
    supabase.from('notification_replies').delete().eq('wedding_id', weddingId).eq('guest_name', guestName),
    supabase.from('song_requests').delete().eq('wedding_id', weddingId).eq('requested_by', guestName),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  await AsyncStorage.multiRemove([
    KEYS.myInfo(weddingId, guestName),
    KEYS.packingChecklist(weddingId, guestName),
    KEYS.onboarding(weddingId, guestName),
    KEYS.messagesLastRead(weddingId, guestName),
  ]);
}

export async function saveMyInfo(
  weddingId: string,
  guestName: string,
  info: MyInfo,
): Promise<void> {
  // Only update editable fields — dietary and meal choices are set by seed SQL
  await supabase.from('guest_info').upsert(
    {
      wedding_id: weddingId,
      guest_name: guestName,
      hotel: info.hotel,
      check_in: info.checkIn,
      check_out: info.checkOut,
      arrival_time: info.arrivalTime,
      flight_number: info.flightNumber,
      extra_notes: info.extraNotes,
      phone: info.phone,
      email: info.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wedding_id,guest_name' },
  );

  await AsyncStorage.setItem(KEYS.myInfo(weddingId, guestName), JSON.stringify(info));

  // Fire-and-forget email notification — silently ignore errors
  notifyCouple(weddingId, guestName, info).catch(() => {});
}

async function notifyCouple(weddingId: string, guestName: string, info: MyInfo): Promise<void> {
  // `extraNotes` is intentionally excluded here — it's emailed via the
  // explicit "Send" button in the Notes card (sendGuestMessage below),
  // so typing in that field doesn't noise-up the couple's inbox on every
  // auto-save.
  const lines = [
    `Guest: ${guestName}`,
    info.phone       ? `Phone: ${info.phone}`              : null,
    info.email       ? `Email: ${info.email}`              : null,
    ``,
    info.hotel       ? `Hotel: ${info.hotel}`              : null,
    info.checkIn     ? `Check-in: ${info.checkIn}`         : null,
    info.checkOut    ? `Check-out: ${info.checkOut}`       : null,
    info.arrivalTime ? `Arrival: ${info.arrivalTime}`      : null,
    info.flightNumber? `Flight: ${info.flightNumber}`      : null,
  ].filter(Boolean).join('\n');

  await supabase.functions.invoke('send-notification', {
    body: { weddingId, guestName, details: lines },
  });
}

// Explicit "Send message" flow for the Notes field on My Details. The
// note is already persisted via autosave on `guest_info.extra_notes`;
// this fires a dedicated email to the couple with a message-specific
// subject so it's visually distinct from routine travel-detail updates.
export async function sendGuestMessage(
  weddingId: string,
  guestName: string,
  message: string,
): Promise<void> {
  const body = [
    `From: ${guestName}`,
    ``,
    message,
  ].join('\n');
  const { error } = await supabase.functions.invoke('send-notification', {
    body: { weddingId, guestName, details: body, kind: 'message' },
  });
  if (error) throw error;
}

// ─── Push Tokens ─────────────────────────────────────────────────────────────

export async function savePushToken(
  weddingId: string,
  guestName: string,
  token: string,
): Promise<void> {
  try {
    await supabase
      .from('guest_info')
      .upsert(
        {
          wedding_id: weddingId,
          guest_name: guestName,
          push_token: token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wedding_id,guest_name' },
      );
  } catch {
    // Silently fail — token will be saved on next launch
  }
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

// Onboarding is considered done once accommodation info is filled in.
export async function isOnboardingDone(weddingId: string, guestName: string): Promise<boolean> {
  const info = await getMyInfo(weddingId, guestName);
  return !!(info.hotel && info.checkIn && info.checkOut);
}

export async function markOnboardingDone(weddingId: string, guestName: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarding(weddingId, guestName), 'true');
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  message: string;
  sender: string;
  sentAt: string;
  editedAt: string | null;
  // When true the message is only visible to wedding-party members and the
  // message sender (who is also an admin). Default false (visible to all).
  weddingPartyOnly: boolean;
}

export async function getNotifications(weddingId: string): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sent_at', { ascending: false });
    if (!error && data) {
      return data.map((n) => ({
        id: n.id,
        message: n.message,
        sender: n.sender,
        sentAt: n.sent_at,
        editedAt: n.edited_at ?? null,
        weddingPartyOnly: n.wedding_party_only ?? false,
      }));
    }
  } catch {
    // offline — no local cache for notifications
  }
  return [];
}

export async function editNotification(
  weddingId: string,
  id: string,
  message: string,
): Promise<{ editedAt: string | null }> {
  const editedAt = new Date().toISOString();
  // Try with the edited_at timestamp first. If migration 007 hasn't been
  // applied yet, the column is missing — fall back to updating the message
  // alone so the edit still saves.
  const { error } = await supabase
    .from('notifications')
    .update({ message, edited_at: editedAt })
    .eq('wedding_id', weddingId)
    .eq('id', id);
  if (!error) return { editedAt };

  const { error: fallbackError } = await supabase
    .from('notifications')
    .update({ message })
    .eq('wedding_id', weddingId)
    .eq('id', id);
  if (fallbackError) throw new Error(fallbackError.message);
  return { editedAt: null };
}

export async function deleteNotification(weddingId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Notification Reactions ───────────────────────────────────────────────────

export interface ReactionSummary {
  emoji: string;
  count: number;
  guestNames: string[];
}

export async function getReactions(
  weddingId: string,
  notificationIds: string[],
): Promise<Record<string, ReactionSummary[]>> {
  if (notificationIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('notification_reactions')
      .select('notification_id, guest_name, emoji')
      .eq('wedding_id', weddingId)
      .in('notification_id', notificationIds);

    if (error || !data) return {};

    const map: Record<string, ReactionSummary[]> = {};
    for (const row of data) {
      const nid = row.notification_id as string;
      if (!map[nid]) map[nid] = [];
      const entry = map[nid].find((r) => r.emoji === row.emoji);
      if (entry) {
        entry.count++;
        entry.guestNames.push(row.guest_name);
      } else {
        map[nid].push({ emoji: row.emoji, count: 1, guestNames: [row.guest_name] });
      }
    }
    return map;
  } catch {
    return {};
  }
}

// Upserts a reaction, or removes it if the guest already has the same emoji
export async function toggleReaction(
  weddingId: string,
  notificationId: string,
  guestName: string,
  emoji: string,
  currentEmoji: string | null,
): Promise<void> {
  if (currentEmoji === emoji) {
    await supabase
      .from('notification_reactions')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('notification_id', notificationId)
      .eq('guest_name', guestName);
  } else {
    await supabase
      .from('notification_reactions')
      .upsert(
        {
          wedding_id: weddingId,
          notification_id: notificationId,
          guest_name: guestName,
          emoji,
        },
        { onConflict: 'wedding_id,notification_id,guest_name' },
      );
  }
}

// ─── Notification Replies ────────────────────────────────────────────────────

export interface NotificationReply {
  id: string;
  notificationId: string;
  guestName: string;
  message: string;
  createdAt: string;
}

export async function getReplies(
  weddingId: string,
  notificationIds: string[],
): Promise<Record<string, NotificationReply[]>> {
  if (notificationIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('notification_replies')
      .select('*')
      .eq('wedding_id', weddingId)
      .in('notification_id', notificationIds)
      .order('created_at', { ascending: true });

    if (error || !data) return {};

    const map: Record<string, NotificationReply[]> = {};
    for (const row of data) {
      const nid = row.notification_id as string;
      if (!map[nid]) map[nid] = [];
      map[nid].push({
        id: row.id,
        notificationId: nid,
        guestName: row.guest_name,
        message: row.message,
        createdAt: row.created_at,
      });
    }
    return map;
  } catch {
    return {};
  }
}

export async function addReply(
  weddingId: string,
  notificationId: string,
  guestName: string,
  message: string,
): Promise<NotificationReply> {
  const { data, error } = await supabase
    .from('notification_replies')
    .insert({
      wedding_id: weddingId,
      notification_id: notificationId,
      guest_name: guestName,
      message,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to post reply');
  }

  return {
    id: data.id,
    notificationId: data.notification_id,
    guestName: data.guest_name,
    message: data.message,
    createdAt: data.created_at,
  };
}

export async function deleteReply(weddingId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('notification_replies')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Unread message tracking ──────────────────────────────────────────────────

export async function getMessagesLastRead(
  weddingId: string,
  guestName: string,
): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.messagesLastRead(weddingId, guestName));
}

export async function markMessagesRead(weddingId: string, guestName: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.messagesLastRead(weddingId, guestName), new Date().toISOString());
}

// ─── Song Requests ────────────────────────────────────────────────────────────

export interface SongRequest {
  id: string;
  song: string;
  artist: string;
  requestedBy: string;
  submittedAt: string;
}

export async function getSongRequests(weddingId: string): Promise<SongRequest[]> {
  try {
    const { data, error } = await supabase
      .from('song_requests')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('submitted_at', { ascending: true });

    if (!error && data) {
      return data.map((r) => ({
        id: r.id,
        song: r.song,
        artist: r.artist ?? '',
        requestedBy: r.requested_by,
        submittedAt: r.submitted_at,
      }));
    }
  } catch {
    // offline fallback — no local cache for shared song requests
  }
  return [];
}

export async function deleteSongRequest(weddingId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('song_requests')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('id', id);
  if (error) {
    throw new Error(error.message ?? 'Failed to delete song request');
  }
}

export async function addSongRequest(
  weddingId: string,
  song: string,
  artist: string,
  requestedBy: string,
): Promise<SongRequest> {
  const { data, error } = await supabase
    .from('song_requests')
    .insert({
      wedding_id: weddingId,
      song: song.trim(),
      artist: artist.trim(),
      requested_by: requestedBy,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to submit song request');
  }

  return {
    id: data.id,
    song: data.song,
    artist: data.artist ?? '',
    requestedBy: data.requested_by,
    submittedAt: data.submitted_at,
  };
}

// ─── Packing Checklist ───────────────────────────────────────────────────────
// Synced to Supabase per guest, with AsyncStorage as local cache/offline fallback.

export async function getCheckedItems(
  weddingId: string,
  guestName: string,
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('packing_checklist')
      .select('checked_items')
      .eq('wedding_id', weddingId)
      .eq('guest_name', guestName)
      .maybeSingle();
    // On a successful query the server is the source of truth — even when
    // it returns no row (data is null). Treat no-row as empty and sync the
    // local cache so a fresh/reset server state isn't masked by a stale
    // AsyncStorage cache from a previous session on the same device.
    if (!error) {
      const items: string[] = data?.checked_items ?? [];
      await AsyncStorage.setItem(KEYS.packingChecklist(weddingId, guestName), JSON.stringify(items));
      return items;
    }
  } catch {
    // Network unavailable — fall through to local cache
  }
  const raw = await AsyncStorage.getItem(KEYS.packingChecklist(weddingId, guestName));
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function togglePackingItem(
  weddingId: string,
  itemId: string,
  guestName: string,
): Promise<string[]> {
  const checked = await getCheckedItems(weddingId, guestName);
  const updated = checked.includes(itemId)
    ? checked.filter((id) => id !== itemId)
    : [...checked, itemId];
  // Write to local cache immediately so the UI feels instant
  await AsyncStorage.setItem(KEYS.packingChecklist(weddingId, guestName), JSON.stringify(updated));
  // Sync to Supabase in the background
  try {
    await supabase
      .from('packing_checklist')
      .upsert(
        {
          wedding_id: weddingId,
          guest_name: guestName,
          checked_items: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wedding_id,guest_name' },
      );
  } catch {
    // Will reconcile on next load
  }
  return updated;
}

// ─── Custom packing items (per-guest personal additions) ─────────────────────

export interface CustomPackingItem {
  id: string;
  label: string;
}

// IDs are prefixed with 'custom-' so they can never collide with built-in
// item ids (which are short slug strings like 'mehendi-outfit'). The
// timestamp + random suffix gives stable uniqueness even when two adds
// land in the same millisecond.
function newCustomItemId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getCustomPackingItems(
  weddingId: string,
  guestName: string,
): Promise<CustomPackingItem[]> {
  try {
    const { data, error } = await supabase
      .from('packing_checklist')
      .select('custom_items')
      .eq('wedding_id', weddingId)
      .eq('guest_name', guestName)
      .maybeSingle();
    if (!error) {
      const items: CustomPackingItem[] = Array.isArray(data?.custom_items)
        ? (data!.custom_items as CustomPackingItem[])
        : [];
      await AsyncStorage.setItem(
        KEYS.packingCustomItems(weddingId, guestName),
        JSON.stringify(items),
      );
      return items;
    }
  } catch {
    // Network unavailable — fall through to local cache
  }
  const raw = await AsyncStorage.getItem(KEYS.packingCustomItems(weddingId, guestName));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function persistCustomItems(
  weddingId: string,
  guestName: string,
  items: CustomPackingItem[],
  // Optional updated checked_items list — supplied by removeCustomPackingItem
  // so we can drop a deleted custom item's check state in the same upsert.
  // Omitted means leave checked_items untouched (a separate read-modify-write
  // is also fine, but bundling avoids a second round-trip).
  checkedItems?: string[],
): Promise<void> {
  await AsyncStorage.setItem(
    KEYS.packingCustomItems(weddingId, guestName),
    JSON.stringify(items),
  );
  if (checkedItems !== undefined) {
    await AsyncStorage.setItem(
      KEYS.packingChecklist(weddingId, guestName),
      JSON.stringify(checkedItems),
    );
  }
  try {
    const payload: {
      wedding_id: string;
      guest_name: string;
      custom_items: CustomPackingItem[];
      updated_at: string;
      checked_items?: string[];
    } = {
      wedding_id: weddingId,
      guest_name: guestName,
      custom_items: items,
      updated_at: new Date().toISOString(),
    };
    if (checkedItems !== undefined) payload.checked_items = checkedItems;
    await supabase
      .from('packing_checklist')
      .upsert(payload, { onConflict: 'wedding_id,guest_name' });
  } catch {
    // Will reconcile on next load
  }
}

export async function addCustomPackingItem(
  weddingId: string,
  guestName: string,
  label: string,
): Promise<CustomPackingItem[]> {
  const trimmed = label.trim();
  if (!trimmed) {
    return getCustomPackingItems(weddingId, guestName);
  }
  const current = await getCustomPackingItems(weddingId, guestName);
  const updated = [...current, { id: newCustomItemId(), label: trimmed }];
  await persistCustomItems(weddingId, guestName, updated);
  return updated;
}

export async function removeCustomPackingItem(
  weddingId: string,
  guestName: string,
  itemId: string,
): Promise<{ items: CustomPackingItem[]; checkedItems: string[] }> {
  // Read both lists, drop the deleted item from each, write together so
  // the row never has stale check-state pointing at a removed item.
  const [current, checked] = await Promise.all([
    getCustomPackingItems(weddingId, guestName),
    getCheckedItems(weddingId, guestName),
  ]);
  const items = current.filter((i) => i.id !== itemId);
  const checkedItems = checked.filter((id) => id !== itemId);
  await persistCustomItems(weddingId, guestName, items, checkedItems);
  return { items, checkedItems };
}

// ─── Event Time Overrides ─────────────────────────────────────────────────────
// Admins can override the `time` string on schedule events without a code
// deploy. Returned as a Record<event_id, time_string>; the schedule screen
// merges with the hardcoded events at render time.

export async function getEventTimeOverrides(
  weddingId: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('event_time_overrides')
    .select('event_id, time')
    .eq('wedding_id', weddingId);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.event_id] = row.time;
  return out;
}

export async function setEventTimeOverride(
  weddingId: string,
  eventId: string,
  time: string,
): Promise<void> {
  const { error } = await supabase
    .from('event_time_overrides')
    .upsert(
      {
        wedding_id: weddingId,
        event_id: eventId,
        time,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wedding_id,event_id' },
    );
  if (error) throw error;
}


// ─── Photo Submissions (local only for now) ───────────────────────────────────

export interface PhotoRecord {
  id: string;
  uri: string;
  caption: string;
  submittedBy: string;
  submittedAt: string;
  type: 'photo' | 'video';
}

export async function getPhotos(weddingId: string): Promise<PhotoRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.photos(weddingId));
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function addPhoto(
  weddingId: string,
  record: Omit<PhotoRecord, 'id' | 'submittedAt'>,
): Promise<PhotoRecord> {
  const existing = await getPhotos(weddingId);
  const newRecord: PhotoRecord = {
    ...record,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.photos(weddingId), JSON.stringify([...existing, newRecord]));
  return newRecord;
}
