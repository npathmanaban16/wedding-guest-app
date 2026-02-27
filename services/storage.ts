/**
 * Local storage service for guest-submitted data.
 *
 * All data is stored on-device using AsyncStorage.
 *
 * To persist data to a real backend (e.g. Supabase), replace the
 * `save*` methods with API calls and call AsyncStorage only as a
 * local cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys ────────────────────────────────────────────────────────────────────

const KEYS = {
  myInfo: '@wedding_my_info',
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

export async function getMyInfo(): Promise<MyInfo> {
  const raw = await AsyncStorage.getItem(KEYS.myInfo);
  if (!raw) return DEFAULT_MY_INFO;
  return { ...DEFAULT_MY_INFO, ...JSON.parse(raw) };
}

export async function saveMyInfo(info: MyInfo): Promise<void> {
  await AsyncStorage.setItem(KEYS.myInfo, JSON.stringify(info));
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
  const raw = await AsyncStorage.getItem(KEYS.songRequests);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function addSongRequest(
  song: string,
  artist: string,
  requestedBy: string,
): Promise<SongRequest> {
  const existing = await getSongRequests();
  const newRequest: SongRequest = {
    id: Date.now().toString(),
    song: song.trim(),
    artist: artist.trim(),
    requestedBy,
    submittedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.songRequests, JSON.stringify([...existing, newRequest]));
  return newRequest;
}

// ─── Packing Checklist ────────────────────────────────────────────────────────

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

// ─── Photo Submissions ────────────────────────────────────────────────────────

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
