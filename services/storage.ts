/**
 * Storage service — persists guest data to Supabase with AsyncStorage as a
 * local cache/fallback for offline use.
 *
 * Run supabase/schema.sql then supabase/seed.sql before using the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const KEYS = {
  myInfo: (name: string) => `@wedding_my_info_${name}`,
  packingChecklist: (name: string) => `@wedding_packing_checklist_${name}`,
  photos: '@wedding_photos',
  onboarding: (name: string) => `@wedding_onboarding_done_${name}`,
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

export async function getMyInfo(guestName: string): Promise<MyInfo> {
  try {
    const { data, error } = await supabase
      .from('guest_info')
      .select('*')
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
      await AsyncStorage.setItem(KEYS.myInfo(guestName), JSON.stringify(info));
      return info;
    }
  } catch {
    // Network unavailable — fall through to local cache
  }

  const raw = await AsyncStorage.getItem(KEYS.myInfo(guestName));
  if (!raw) return DEFAULT_MY_INFO;
  return { ...DEFAULT_MY_INFO, ...JSON.parse(raw) };
}

export async function saveMyInfo(guestName: string, info: MyInfo): Promise<void> {
  // Only update editable fields — dietary and meal choices are set by seed SQL
  await supabase.from('guest_info').upsert(
    {
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
    { onConflict: 'guest_name' },
  );

  await AsyncStorage.setItem(KEYS.myInfo(guestName), JSON.stringify(info));

  // Fire-and-forget email notification — silently ignore errors
  notifyCouple(guestName, info).catch(() => {});
}

async function notifyCouple(guestName: string, info: MyInfo): Promise<void> {
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
    body: { guestName, details: lines },
  });
}

// ─── Push Tokens ─────────────────────────────────────────────────────────────

export async function savePushToken(guestName: string, token: string): Promise<void> {
  try {
    await supabase
      .from('guest_info')
      .upsert(
        { guest_name: guestName, push_token: token, updated_at: new Date().toISOString() },
        { onConflict: 'guest_name' },
      );
  } catch {
    // Silently fail — token will be saved on next launch
  }
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

// Onboarding is considered done only when all required fields are filled.
// This ensures the prompt re-appears on each login if anything is still missing.
export async function isOnboardingDone(guestName: string): Promise<boolean> {
  const info = await getMyInfo(guestName);
  return !!(info.hotel && info.checkIn && info.checkOut && info.arrivalTime);
}

export async function markOnboardingDone(guestName: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarding(guestName), 'true');
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  message: string;
  sender: string;
  sentAt: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('sent_at', { ascending: false });
    if (!error && data) {
      return data.map((n) => ({
        id: n.id,
        message: n.message,
        sender: n.sender,
        sentAt: n.sent_at,
      }));
    }
  } catch {
    // offline — no local cache for notifications
  }
  return [];
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Notification Reactions ───────────────────────────────────────────────────

export interface ReactionSummary {
  emoji: string;
  count: number;
  guestNames: string[];
}

export async function getReactions(
  notificationIds: string[],
): Promise<Record<string, ReactionSummary[]>> {
  if (notificationIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('notification_reactions')
      .select('notification_id, guest_name, emoji')
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
  notificationId: string,
  guestName: string,
  emoji: string,
  currentEmoji: string | null,
): Promise<void> {
  if (currentEmoji === emoji) {
    await supabase
      .from('notification_reactions')
      .delete()
      .eq('notification_id', notificationId)
      .eq('guest_name', guestName);
  } else {
    await supabase
      .from('notification_reactions')
      .upsert(
        { notification_id: notificationId, guest_name: guestName, emoji },
        { onConflict: 'notification_id,guest_name' },
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
  notificationIds: string[],
): Promise<Record<string, NotificationReply[]>> {
  if (notificationIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('notification_replies')
      .select('*')
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
  notificationId: string,
  guestName: string,
  message: string,
): Promise<NotificationReply> {
  const { data, error } = await supabase
    .from('notification_replies')
    .insert({ notification_id: notificationId, guest_name: guestName, message })
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

export async function deleteReply(id: string): Promise<void> {
  const { error } = await supabase.from('notification_replies').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Unread message tracking ──────────────────────────────────────────────────

const MESSAGES_LAST_READ_KEY = '@wedding_messages_last_read';

export async function getMessagesLastRead(): Promise<string | null> {
  return AsyncStorage.getItem(MESSAGES_LAST_READ_KEY);
}

export async function markMessagesRead(): Promise<void> {
  await AsyncStorage.setItem(MESSAGES_LAST_READ_KEY, new Date().toISOString());
}

// ─── Song Requests ────────────────────────────────────────────────────────────

export interface SongRequest {
  id: string;
  song: string;
  artist: string;
  requestedBy: string;
  submittedAt: string;
}

export async function getSongRequests(): Promise<SongRequest[]> {
  try {
    const { data, error } = await supabase
      .from('song_requests')
      .select('*')
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

export async function deleteSongRequest(id: string): Promise<void> {
  const { error } = await supabase.from('song_requests').delete().eq('id', id);
  if (error) {
    throw new Error(error.message ?? 'Failed to delete song request');
  }
}

export async function addSongRequest(
  song: string,
  artist: string,
  requestedBy: string,
): Promise<SongRequest> {
  const { data, error } = await supabase
    .from('song_requests')
    .insert({ song: song.trim(), artist: artist.trim(), requested_by: requestedBy })
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

export async function getCheckedItems(guestName: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('packing_checklist')
      .select('checked_items')
      .eq('guest_name', guestName)
      .maybeSingle();
    if (!error && data) {
      const items: string[] = data.checked_items ?? [];
      await AsyncStorage.setItem(KEYS.packingChecklist(guestName), JSON.stringify(items));
      return items;
    }
  } catch {
    // Network unavailable — fall through to local cache
  }
  const raw = await AsyncStorage.getItem(KEYS.packingChecklist(guestName));
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function togglePackingItem(itemId: string, guestName: string): Promise<string[]> {
  const checked = await getCheckedItems(guestName);
  const updated = checked.includes(itemId)
    ? checked.filter((id) => id !== itemId)
    : [...checked, itemId];
  // Write to local cache immediately so the UI feels instant
  await AsyncStorage.setItem(KEYS.packingChecklist(guestName), JSON.stringify(updated));
  // Sync to Supabase in the background
  try {
    await supabase
      .from('packing_checklist')
      .upsert(
        { guest_name: guestName, checked_items: updated, updated_at: new Date().toISOString() },
        { onConflict: 'guest_name' },
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

export async function getPhotos(): Promise<PhotoRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.photos);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function addPhoto(record: Omit<PhotoRecord, 'id' | 'submittedAt'>): Promise<PhotoRecord> {
  const existing = await getPhotos();
  const newRecord: PhotoRecord = {
    ...record,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.photos, JSON.stringify([...existing, newRecord]));
  return newRecord;
}
