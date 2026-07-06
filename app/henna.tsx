import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { Colors, Fonts, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import {
  MAX_SPOTS_PER_GUEST,
  cancelEntry,
  fetchActiveEntries,
  fetchStation,
  joinWaitlist,
  type HennaStationRow,
  type HennaWaitlistEntry,
} from '@/services/hennaWaitlist';

// Poll interval while the guest is on this screen — fast enough that
// positions feel live without hammering the DB. AppState.change is
// the other refresh trigger, for guests who tab away and come back.
const POLL_MS = 6000;

export default function HennaScreen() {
  const { guestName } = useAuth();
  if (!guestName) return <Redirect href="/login" />;
  return <HennaScreenInner guestName={guestName} />;
}

interface RowPosition {
  entry: HennaWaitlistEntry;
  position: number; // 1-indexed among waiting; 0 when in_progress (chair)
}

function HennaScreenInner({ guestName }: { guestName: string }) {
  const { weddingId } = useWedding();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<HennaStationRow | null>(null);
  const [entries, setEntries] = useState<HennaWaitlistEntry[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        fetchStation(weddingId),
        fetchActiveEntries(weddingId),
      ]);
      setStation(s);
      setEntries(e);
    } catch (err) {
      console.warn('[henna] failed to load queue', err);
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

  // Every row the current guest signed up (self or family). Sorted the
  // way we want to show them — chair (in_progress) first, then queue
  // rows by ascending join order. Position is 0 for the chair and
  // 1-indexed among waiting rows.
  const myRows: RowPosition[] = useMemo(() => {
    const waiting = entries.filter((e) => e.status === 'waiting');
    const mine: RowPosition[] = [];
    for (const e of entries) {
      if (e.added_by !== guestName) continue;
      if (e.status === 'in_progress') {
        mine.push({ entry: e, position: 0 });
      } else if (e.status === 'waiting') {
        mine.push({ entry: e, position: waiting.indexOf(e) + 1 });
      }
    }
    // Chair first, then position ascending.
    return mine.sort((a, b) => a.position - b.position);
  }, [entries, guestName]);

  const activeCount = myRows.length;
  const remainingSlots = Math.max(0, MAX_SPOTS_PER_GUEST - activeCount);
  const queueDepth = entries.filter((e) => e.status === 'waiting').length;

  const stationOpen = !!station?.is_open;
  const stationLabel = station?.display_name?.trim() || 'Henna waitlist';

  const doJoin = useCallback(
    async (who: string) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const result = await joinWaitlist(weddingId, guestName, who);
        if (result.ok) {
          haptic.success();
          setEntries((prev) => [...prev, result.entry]);
          setAddModalOpen(false);
          setOtherName('');
          // Refresh from source of truth to catch any concurrent changes.
          load();
        } else {
          haptic.warning();
          if (result.reason === 'closed') {
            Alert.alert('Line closed', 'The henna waitlist isn\'t open right now.');
          } else if (result.reason === 'cap_reached') {
            Alert.alert(
              'Spot limit reached',
              `You can hold at most ${MAX_SPOTS_PER_GUEST} spots at a time. Cancel one first.`,
            );
          } else {
            Alert.alert('Already on the list', `${who} is already in your queue.`);
          }
        }
      } catch (err) {
        console.warn('[henna] join failed', err);
        Alert.alert('Couldn\'t join', 'Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [weddingId, guestName, submitting, load],
  );

  const doCancel = useCallback(
    (entry: HennaWaitlistEntry) => {
      Alert.alert(
        'Cancel spot?',
        `Remove ${entry.guest_name} from the henna line?`,
        [
          { text: 'Keep spot', style: 'cancel' },
          {
            text: 'Cancel spot',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelEntry(entry.id);
                haptic.warning();
                setEntries((prev) => prev.filter((e) => e.id !== entry.id));
                load();
              } catch (err) {
                console.warn('[henna] cancel failed', err);
                Alert.alert('Couldn\'t cancel', 'Please try again.');
              }
            },
          },
        ],
      );
    },
    [load],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{stationLabel}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status pill */}
        <View style={[styles.statusPill, stationOpen ? styles.statusOpen : styles.statusClosed]}>
          <View style={[styles.statusDot, stationOpen ? styles.dotOpen : styles.dotClosed]} />
          <Text style={styles.statusText}>
            {stationOpen ? 'Line is open' : 'Line is closed'}
          </Text>
        </View>

        {!stationOpen && (
          <Text style={styles.subtle}>
            Check back later — the artist will open the line when they're ready.
          </Text>
        )}

        {stationOpen && (
          <Text style={styles.subtle}>
            {queueDepth === 0
              ? 'No one is waiting right now.'
              : `${queueDepth} ${queueDepth === 1 ? 'person is' : 'people are'} in line.`}
          </Text>
        )}

        {/* My spots */}
        {myRows.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>YOUR SPOTS</Text>
            {myRows.map(({ entry, position }) => (
              <View key={entry.id} style={[styles.spotCard, Shadow.small]}>
                <View style={styles.spotHeader}>
                  <View
                    style={[
                      styles.positionBadge,
                      position === 0 && styles.positionBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.positionBadgeText,
                        position === 0 && styles.positionBadgeTextActive,
                      ]}
                    >
                      {position === 0 ? 'NOW' : `#${position}`}
                    </Text>
                  </View>
                  <View style={styles.spotNames}>
                    <Text style={styles.spotName}>{entry.guest_name}</Text>
                    {entry.guest_name !== guestName && (
                      <Text style={styles.spotAdder}>Added by you</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.spotStatus}>
                  {position === 0
                    ? entry.served_by
                      ? `Currently with ${entry.served_by}`
                      : 'Currently being served'
                    : position === 1
                      ? 'Up next — head over when notified'
                      : `${position - 1} ${position - 1 === 1 ? 'person' : 'people'} ahead`}
                </Text>
                {entry.status === 'waiting' && (
                  <TouchableOpacity
                    style={styles.spotCancel}
                    onPress={() => doCancel(entry)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={15} color={Colors.textMuted} />
                    <Text style={styles.spotCancelText}>Cancel this spot</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {/* Sign-up buttons — only when the line is open AND the guest
            still has slots left. Two buttons: sign up as self (only
            enabled when they don't already have a spot for themselves),
            and add someone else. */}
        {stationOpen && remainingSlots > 0 && (
          <>
            <Text style={styles.sectionLabel}>ADD A SPOT</Text>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                myRows.some((r) => r.entry.guest_name === guestName) && styles.primaryBtnDisabled,
              ]}
              onPress={() => doJoin(guestName)}
              disabled={submitting || myRows.some((r) => r.entry.guest_name === guestName)}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={16} color={Colors.white} />
                  <Text style={styles.primaryBtnText}>Sign myself up</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setAddModalOpen(true)}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Add someone else</Text>
            </TouchableOpacity>

            <Text style={styles.cap}>
              You have {remainingSlots} of {MAX_SPOTS_PER_GUEST} spots available.
            </Text>
          </>
        )}

        {stationOpen && remainingSlots === 0 && (
          <Text style={styles.cap}>
            You've filled all {MAX_SPOTS_PER_GUEST} of your spots. Cancel one to add another.
          </Text>
        )}
      </ScrollView>

      <Modal
        visible={addModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Who are you adding?</Text>
            <Text style={styles.modalBody}>
              You'll get the "you're up" notification for them, so you can flag them when it's their turn.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={otherName}
              onChangeText={setOtherName}
              placeholder="Full name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => otherName.trim() && doJoin(otherName.trim())}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => { setAddModalOpen(false); setOtherName(''); }}
                style={[styles.modalBtn, styles.modalBtnCancel]}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => otherName.trim() && doJoin(otherName.trim())}
                disabled={!otherName.trim() || submitting}
                style={[
                  styles.modalBtn,
                  styles.modalBtnConfirm,
                  (!otherName.trim() || submitting) && styles.modalBtnConfirmDisabled,
                ]}
              >
                <Text style={styles.modalBtnConfirmText}>
                  {submitting ? 'Adding…' : 'Add to line'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.lg,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  statusOpen: { backgroundColor: Colors.accentLight },
  statusClosed: { backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.border },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOpen: { backgroundColor: Colors.accent },
  dotClosed: { backgroundColor: Colors.textMuted },
  statusText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtle: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },

  sectionLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  spotCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  positionBadge: {
    minWidth: 44,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  positionBadgeActive: { backgroundColor: Colors.gold },
  positionBadgeText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  positionBadgeTextActive: { color: Colors.white },
  spotNames: { flex: 1 },
  spotName: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  spotAdder: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  spotStatus: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  spotCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  spotCancelText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.base,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 13,
    marginBottom: Spacing.md,
  },
  secondaryBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.base,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  cap: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 24, 16, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  modalTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  modalBody: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  modalInput: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  modalBtnCancel: { backgroundColor: 'transparent' },
  modalBtnCancelText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  modalBtnConfirm: { backgroundColor: Colors.primary },
  modalBtnConfirmDisabled: { opacity: 0.45 },
  modalBtnConfirmText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
