import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { Colors } from '@/constants/theme';
import {
  fetchAdmins,
  fetchGuests,
  fetchWedding,
  fetchWeddingByInviteCode,
  type Gender,
  type GuestRow,
  type WeddingRow,
} from '@/services/wedding';

export type { Gender };

// ─── Session: always available while WeddingProvider is mounted ──────────────
// Tracks which wedding this install is attached to. Null on the SaaS variant
// before the guest enters an invite code. Exposed via useWeddingSession so the
// invite screen (which runs before any wedding data is loaded) can set it.

interface WeddingSessionContextType {
  weddingId: string | null;
  setWeddingIdFromInviteCode: (inviteCode: string) => Promise<WeddingRow | null>;
  clearWeddingId: () => Promise<void>;
}

const WeddingSessionContext = createContext<WeddingSessionContextType | null>(null);

// ─── Wedding: available once wedding data has loaded ─────────────────────────
// Screens that rely on wedding data (tabs, login) call useWedding() and trust
// it to be populated — WeddingProvider renders a loading gate while fetching.

interface WeddingContextType {
  weddingId: string;
  wedding: WeddingRow;
  isValidGuest: (name: string) => boolean;
  isValidGuestOrAdmin: (name: string) => boolean;
  getCanonicalName: (name: string) => string | null;
  isWeddingParty: (name: string) => boolean;
  getGuestGender: (name: string) => Gender | null;
  isAdmin: (name: string) => boolean;
}

const WeddingContext = createContext<WeddingContextType | null>(null);

// Persisted wedding_id for the SaaS variant. The N&N build ignores this and
// always uses DEFAULT_WEDDING_ID from app.config.ts.
const WEDDING_ID_STORAGE_KEY = '@wedding_id';

// Guards against a poisoned AsyncStorage value (e.g. a prior dev build that
// setItem'd an object, which AsyncStorage coerces to the literal string
// "[object Object]"). Feeding that into Supabase gives a 22P02 uuid error.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function WeddingProvider({ children }: { children: React.ReactNode }) {
  // N&N: weddingId is pinned from build config and sessionReady is immediate.
  // SaaS: weddingId starts null and we read AsyncStorage on mount.
  const [weddingId, setWeddingId] = useState<string | null>(DEFAULT_WEDDING_ID);
  const [sessionReady, setSessionReady] = useState<boolean>(!!DEFAULT_WEDDING_ID);

  const [wedding, setWedding] = useState<WeddingRow | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [adminNames, setAdminNames] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    DEFAULT_WEDDING_ID ? 'loading' : 'idle',
  );

  useEffect(() => {
    // Only runs on SaaS builds — N&N initialized sessionReady=true above.
    if (DEFAULT_WEDDING_ID) return;
    AsyncStorage.getItem(WEDDING_ID_STORAGE_KEY)
      .then(async (stored) => {
        if (!stored) return;
        if (UUID_REGEX.test(stored)) {
          setWeddingId(stored);
        } else {
          console.warn('[WeddingProvider] cached wedding_id is not a uuid; clearing', stored);
          await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
        }
      })
      .finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    if (!weddingId) {
      setLoadState('idle');
      setWedding(null);
      setGuests([]);
      setAdminNames([]);
      return;
    }
    // Defensive: if weddingId somehow isn't a uuid-shaped string, clear it.
    // Catches any path (stale bundle, object coerced to string, etc.) that
    // slipped past the AsyncStorage restore guard.
    if (typeof weddingId !== 'string' || !UUID_REGEX.test(weddingId)) {
      console.warn(
        '[WeddingProvider] weddingId is not a uuid; clearing session',
        { value: weddingId, type: typeof weddingId },
      );
      AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY).finally(() => setWeddingId(null));
      return;
    }
    setLoadState('loading');
    let cancelled = false;
    (async () => {
      try {
        const [w, g, a] = await Promise.all([
          fetchWedding(weddingId),
          fetchGuests(weddingId),
          fetchAdmins(weddingId),
        ]);
        if (cancelled) return;
        if (!w) {
          // Stored invite points at a wedding that no longer exists — drop it
          // so the user falls back to the invite screen.
          console.warn('[WeddingProvider] wedding not found; clearing session', weddingId);
          await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
          setWeddingId(null);
          return;
        }
        setWedding(w);
        setGuests(g);
        setAdminNames(a.map((row) => row.guest_name));
        setLoadState('ready');
      } catch (err) {
        console.error('[WeddingProvider] failed to load wedding data', err);
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [weddingId]);

  const setWeddingIdFromInviteCode = useCallback(
    async (inviteCode: string): Promise<WeddingRow | null> => {
      const w = await fetchWeddingByInviteCode(inviteCode);
      if (!w) return null;
      await AsyncStorage.setItem(WEDDING_ID_STORAGE_KEY, w.id);
      setWeddingId(w.id);
      return w;
    },
    [],
  );

  const clearWeddingId = useCallback(async () => {
    await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
    setWeddingId(null);
  }, []);

  const sessionValue = useMemo<WeddingSessionContextType>(
    () => ({ weddingId, setWeddingIdFromInviteCode, clearWeddingId }),
    [weddingId, setWeddingIdFromInviteCode, clearWeddingId],
  );

  const weddingValue = useMemo<WeddingContextType | null>(() => {
    if (!wedding || !weddingId) return null;
    const guestByNormalized = new Map(guests.map((g) => [normalizeName(g.canonical_name), g]));
    const adminNormalized = new Set(adminNames.map(normalizeName));

    const isValidGuest = (name: string) => guestByNormalized.has(normalizeName(name));
    const isAdmin = (name: string) => adminNormalized.has(normalizeName(name));
    const isValidGuestOrAdmin = (name: string) => isValidGuest(name) || isAdmin(name);

    const getCanonicalName = (name: string) => {
      const n = normalizeName(name);
      return guestByNormalized.get(n)?.canonical_name
        ?? adminNames.find((a) => normalizeName(a) === n)
        ?? null;
    };

    const isWeddingParty = (name: string) =>
      guestByNormalized.get(normalizeName(name))?.is_wedding_party ?? false;

    const getGuestGender = (name: string) =>
      guestByNormalized.get(normalizeName(name))?.gender ?? null;

    return {
      weddingId,
      wedding,
      isValidGuest,
      isValidGuestOrAdmin,
      getCanonicalName,
      isWeddingParty,
      getGuestGender,
      isAdmin,
    };
  }, [weddingId, wedding, guests, adminNames]);

  // Initial session restore — brief blank while AsyncStorage reads on SaaS.
  if (!sessionReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // SaaS with no invite code yet — render children (invite/index) with only
  // the session context. useWedding() will throw if called from this state,
  // which is intentional: only the invite flow should be reachable here.
  if (!weddingId) {
    return (
      <WeddingSessionContext.Provider value={sessionValue}>
        {children}
      </WeddingSessionContext.Provider>
    );
  }

  if (loadState === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn't reach the server.</Text>
        <Text style={styles.errorText}>Please check your connection and restart the app.</Text>
      </View>
    );
  }

  if (loadState !== 'ready' || !weddingValue) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <WeddingSessionContext.Provider value={sessionValue}>
      <WeddingContext.Provider value={weddingValue}>
        {children}
      </WeddingContext.Provider>
    </WeddingSessionContext.Provider>
  );
}

export function useWedding(): WeddingContextType {
  const ctx = useContext(WeddingContext);
  if (!ctx) throw new Error('useWedding must be used within WeddingProvider');
  return ctx;
}

export function useWeddingSession(): WeddingSessionContextType {
  const ctx = useContext(WeddingSessionContext);
  if (!ctx) throw new Error('useWeddingSession must be used within WeddingProvider');
  return ctx;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorText: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
});
