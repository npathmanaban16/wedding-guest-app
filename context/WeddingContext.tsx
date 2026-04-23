import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { Colors } from '@/constants/theme';
import {
  fetchAdmins,
  fetchGuests,
  fetchWedding,
  resolveWeddingByInviteCode,
  type AdminRole,
  type AdminRow,
  type Gender,
  type GuestRow,
  type ResolvedWedding,
  type WeddingRow,
} from '@/services/wedding';

export type { AdminRole, Gender };

// ─── Session: always available while WeddingProvider is mounted ──────────────
// Tracks which wedding this install is attached to. Null on the SaaS variant
// before the guest enters an invite code. Exposed via useWeddingSession so the
// invite screen (which runs before any wedding data is loaded) can set it.

interface WeddingSessionContextType {
  weddingId: string | null;
  // Fetches wedding + guests + admins for a code without mutating session
  // state. Callers use this to preview/validate before committing.
  resolveWeddingByInviteCode: (inviteCode: string) => Promise<ResolvedWedding | null>;
  // Commits a pre-resolved wedding into the provider state + AsyncStorage.
  applyResolvedWedding: (resolved: ResolvedWedding) => Promise<void>;
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
  // True only for admins with full powers (no role, or role='planner').
  // Vendor-role admins like DJs return false — they have login access but
  // no admin-ui surfaces. Membership in wedding_admins is still checked
  // by isValidGuestOrAdmin for login purposes.
  isAdmin: (name: string) => boolean;
  getAdminRole: (name: string) => AdminRole | null;
}

const WeddingContext = createContext<WeddingContextType | null>(null);

// Persisted wedding_id for the SaaS variant. The N&N build ignores this and
// always uses DEFAULT_WEDDING_ID from app.config.ts.
const WEDDING_ID_STORAGE_KEY = '@wedding_id';

// Kept in sync with AuthContext's AUTH_STORAGE_KEY. Cleared when a new invite
// code is accepted so a stale cached login doesn't auto-auth the user past
// /login into another wedding's tenant.
const AUTH_STORAGE_KEY = '@wedding_guest_name';

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
  const [admins, setAdmins] = useState<AdminRow[]>([]);
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
      setAdmins([]);
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
    // The invite-code path pre-loads all three slices before setting
    // weddingId. If they already match, skip re-fetching — otherwise we'd
    // flip loadState back to 'loading' for a render, unmount the tree, and
    // eat router.replace('/login').
    if (wedding?.id === weddingId && loadState === 'ready') {
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
        setAdmins(a);
        setLoadState('ready');
      } catch (err) {
        console.error('[WeddingProvider] failed to load wedding data', err);
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [weddingId, wedding, loadState]);

  const applyResolvedWedding = useCallback(
    async ({ wedding: w, guests: g, admins: a }: ResolvedWedding): Promise<void> => {
      // Pre-populate all three slices before flipping weddingId. React
      // batches the state setters below into one render, so the provider
      // goes straight from "no weddingId (children rendered via session
      // provider)" to "loadState=ready (children rendered via both
      // providers)". Without pre-populating, the load-effect below would
      // flip loadState to 'loading' for a render, unmounting the Stack and
      // eating any router.replace() fired by the caller.
      await AsyncStorage.setItem(WEDDING_ID_STORAGE_KEY, w.id);
      // New invite means a new tenant — discard any cached login from a
      // prior wedding so AuthContext doesn't auto-auth past /login.
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setWedding(w);
      setGuests(g);
      setAdminNames(a.map((row) => row.guest_name));
      setLoadState('ready');
      setWeddingId(w.id);
    },
    [],
  );

  const clearWeddingId = useCallback(async () => {
    await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
    setWeddingId(null);
  }, []);

  const sessionValue = useMemo<WeddingSessionContextType>(
    () => ({
      weddingId,
      resolveWeddingByInviteCode,
      applyResolvedWedding,
      clearWeddingId,
    }),
    [weddingId, applyResolvedWedding, clearWeddingId],
  );

  const weddingValue = useMemo<WeddingContextType | null>(() => {
    if (!wedding || !weddingId) return null;
    const guestByNormalized = new Map(guests.map((g) => [normalizeName(g.canonical_name), g]));
    const adminByNormalized = new Map(admins.map((a) => [normalizeName(a.guest_name), a]));

    const isValidGuest = (name: string) => guestByNormalized.has(normalizeName(name));
    // Raw membership in wedding_admins — used for login only. Admin-power
    // gating uses isAdmin below, which additionally excludes vendor roles.
    const isAdminMember = (name: string) => adminByNormalized.has(normalizeName(name));
    const isValidGuestOrAdmin = (name: string) => isValidGuest(name) || isAdminMember(name);

    const getAdminRole = (name: string): AdminRole | null =>
      adminByNormalized.get(normalizeName(name))?.role ?? null;

    // Admin powers = in wedding_admins AND not a vendor role. Vendor
    // roles (currently just 'dj') get login access but no admin UI.
    const isAdmin = (name: string) => {
      const a = adminByNormalized.get(normalizeName(name));
      if (!a) return false;
      return a.role === null || a.role === 'planner';
    };

    const getCanonicalName = (name: string) => {
      const n = normalizeName(name);
      return guestByNormalized.get(n)?.canonical_name
        ?? adminByNormalized.get(n)?.guest_name
        ?? null;
    };

    // Guests table wins for any user who's also a guest — guest-row flags
    // are the RSVP source of truth. Non-guest admins (planner, DJ) fall
    // through to the wedding_admins row so they can still be flagged as
    // wedding-party or scoped to a gender-specific packing list.
    const isWeddingParty = (name: string) => {
      const n = normalizeName(name);
      const g = guestByNormalized.get(n);
      if (g) return g.is_wedding_party;
      return adminByNormalized.get(n)?.is_wedding_party ?? false;
    };

    const getGuestGender = (name: string) => {
      const n = normalizeName(name);
      const g = guestByNormalized.get(n);
      if (g) return g.gender;
      return adminByNormalized.get(n)?.gender ?? null;
    };

    return {
      weddingId,
      wedding,
      isValidGuest,
      isValidGuestOrAdmin,
      getCanonicalName,
      isWeddingParty,
      getGuestGender,
      isAdmin,
      getAdminRole,
    };
  }, [weddingId, wedding, guests, admins]);

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
