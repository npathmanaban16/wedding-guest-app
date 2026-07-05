import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { Colors, Fonts, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import {
  almostDoneAlert,
  fetchActiveEntries,
  fetchStation,
  finishEntry,
  setStationOpen,
  skipEntry,
  startEntry,
  type HennaStationRow,
  type HennaWaitlistEntry,
} from '@/services/hennaWaitlist';

// Faster poll than the guest screen — the artist wants new joiners
// to appear promptly so they can call the next person without a
// lag. Still cheap: a handful of rows per poll.
const POLL_MS = 4000;

export default function HennaArtistScreen() {
  const { guestName } = useAuth();
  const { getAdminRole } = useWedding();
  if (!guestName) return <Redirect href="/login" />;
  // Gate the screen to henna_artist logins so a stray navigation
  // (e.g. a bookmarked URL from an earlier session) doesn't drop
  // a regular guest into the artist workspace.
  if (getAdminRole(guestName) !== 'henna_artist') return <Redirect href="/(tabs)" />;
  return <HennaArtistInner artistName={guestName} />;
}

function HennaArtistInner({ artistName }: { artistName: string }) {
  const { weddingId, wedding } = useWedding();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<HennaStationRow | null>(null);
  const [entries, setEntries] = useState<HennaWaitlistEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [togglingOpen, setTogglingOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        fetchStation(weddingId),
        fetchActiveEntries(weddingId),
      ]);
      setStation(s);
      setEntries(e);
    } catch (err) {
      console.warn('[henna-artist] failed to load queue', err);
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [load]);

  const myChair = useMemo(
    () => entries.find((e) => e.status === 'in_progress' && e.served_by === artistName) ?? null,
    [entries, artistName],
  );
  const otherChairs = useMemo(
    () => entries.filter((e) => e.status === 'in_progress' && e.served_by !== artistName),
    [entries, artistName],
  );
  const waiting = useMemo(
    () => entries.filter((e) => e.status === 'waiting'),
    [entries],
  );

  const stationLabel = station?.display_name?.trim() || 'Henna waitlist';

  const doToggleOpen = useCallback(
    async (next: boolean) => {
      if (togglingOpen) return;
      setTogglingOpen(true);
      // Optimistic — station toggle is a single row upsert, so we can
      // paint the new state immediately. Roll back on error.
      const prev = station;
      setStation((s) => (s ? { ...s, is_open: next } : {
        wedding_id: weddingId,
        is_open: next,
        display_name: null,
        updated_at: new Date().toISOString(),
      }));
      try {
        await setStationOpen(weddingId, next);
        haptic.selection();
      } catch (err) {
        console.warn('[henna-artist] toggle failed', err);
        setStation(prev);
        Alert.alert('Couldn\'t update', 'Please try again.');
      } finally {
        setTogglingOpen(false);
      }
    },
    [weddingId, station, togglingOpen],
  );

  const withBusy = useCallback(
    async (entryId: string, work: () => Promise<void>) => {
      if (busy) return;
      setBusy(entryId);
      try {
        await work();
        await load();
      } catch (err) {
        console.warn('[henna-artist] action failed', err);
        Alert.alert('Something went wrong', 'Please try again.');
      } finally {
        setBusy(null);
      }
    },
    [busy, load],
  );

  const doStart = useCallback(
    (entry: HennaWaitlistEntry) => {
      // Block a start when this artist already has someone in their
      // chair — they need to Finish (or Skip) first. Prevents an
      // accidental double-in-progress row from a fat-fingered tap.
      if (myChair) {
        Alert.alert(
          'Finish current guest first',
          `${myChair.guest_name} is still in your chair. Tap Done when they finish, then start ${entry.guest_name}.`,
        );
        return;
      }
      withBusy(entry.id, async () => {
        await startEntry(weddingId, entry.id, artistName);
        haptic.success();
      });
    },
    [myChair, weddingId, artistName, withBusy],
  );

  const doAlmostDone = useCallback(() => {
    if (!myChair) return;
    withBusy(myChair.id, async () => {
      await almostDoneAlert(weddingId);
      haptic.light();
    });
  }, [myChair, weddingId, withBusy]);

  const doFinish = useCallback(() => {
    if (!myChair) return;
    withBusy(myChair.id, async () => {
      await finishEntry(myChair.id);
      haptic.success();
    });
  }, [myChair, withBusy]);

  const doSkip = useCallback(
    (entry: HennaWaitlistEntry) => {
      Alert.alert(
        'Skip this guest?',
        `Remove ${entry.guest_name} from the line. They can rejoin if they come back.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Skip',
            style: 'destructive',
            onPress: () =>
              withBusy(entry.id, async () => {
                await skipEntry(entry.id);
                haptic.warning();
              }),
          },
        ],
      );
    },
    [withBusy],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const stationOpen = !!station?.is_open;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>{wedding.couple_names.toUpperCase()}</Text>
      <Text style={styles.title}>{stationLabel}</Text>
      <Text style={styles.subtitle}>Hi {artistName.split(' ')[0]} — you're serving as the henna artist.</Text>

      {/* Open/closed toggle */}
      <View style={[styles.toggleCard, Shadow.small]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>
            Waitlist is {stationOpen ? 'open' : 'closed'}
          </Text>
          <Text style={styles.toggleBody}>
            {stationOpen
              ? 'Guests can join the line from their home screen.'
              : 'Guests won\'t see the join card until you open the line.'}
          </Text>
        </View>
        <Switch
          value={stationOpen}
          onValueChange={doToggleOpen}
          disabled={togglingOpen}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      {/* Chair */}
      <Text style={styles.sectionLabel}>YOUR CHAIR</Text>
      {myChair ? (
        <View style={[styles.chairCard, Shadow.small]}>
          <Text style={styles.chairName}>{myChair.guest_name}</Text>
          {myChair.guest_name !== myChair.added_by && (
            <Text style={styles.chairAdder}>Signed up by {myChair.added_by}</Text>
          )}
          <View style={styles.chairActions}>
            <TouchableOpacity
              style={[styles.chairBtn, styles.chairBtnAlmost, busy === myChair.id && styles.btnBusy]}
              onPress={doAlmostDone}
              disabled={busy === myChair.id}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
              <Text style={styles.chairBtnAlmostText}>Almost done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chairBtn, styles.chairBtnDone, busy === myChair.id && styles.btnBusy]}
              onPress={doFinish}
              disabled={busy === myChair.id}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
              <Text style={styles.chairBtnDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.chairHint}>
            Tap "Almost done" a minute before you finish — it pings the next person to come over.
          </Text>
        </View>
      ) : (
        <View style={styles.emptyChair}>
          <Ionicons name="hand-left-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.emptyChairText}>Your chair is empty. Start the next guest below.</Text>
        </View>
      )}

      {/* Other artists' chairs — read-only, just so this artist knows
          who else is being served. Hidden entirely when solo. */}
      {otherChairs.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>ALSO IN PROGRESS</Text>
          {otherChairs.map((c) => (
            <View key={c.id} style={styles.otherChairRow}>
              <Ionicons name="ellipse" size={8} color={Colors.gold} />
              <Text style={styles.otherChairText}>
                {c.guest_name} <Text style={styles.otherChairSub}>with {c.served_by}</Text>
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Waiting queue */}
      <Text style={styles.sectionLabel}>QUEUE ({waiting.length})</Text>
      {waiting.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nobody in line right now.</Text>
        </View>
      ) : (
        waiting.map((entry, idx) => {
          const isFirst = idx === 0;
          return (
            <View key={entry.id} style={[styles.queueRow, Shadow.small]}>
              <View style={styles.queueLeft}>
                <View style={[styles.queuePos, isFirst && styles.queuePosNext]}>
                  <Text style={[styles.queuePosText, isFirst && styles.queuePosTextNext]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueName}>{entry.guest_name}</Text>
                  {entry.guest_name !== entry.added_by && (
                    <Text style={styles.queueAdder}>via {entry.added_by}</Text>
                  )}
                  <Text style={styles.queueWait}>{waitLabel(entry.joined_at)}</Text>
                </View>
              </View>
              <View style={styles.queueActions}>
                {isFirst && !myChair && (
                  <TouchableOpacity
                    style={[styles.startBtn, busy === entry.id && styles.btnBusy]}
                    onPress={() => doStart(entry)}
                    disabled={busy === entry.id}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.startBtnText}>Start</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => doSkip(entry)}
                  disabled={busy === entry.id}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// Renders "waiting 3 min" style labels next to each queue row. Rounds
// down to the nearest minute; "just now" for anything under 60s so
// zero-minute labels don't look broken on a fresh join.
function waitLabel(joinedAt: string): string {
  const diffMs = Date.now() - new Date(joinedAt).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just joined';
  if (minutes === 1) return 'waiting 1 min';
  return `waiting ${minutes} min`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  eyebrow: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.xxl,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  toggleTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.md,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  toggleBody: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },

  sectionLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  chairCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
  },
  chairName: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.xl,
    color: Colors.textPrimary,
  },
  chairAdder: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chairActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  chairBtnAlmost: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chairBtnAlmostText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.base,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  chairBtnDone: {
    backgroundColor: Colors.primary,
  },
  chairBtnDoneText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.base,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  chairHint: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  btnBusy: { opacity: 0.5 },

  emptyChair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyChairText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    flex: 1,
  },

  otherChairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  otherChairText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  otherChairSub: {
    color: Colors.textMuted,
    fontFamily: Fonts.sans,
  },

  empty: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  queueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  queuePos: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuePosNext: { backgroundColor: Colors.gold },
  queuePosText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  queuePosTextNext: { color: Colors.white },
  queueName: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  queueAdder: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  queueWait: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  queueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  startBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  startBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  skipBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
