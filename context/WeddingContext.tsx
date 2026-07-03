import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Image, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_WEDDING_ID,
  getCodeEventsForWedding,
  getCodeGuideForWedding,
  getCodePackingListForWedding,
  getCodeSchedulePageForWedding,
  type GuideSection,
  type QuickFact,
  type WeddingEvent,
  type WeddingGuide,
  type WeddingPackingList,
  type WeddingSchedulePage,
} from '@/constants/weddingData';
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
import { fetchWeddingEvents } from '@/services/events';
import { fetchWeddingGuide } from '@/services/guide';
import { fetchWeddingPackingList } from '@/services/packing';
import { fetchWeddingSchedulePage } from '@/services/schedulePage';
import { fetchGuestGroups, type GuestGroup } from '@/services/guestGroups';
import { prefetchHeroImage } from '@/utils/heroImage';

export type { AdminRole, Gender, GuestGroup };

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
  // Resolved event schedule for this wedding. Prefers rows from the
  // public.wedding_events table when present; falls back to the
  // hardcoded EVENTS_NN / EVENTS_DEMO constants otherwise. Consumers
  // (home, schedule, admin, AI) read from here so the selection rule
  // lives in one place.
  events: WeddingEvent[];
  // Resolved destination guide. Prefers a row in public.wedding_guides
  // when present; falls back to the SWITZERLAND_FULL_GUIDE constant
  // (used by N&N + Emma & James). Same pattern as `events` above.
  guide: WeddingGuide;
  // Resolved packing list. Prefers a row in public.wedding_packing_lists;
  // falls back to NN_FULL_PACKING_LIST / DEMO_FULL_PACKING_LIST for
  // legacy tenants. Same pattern as `guide` above.
  packingList: WeddingPackingList;
  // Resolved schedule-page overrides — venue photo, hotel map, and
  // timezone footer under the schedule timeline. Prefers a row in
  // public.wedding_schedule_pages; falls back to bundled Fairmont
  // content for legacy tenants, or an empty (all-hidden) page for
  // new tenants without a row.
  schedulePage: WeddingSchedulePage;
  // Full guest roster for this wedding — powers the Attendees
  // directory on the Messages tab and any future "who's here" UI.
  // Includes canonical name, party flags, gender, and optional
  // profile picture URL / bio. Populated once at context load; use
  // patchAttendeeProfile below to sync the in-memory copy after
  // writing to the DB so consumers re-render with the new value
  // without a round-trip.
  attendees: GuestRow[];
  // Guest groups for this wedding with each group's member roster.
  // Used by the admin guest-groups spreadsheet (rows=attendees,
  // columns=groups) and by getUserGroupIds/visibility filters below.
  guestGroups: GuestGroup[];
  // In-place patcher for the attendees array. Call this AFTER a
  // successful write via services/wedding.ts#updateGuestProfile so
  // the Attendees tab (and anything else reading from `attendees`)
  // shows the change immediately. Undefined fields on the patch
  // aren't touched; null explicitly clears.
  patchAttendeeProfile: (
    canonicalName: string,
    patch: { profile_photo_url?: string | null; bio?: string | null },
  ) => void;
  // In-place patcher for the wedding row. Call this AFTER a successful
  // write via services/wedding.ts#updateWeddingSettings so feature-flag
  // toggles (e.g. attendees_enabled) apply app-wide without a refetch.
  patchWedding: (patch: Partial<WeddingRow>) => void;
  // In-place patchers for the guest-groups admin spreadsheet. Called
  // after a successful write so the whole app (packing filter, event
  // visibility, gender-based item gating) reflects the change without
  // a refetch. `patchAttendeeFlag` covers is_wedding_party and gender;
  // `patchGuestGroupMembership` covers the many-to-many toggles.
  patchAttendeeFlag: (
    canonicalName: string,
    patch: { is_wedding_party?: boolean; gender?: Gender | null },
  ) => void;
  patchGuestGroupMembership: (
    groupId: string,
    canonicalName: string,
    include: boolean,
  ) => void;
  // Appends newly-inserted guests to the in-memory roster so the
  // spreadsheet + attendees tab reflect them without waiting on a
  // foreground refetch. Called by the guest-groups CSV importer after
  // a successful createGuestsBulk. Idempotent — rows whose
  // canonical_name is already known are skipped.
  appendAttendees: (rows: GuestRow[]) => void;
  // Add/remove/update on the guest_groups list itself, called by the
  // admin spreadsheet when a new column is created, renamed, or
  // deleted. Membership updates use patchGuestGroupMembership above.
  patchGuestGroups: (
    action:
      | { type: 'add'; group: GuestGroup }
      | { type: 'rename'; groupId: string; name: string }
      | { type: 'remove'; groupId: string }
  ) => void;
  // In-place patcher for the destination guide's photo strip. Call this
  // AFTER a successful write via services/guide.ts#updateWeddingGuidePhotoStrip
  // so the Travel tab reflects the admin's changes without waiting on
  // the next full guide refetch. No-op when the tenant is on the code-
  // defined guide fallback (no wedding_guides row) — the strip is only
  // editable when it's coming from the DB.
  patchGuidePhotoStrip: (
    photos: { url: string; label: string }[],
  ) => void;
  // In-place patcher for the rest of the destination guide (page copy,
  // filter pills, sections tree, quick facts, currency code) — the
  // fields the admin content editor produces. Mirrors patchPackingList
  // and is likewise a no-op on the code-defined fallback path.
  patchGuideContent: (patch: {
    pageTitle: string;
    pageSubtitleTag: string | null;
    pageSubtitle: string | null;
    currencyCode: string | null;
    filterPills: string[];
    sections: GuideSection[];
    quickFacts: QuickFact[];
  }) => void;
  // True when the guide surfaced above is backed by a wedding_guides
  // row (which the admin photo editor writes to). False for legacy
  // tenants still on the SWITZERLAND_FULL_GUIDE constant — for those
  // the photo strip can't be edited from the admin UI.
  hasEditableGuide: boolean;
  // In-place patcher for the packing list. Call this AFTER a successful
  // write via services/packing.ts#updateWeddingPackingList so the
  // Packing tab reflects the admin's edits without waiting on the next
  // refetch. No-op when the tenant is on the code-defined packing-list
  // fallback (no wedding_packing_lists row).
  patchPackingList: (list: WeddingPackingList) => void;
  // True when the packing list is backed by a wedding_packing_lists
  // row (which the admin editor writes to). False for legacy tenants
  // still on NN_FULL_PACKING_LIST / DEMO_FULL_PACKING_LIST.
  hasEditablePackingList: boolean;
  isValidGuest: (name: string) => boolean;
  isValidGuestOrAdmin: (name: string) => boolean;
  getCanonicalName: (name: string) => string | null;
  isWeddingParty: (name: string) => boolean;
  // True only for bridesmaids/bridesman — used by the packing tab to
  // surface bridal-party-only items.
  isBridalParty: (name: string) => boolean;
  getGuestGender: (name: string) => Gender | null;
  // Guest_groups.id values the named guest belongs to. Used by the
  // shared visibility helpers (constants/visibility.ts) to gate events
  // + packing items on group membership. Empty set for admin-only
  // logins, unknown names, or a wedding whose groups list is still
  // loading — the visibility filter treats an empty set as "not in any
  // group", which pairs correctly with the "empty visible_to_groups
  // means no gating" branch on the item side.
  getUserGroupIds: (name: string) => ReadonlySet<string>;
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
  // DB-backed events for this wedding; empty array means "no rows in
  // wedding_events", in which case the resolver below falls back to the
  // hardcoded code-defined events for this tenant.
  const [dbEvents, setDbEvents] = useState<WeddingEvent[]>([]);
  // DB-backed destination guide for this wedding; null means "no row
  // in wedding_guides", in which case the resolver falls back to the
  // bundled SWITZERLAND_FULL_GUIDE constant.
  const [dbGuide, setDbGuide] = useState<WeddingGuide | null>(null);
  // DB-backed packing list for this wedding; null means "no row in
  // wedding_packing_lists", in which case the resolver falls back to
  // the bundled NN/DEMO_FULL_PACKING_LIST.
  const [dbPackingList, setDbPackingList] = useState<WeddingPackingList | null>(null);
  // DB-backed schedule-page overrides for this wedding; null means
  // "no row in wedding_schedule_pages", in which case the resolver
  // returns the Fairmont fallback (for N&N + Emma & James) or an
  // empty page (for everyone else).
  const [dbSchedulePage, setDbSchedulePage] = useState<WeddingSchedulePage | null>(null);
  // Guest groups for this wedding, each with its member roster. Powers
  // the visibility filters on schedule + packing. Empty array means
  // "no groups yet" (default for new tenants until an admin creates
  // any), which the visibility filter treats as "no group gating".
  const [guestGroups, setGuestGroups] = useState<GuestGroup[]>([]);
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
      setDbEvents([]);
      setDbGuide(null);
      setDbPackingList(null);
      setDbSchedulePage(null);
      setGuestGroups([]);
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
        const [w, g, a, e, gd, pl, sp, gg] = await Promise.all([
          fetchWedding(weddingId),
          fetchGuests(weddingId),
          fetchAdmins(weddingId),
          // Events / guide / packing / schedule-page / groups failing
          // shouldn't take the whole wedding load down — we fall back
          // to code defaults / no gating if any is unreachable.
          fetchWeddingEvents(weddingId).catch((err) => {
            console.warn('[WeddingProvider] failed to load wedding_events', err);
            return [];
          }),
          fetchWeddingGuide(weddingId).catch((err) => {
            console.warn('[WeddingProvider] failed to load wedding_guides', err);
            return null;
          }),
          fetchWeddingPackingList(weddingId).catch((err) => {
            console.warn('[WeddingProvider] failed to load wedding_packing_lists', err);
            return null;
          }),
          fetchWeddingSchedulePage(weddingId).catch((err) => {
            console.warn('[WeddingProvider] failed to load wedding_schedule_pages', err);
            return null;
          }),
          fetchGuestGroups(weddingId).catch((err) => {
            console.warn('[WeddingProvider] failed to load guest_groups', err);
            return [] as GuestGroup[];
          }),
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
        setDbEvents(e);
        setDbGuide(gd);
        setDbPackingList(pl);
        setDbSchedulePage(sp);
        setGuestGroups(gg);
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
      // Pre-populate all slices before flipping weddingId. React batches
      // the state setters below into one render, so the provider goes
      // straight from "no weddingId (children rendered via session
      // provider)" to "loadState=ready (children rendered via both
      // providers)". Without pre-populating, the load-effect below would
      // flip loadState to 'loading' for a render, unmounting the Stack and
      // eating any router.replace() fired by the caller.
      //
      // Events / guide / packing / schedule-page aren't part of the
      // resolved bundle (the invite preview only validates wedding +
      // guests + admins). Fetch them here so the first render after
      // login has all the right content; on failure we fall back to
      // code defaults via the resolver below.
      const [e, gd, pl, sp, gg] = await Promise.all([
        fetchWeddingEvents(w.id).catch((err) => {
          console.warn('[WeddingProvider] failed to pre-load wedding_events', err);
          return [] as WeddingEvent[];
        }),
        fetchWeddingGuide(w.id).catch((err) => {
          console.warn('[WeddingProvider] failed to pre-load wedding_guides', err);
          return null;
        }),
        fetchWeddingPackingList(w.id).catch((err) => {
          console.warn('[WeddingProvider] failed to pre-load wedding_packing_lists', err);
          return null;
        }),
        fetchWeddingSchedulePage(w.id).catch((err) => {
          console.warn('[WeddingProvider] failed to pre-load wedding_schedule_pages', err);
          return null;
        }),
        fetchGuestGroups(w.id).catch((err) => {
          console.warn('[WeddingProvider] failed to pre-load guest_groups', err);
          return [] as GuestGroup[];
        }),
      ]);
      await AsyncStorage.setItem(WEDDING_ID_STORAGE_KEY, w.id);
      // New invite means a new tenant — discard any cached login from a
      // prior wedding so AuthContext doesn't auto-auth past /login.
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setWedding(w);
      setGuests(g);
      setAdmins(a);
      setDbEvents(e);
      setDbGuide(gd);
      setDbPackingList(pl);
      setDbSchedulePage(sp);
      setGuestGroups(gg);
      setLoadState('ready');
      setWeddingId(w.id);
    },
    [],
  );

  const clearWeddingId = useCallback(async () => {
    await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
    setWeddingId(null);
  }, []);

  // Warm the hero image cache as soon as the wedding row is loaded.
  // On the N&N build this fires while the user is still on the login
  // screen typing their name; on SaaS it fires the instant the invite
  // is resolved. Either way, by the time the Home tab mounts the
  // <ImageBackground> hit is served from the RN memory cache instead
  // of blocking on a fresh HTTPS round-trip.
  useEffect(() => {
    prefetchHeroImage(wedding?.hero_image_url);
  }, [wedding?.hero_image_url]);

  // Refetch the guest roster whenever the app returns to the
  // foreground so profile photos / bios other guests just uploaded
  // are visible without a full app restart. Only touches `guests` —
  // wedding / events / guide / packing / schedule-page don't churn
  // often enough to justify a foreground refetch. Errors are
  // swallowed since this is a best-effort refresh; the previously
  // loaded roster stays visible on network hiccups.
  useEffect(() => {
    if (!weddingId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      fetchGuests(weddingId)
        .then((g) => setGuests(g))
        .catch((err) => {
          console.warn('[WeddingProvider] foreground guest refetch failed', err);
        });
      // Groups can change out-of-band (an admin adds a guest to a
      // group from another device). Refetching alongside guests keeps
      // schedule + packing visibility in sync without a hard app
      // restart. Same best-effort pattern — errors leave the previous
      // roster in place.
      fetchGuestGroups(weddingId)
        .then((gg) => setGuestGroups(gg))
        .catch((err) => {
          console.warn('[WeddingProvider] foreground guest-groups refetch failed', err);
        });
    });
    return () => sub.remove();
  }, [weddingId]);

  // In-memory patcher for the attendees array. Used by the Profile
  // editor on My Details to keep the Attendees directory in sync
  // with a just-saved photo/bio without re-fetching guests.
  const patchAttendeeProfile = useCallback(
    (canonicalName: string, patch: { profile_photo_url?: string | null; bio?: string | null }) => {
      setGuests((prev) =>
        prev.map((g) => {
          if (g.canonical_name !== canonicalName) return g;
          return {
            ...g,
            ...(patch.profile_photo_url !== undefined
              ? { profile_photo_url: patch.profile_photo_url }
              : {}),
            ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
          };
        }),
      );
    },
    [],
  );

  // In-memory patcher for the wedding row, mirroring patchAttendeeProfile.
  // Used by the App Features admin screen to flip feature flags without
  // waiting on a refetch.
  const patchWedding = useCallback((patch: Partial<WeddingRow>) => {
    setWedding((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // In-memory patcher for is_wedding_party / gender on a single guest.
  // Called by the guest-groups spreadsheet after a successful write so
  // downstream consumers (packing filter, event visibility) reflect
  // the change immediately.
  const patchAttendeeFlag = useCallback(
    (canonicalName: string, patch: { is_wedding_party?: boolean; gender?: Gender | null }) => {
      setGuests((prev) =>
        prev.map((g) => {
          if (g.canonical_name !== canonicalName) return g;
          return {
            ...g,
            ...(patch.is_wedding_party !== undefined
              ? { is_wedding_party: patch.is_wedding_party }
              : {}),
            ...(patch.gender !== undefined ? { gender: patch.gender } : {}),
          };
        }),
      );
    },
    [],
  );

  // Append newly-inserted guests to the in-memory roster. De-duplicates
  // on canonical_name so a retried insert doesn't add a phantom row.
  const appendAttendees = useCallback((rows: GuestRow[]) => {
    if (rows.length === 0) return;
    setGuests((prev) => {
      const existing = new Set(prev.map((g) => g.canonical_name));
      const fresh = rows.filter((r) => !existing.has(r.canonical_name));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh];
    });
  }, []);

  // In-memory patcher for a single membership row on the guest_groups
  // spreadsheet. Add or remove a canonical name from a group's members
  // list without a refetch.
  const patchGuestGroupMembership = useCallback(
    (groupId: string, canonicalName: string, include: boolean) => {
      setGuestGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const inList = g.members.includes(canonicalName);
          if (include && !inList) {
            return {
              ...g,
              members: [...g.members, canonicalName].sort((a, b) => a.localeCompare(b)),
            };
          }
          if (!include && inList) {
            return { ...g, members: g.members.filter((n) => n !== canonicalName) };
          }
          return g;
        }),
      );
    },
    [],
  );

  // In-memory patcher for the guest_groups list itself. Add a newly
  // created column, rename an existing one, or drop a deleted one so
  // the spreadsheet reflects the change immediately.
  const patchGuestGroups = useCallback(
    (
      action:
        | { type: 'add'; group: GuestGroup }
        | { type: 'rename'; groupId: string; name: string }
        | { type: 'remove'; groupId: string }
    ) => {
      setGuestGroups((prev) => {
        switch (action.type) {
          case 'add':
            return [...prev, action.group];
          case 'rename':
            return prev.map((g) =>
              g.id === action.groupId ? { ...g, name: action.name } : g,
            );
          case 'remove':
            return prev.filter((g) => g.id !== action.groupId);
        }
      });
    },
    [],
  );

  // In-memory patcher for the destination guide's photo strip. No-op
  // when we're on the code-defined fallback (no DB row) — the strip
  // isn't editable from the admin UI in that case.
  const patchGuidePhotoStrip = useCallback(
    (photos: { url: string; label: string }[]) => {
      setDbGuide((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          photoStrip: photos.map((p) => ({ source: { uri: p.url }, label: p.label })),
        };
      });
    },
    [],
  );

  // In-memory patcher for the packing list. Same shape as
  // patchGuidePhotoStrip — no-op when the tenant is on the code-defined
  // packing-list fallback.
  const patchPackingList = useCallback((list: WeddingPackingList) => {
    setDbPackingList((prev) => (prev ? list : prev));
  }, []);

  // In-memory patcher for the destination guide's editable content
  // (everything except the photo strip). Merges the patch into dbGuide
  // so the photoStrip already in memory survives — the admin content
  // editor never touches photo_strip.
  const patchGuideContent = useCallback(
    (patch: {
      pageTitle: string;
      pageSubtitleTag: string | null;
      pageSubtitle: string | null;
      currencyCode: string | null;
      filterPills: string[];
      sections: GuideSection[];
      quickFacts: QuickFact[];
    }) => {
      setDbGuide((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pageTitle: patch.pageTitle,
          pageSubtitleTag: patch.pageSubtitleTag ?? undefined,
          pageSubtitle: patch.pageSubtitle ?? undefined,
          currencyCode: patch.currencyCode ?? undefined,
          filterPills: patch.filterPills,
          sections: patch.sections,
          quickFacts: patch.quickFacts,
        };
      });
    },
    [],
  );

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

    // DB rows win when present; fall back to the code-defined schedule
    // for tenants still on the constants path (N&N, Emma & James).
    const events: WeddingEvent[] = dbEvents.length > 0
      ? dbEvents
      : getCodeEventsForWedding(weddingId);

    const guide: WeddingGuide = dbGuide ?? getCodeGuideForWedding(weddingId);
    const packingList: WeddingPackingList = dbPackingList ?? getCodePackingListForWedding(weddingId);
    const schedulePage: WeddingSchedulePage = dbSchedulePage ?? getCodeSchedulePageForWedding(weddingId);

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

    // Bridal party is a guest-only concept — vendors and planners are
    // never bridesmaids, so admins fall through to false.
    const isBridalParty = (name: string) => {
      const g = guestByNormalized.get(normalizeName(name));
      return g?.is_bridal_party ?? false;
    };

    const getGuestGender = (name: string) => {
      const n = normalizeName(name);
      const g = guestByNormalized.get(n);
      if (g) return g.gender;
      return adminByNormalized.get(n)?.gender ?? null;
    };

    // Precompute name → Set<group_id> once per memo cycle so per-render
    // visibility checks are O(1). Normalized-name keys mirror the rest
    // of the identity lookups here — spouses of admins etc. hit the
    // same canonicalisation. Group membership is only meaningful for
    // guests (not admin-only users); the getter returns an empty set
    // for anyone not in the guests table.
    const groupIdsByGuest = new Map<string, Set<string>>();
    for (const group of guestGroups) {
      for (const memberName of group.members) {
        const key = normalizeName(memberName);
        const set = groupIdsByGuest.get(key);
        if (set) set.add(group.id);
        else groupIdsByGuest.set(key, new Set([group.id]));
      }
    }
    const emptyGroupSet: ReadonlySet<string> = new Set();
    const getUserGroupIds = (name: string): ReadonlySet<string> =>
      groupIdsByGuest.get(normalizeName(name)) ?? emptyGroupSet;

    return {
      weddingId,
      wedding,
      events,
      guide,
      packingList,
      schedulePage,
      attendees: guests,
      patchAttendeeProfile,
      patchWedding,
      patchGuidePhotoStrip,
      patchGuideContent,
      hasEditableGuide: dbGuide !== null,
      patchPackingList,
      hasEditablePackingList: dbPackingList !== null,
      guestGroups,
      isValidGuest,
      isValidGuestOrAdmin,
      getCanonicalName,
      isWeddingParty,
      isBridalParty,
      getGuestGender,
      getUserGroupIds,
      isAdmin,
      getAdminRole,
      patchAttendeeFlag,
      patchGuestGroupMembership,
      patchGuestGroups,
      appendAttendees,
    };
  }, [weddingId, wedding, guests, admins, dbEvents, dbGuide, dbPackingList, dbSchedulePage, guestGroups, patchAttendeeProfile, patchWedding, patchGuidePhotoStrip, patchGuideContent, patchPackingList, patchAttendeeFlag, patchGuestGroupMembership, patchGuestGroups, appendAttendees]);

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
        {/* Persistent off-screen pre-decode of the Home hero. `Image.prefetch`
            only primes the byte cache; a mounted <Image> at the target
            display size forces JPEG decode + GPU upload and keeps the
            decoded bitmap in RN's memory cache. Placing this inside
            WeddingProvider means it stays mounted for the entire signed-in
            session — across login → onboarding → home — so the Home tab
            paints from a warm bitmap cache no matter which path the user
            took to get there. Dimensions match styles.heroImage in
            app/(tabs)/index.tsx (100% × 380) so the size-keyed cache
            entry matches what Home will look up. Positioned way
            off-screen with pointerEvents=none + accessibilityElementsHidden
            so it never intercepts touches or shows up in screen readers. */}
        {weddingValue.wedding.hero_image_url && (
          <View
            style={styles.heroPreDecode}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={{ uri: weddingValue.wedding.hero_image_url }}
              style={styles.heroPreDecodeImage}
              resizeMode="cover"
            />
          </View>
        )}
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
  // Off-screen container for the persistent hero-image pre-decode.
  // Height matches styles.heroImage on the Home tab so the decoded
  // bitmap keyed by (url, size) matches what the Home ImageBackground
  // looks up on mount.
  heroPreDecode: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -9999,
    height: 380,
    opacity: 0,
  },
  heroPreDecodeImage: { width: '100%', height: '100%' },
  errorText: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
});
