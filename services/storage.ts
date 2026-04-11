/**
 * Storage service — persists guest data to Supabase with AsyncStorage as a
 * local cache/fallback for offline use.
 *
 * Tables required in Supabase (run the SQL in supabase/schema.sql):
 *   - guest_info
 *   - song_requests
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// ─── Keys ────────────────────────────────────────────────────────────────────

const KEYS = {
  myInfo: (name: string) => `@wedding_my_info_${name}`,
  songRequests: '@wedding_song_requests',
  packingChecklist: '@wedding_packing_checklist',
  photos: '@wedding_photos',
};

// ─── My Info ─────────────────────────────────────────────────────────────────

export interface MyInfo {
  hotel: string;
  checkIn: string;
  checkOut: string;
  arrivalTime: string;
  flightNumber: string;
  dietary: string;
  songRequest: string;
  extraNotes: string;
}

const DEFAULT_MY_INFO: MyInfo = {
  hotel: '',
  checkIn: '',
  checkOut: '',
  arrivalTime: '',
  flightNumber: '',
  dietary: '',
  songRequest: '',
  extraNotes: '',
};

export async function getMyInfo(guestName: string): Promise<MyInfo> {
  // Try Supabase first
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
        dietary: data.dietary ?? '',
        songRequest: data.song_request ?? '',
        extraNotes: data.extra_notes ?? '',
      };
      // Update local cache
      await AsyncStorage.setItem(KEYS.myInfo(guestName), JSON.stringify(info));
      return info;
    }
  } catch {
    // Network unavailable — fall through to local cache
  }

  // Fall back to local cache
  const raw = await AsyncStorage.getItem(KEYS.myInfo(guestName));
  if (!raw) return DEFAULT_MY_INFO;
  return { ...DEFAULT_MY_INFO, ...JSON.parse(raw) };
}

export async function saveMyInfo(guestName: string, info: MyInfo): Promise<void> {
  // Save to Supabase (upsert by guest_name)
  await supabase.from('guest_info').upsert(
    {
      guest_name: guestName,
      hotel: info.hotel,
      check_in: info.checkIn,
      check_out: info.checkOut,
      arrival_time: info.arrivalTime,
      flight_number: info.flightNumber,
      dietary: info.dietary,
      song_request: info.songRequest,
      extra_notes: info.extraNotes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guest_name' },
  );

  // Always cache locally too
  await AsyncStorage.setItem(KEYS.myInfo(guestName), JSON.stringify(info));
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
    // Fall back to local cache
  }

  const raw = await AsyncStorage.getItem(KEYS.songRequests);
  if (!raw) return [];
  return JSON.parse(raw);
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
