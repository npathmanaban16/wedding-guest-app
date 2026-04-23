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
    info.extraNotes  ? `\nNotes: ${info.extraNotes}`       : null,
  ].filter(Boolean).join('\n');

  await supabase.functions.invoke('send-notification', {
    body: { weddingId, guestName, details: lines },
  });
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
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ message, edited_at: new Date().toISOString() })
    .eq('wedding_id', weddingId)
    .eq('id', id);
  if (error) throw new Error(error.message);
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
