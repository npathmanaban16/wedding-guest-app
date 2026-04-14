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
  packingChecklist: '@wedding_packing_checklist',
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
// This ensures the prompt re-appears on login if anything is still missing,
// even if the user previously saved or skipped with incomplete data.
export async function isOnboardingDone(guestName: string): Promise<boolean> {
  const info = await getMyInfo(guestName);
  return !!(info.hotel && info.checkIn && info.checkOut && info.arrivalTime);
}

export async function markOnboardingDone(guestName: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarding(guestName), 'true');
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

// ─── Packing Checklist (local only) ──────────────────────────────────────────

export async function getCheckedItems(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.packingChecklist);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function togglePackingItem(itemId: string): Promise<string[]> {
  const checked = await getCheckedItems();
  const updated = checked.includes(itemId)
    ? checked.filter((id) => id !== itemId)
    : [...checked, itemId];
  await AsyncStorage.setItem(KEYS.packingChecklist, JSON.stringify(updated));
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
