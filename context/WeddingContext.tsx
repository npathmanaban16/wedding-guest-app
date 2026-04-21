import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { Colors } from '@/constants/theme';
import {
  fetchAdmins,
  fetchGuests,
  fetchWedding,
  type Gender,
  type GuestRow,
  type WeddingRow,
} from '@/services/wedding';

export type { Gender };

interface WeddingContextType {
  weddingId: string | null;
  wedding: WeddingRow;
  isValidGuest: (name: string) => boolean;
  isValidGuestOrAdmin: (name: string) => boolean;
  getCanonicalName: (name: string) => string | null;
  isWeddingParty: (name: string) => boolean;
  getGuestGender: (name: string) => Gender | null;
  isAdmin: (name: string) => boolean;
}

const WeddingContext = createContext<WeddingContextType | null>(null);

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function WeddingProvider({ children }: { children: React.ReactNode }) {
  const weddingId = DEFAULT_WEDDING_ID;
  const [wedding, setWedding] = useState<WeddingRow | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [adminNames, setAdminNames] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    // SaaS build ships without a baked-in wedding id and is expected to
    // resolve one from an invite code (not yet wired up). Until that lands,
    // surface an error so the app doesn't hang on the splash.
    if (!weddingId) {
      setLoadState('error');
      return;
    }
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
          console.error('[WeddingProvider] wedding not found', weddingId);
          setLoadState('error');
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

  const value = useMemo<WeddingContextType | null>(() => {
    if (!wedding) return null;
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

  if (loadState === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn't reach the server.</Text>
        <Text style={styles.errorText}>Please check your connection and restart the app.</Text>
      </View>
    );
  }

  if (loadState === 'loading' || !value) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>;
}

export function useWedding(): WeddingContextType {
  const ctx = useContext(WeddingContext);
  if (!ctx) throw new Error('useWedding must be used within WeddingProvider');
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
