import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ImageBackground,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { WEDDING, type WeddingEvent } from '@/constants/weddingData';

// Pick the event to feature on the home screen at the current moment.
//   - Skips events the guest can't see (wedding-party-only when they're not).
//   - Returns the first event whose effective end is still in the future:
//     'now' when it's currently in progress, 'upcoming' when it hasn't
//     started yet, null when every event has ended.
//   - When an event has no posted end (e.g. a Baraat), the next event's
//     start time acts as the implicit end; if it's the final event, it
//     stays "happening now" for one hour.
type DisplayedEvent =
  | { kind: 'now'; event: WeddingEvent }
  | { kind: 'upcoming'; event: WeddingEvent };

function pickDisplayedEvent(
  events: WeddingEvent[],
  inWeddingParty: boolean,
  now: number,
): DisplayedEvent | null {
  const visible = events.filter((e) => !e.weddingPartyOnly || inWeddingParty);
  for (let i = 0; i < visible.length; i++) {
    const e = visible[i];
    const startMs = new Date(e.startDate).getTime();
    const explicitEnd = e.endDate ? new Date(e.endDate).getTime() : null;
    const implicitEnd = explicitEnd ?? (
      visible[i + 1]
        ? new Date(visible[i + 1].startDate).getTime()
        : startMs + 60 * 60 * 1000
    );
    if (now < implicitEnd) {
      return { kind: now >= startMs ? 'now' : 'upcoming', event: e };
    }
  }
  return null;
}

// Casual second-factor for the admin tools — gates the buttons on the home
// tab so a guest borrowing an admin's logged-in phone can't fire pushes or
// edit the schedule without knowing the shared word. The actual value lives
// on weddings.admin_password and is verified via the check_admin_password()
// RPC so it never round-trips to the client. Rotate by updating the row.
const adminUnlockKey = (weddingId: string) => `@admin_unlocked_${weddingId}`;

function useCountdown(targetDate: Date) {
  const getTimeLeft = (target: Date) => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      isPast: false,
    };
  };
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

interface CountdownUnitProps { value: number; label: string }
function CountdownUnit({ value, label }: CountdownUnitProps) {
  return (
    <View style={styles.countdownUnit}>
      <Text style={styles.countdownValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.countdownLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

interface QuickCardProps { title: string; subtitle: string; onPress: () => void }
function QuickCard({ title, subtitle, onPress }: QuickCardProps) {
  return (
    <TouchableOpacity style={[styles.quickCard, Shadow.small]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.quickCardTitle}>{title}</Text>
      <Text style={styles.quickCardSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { guestName, logout } = useAuth();
  const { isWeddingParty, isAdmin, wedding, events } = useWedding();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const weddingDate = React.useMemo(() => new Date(wedding.wedding_date), [wedding.wedding_date]);
  const countdown = useCountdown(weddingDate);
  const firstName = guestName?.split(' ')[0] ?? 'Guest';
  const inWeddingParty = isWeddingParty(guestName ?? '');
  const isAdminUser = !!guestName && isAdmin(guestName);
  // Admin tools are hidden behind a shared password until unlocked once on
  // this device. State is restored from AsyncStorage on mount and persists
  // across app launches; tapping "Lock again" clears it.
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!isAdminUser) return;
    AsyncStorage.getItem(adminUnlockKey(wedding.id))
      .then((v) => { if (v === 'true') setAdminUnlocked(true); })
      .catch(() => {});
  }, [isAdminUser, wedding.id]);

  const openPasswordPrompt = () => {
    setPasswordInput('');
    setPasswordError('');
    setPasswordModalOpen(true);
  };

  const handleConfirmPassword = async () => {
    const { data, error } = await supabase.rpc('check_admin_password', {
      p_wedding_id: wedding.id,
      p_password:   passwordInput,
    });
    if (error) {
      setPasswordError('Could not verify password. Try again.');
      return;
    }
    if (data === true) {
      try { await AsyncStorage.setItem(adminUnlockKey(wedding.id), 'true'); } catch {}
      setAdminUnlocked(true);
      setPasswordModalOpen(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password.');
    }
  };

  const handleLockAdmin = async () => {
    try { await AsyncStorage.removeItem(adminUnlockKey(wedding.id)); } catch {}
    setAdminUnlocked(false);
  };
  // Re-pick the featured event every countdown tick so it advances from
  // Sangeet → Baraat → Ceremony → Reception → nothing as the weekend
  // unfolds, without having to wire up a separate timer.
  const displayedEvent = useMemo(
    () => pickDisplayedEvent(events, inWeddingParty, Date.now()),
    // countdown ticks every second, which is the trigger we want here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, inWeddingParty, countdown.seconds, countdown.isPast],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero header — prefers the per-wedding hero_image_url from the
          `weddings` table when set, falls back to the bundled image so
          tenants with no custom image still render something. */}
      <ImageBackground
        source={wedding.hero_image_url ? { uri: wedding.hero_image_url } : WEDDING.heroImage}
        style={[styles.heroImage, { paddingTop: insets.top + Spacing.xl }]}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <View style={styles.header}>
          <Text style={styles.heroGreeting}>Welcome, {firstName}</Text>
          <Text style={styles.heroCoupleNames}>{wedding.couple_names}</Text>
          <View style={styles.ornamentRow}>
            <View style={styles.heroOrnamentLine} />
            <Text style={styles.heroOrnamentDiamond}>◆</Text>
            <View style={styles.heroOrnamentLine} />
          </View>
          <Text style={styles.heroLocation}>
            {wedding.location.toUpperCase()}
          </Text>
        </View>
      </ImageBackground>

      {/* Countdown */}
      <View style={styles.countdownCard}>
        {countdown.isPast ? (
          <Text style={styles.countdownPast} numberOfLines={1} adjustsFontSizeToFit>
            Thank you for celebrating with us!
          </Text>
        ) : (
          <>
            <Text style={styles.countdownHeading}>until the wedding</Text>
            <View style={styles.countdownRow}>
              <CountdownUnit value={countdown.days} label="days" />
              <Text style={styles.countdownSep}>·</Text>
              <CountdownUnit value={countdown.hours} label="hrs" />
              <Text style={styles.countdownSep}>·</Text>
              <CountdownUnit value={countdown.minutes} label="min" />
              <Text style={styles.countdownSep}>·</Text>
              <CountdownUnit value={countdown.seconds} label="sec" />
            </View>
            <Text style={styles.countdownDate}>
              {weddingDate.toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </>
        )}
      </View>

      {/* Featured event card — hidden once the last event has ended so
          the home screen doesn't keep linking to a past schedule. While
          the wedding is on, the tag flips to "HAPPENING NOW" for the
          event currently in progress. */}
      {displayedEvent && (
        <View style={[styles.eventCard, Shadow.small]}>
          <Text style={styles.eventTag}>
            {displayedEvent.kind === 'now' ? 'HAPPENING NOW' : 'UP NEXT'}
          </Text>
          <Text style={styles.eventName}>{displayedEvent.event.title}</Text>
          <Text style={styles.eventDetail}>{displayedEvent.event.date}</Text>
          <Text style={styles.eventVenue}>{displayedEvent.event.venue}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')}>
            <Text style={styles.eventLink}>View full schedule →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Explore section */}
      <Text style={styles.sectionTitle}>Explore</Text>
      <View style={styles.quickGrid}>
        <QuickCard title="Schedule" subtitle="All events & dress codes" onPress={() => router.push('/(tabs)/schedule')} />
        <QuickCard title={`${wedding.destination_city} Guide`} subtitle="Things to do & eat" onPress={() => router.push('/(tabs)/switzerland')} />
        <QuickCard title="Packing List" subtitle="Outfits & essentials" onPress={() => router.push('/(tabs)/packing')} />
        <QuickCard title="Share Photos" subtitle="Upload memories" onPress={() => router.push('/(tabs)/photos')} />
        <QuickCard title="Song Requests" subtitle="Request a track" onPress={() => router.push('/(tabs)/songs')} />
        <QuickCard title="My Details" subtitle="Hotel & arrival info" onPress={() => router.push('/(tabs)/my-info')} />
      </View>

      {/* Hashtag */}
      <View style={styles.hashtagCard}>
        <Text style={styles.hashtagLabel}>SHARE YOUR MOMENTS</Text>
        <Text style={styles.hashtag}>{wedding.hashtag}</Text>
      </View>

      {/* Registry */}
      <View style={styles.registryCard}>
        <Text style={styles.registryLabel}>GIFT REGISTRY</Text>
        <Text style={styles.registryTitle}>Cash Registry</Text>
        <Text style={styles.registryBody}>
          Celebrating this special weekend in Switzerland with our loved ones is truly the only gift we need. However, for those who have kindly asked about gifting, we have set up a registry for this new chapter together.
        </Text>
        <TouchableOpacity
          style={styles.registryButton}
          onPress={() => {
            if (wedding.registry_url) Linking.openURL(wedding.registry_url);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.registryButtonText}>View Registry</Text>
        </TouchableOpacity>
      </View>

      {/* Admin tools — only visible to admin guests, and gated behind a
          shared password to discourage casual access from a borrowed phone. */}
      {isAdminUser && !adminUnlocked && (
        <TouchableOpacity
          style={styles.adminLockedButton}
          onPress={openPasswordPrompt}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed-outline" size={15} color={Colors.primary} />
          <Text style={styles.adminLockedText}>Unlock Admin Tools</Text>
        </TouchableOpacity>
      )}

      {isAdminUser && adminUnlocked && (
        <>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={15} color={Colors.white} />
            <Text style={styles.adminButtonText}>Send Guest Notification</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin-content')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color={Colors.white} />
            <Text style={styles.adminButtonText}>Edit App Content</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin-accommodations')}
            activeOpacity={0.8}
          >
            <Ionicons name="bed-outline" size={15} color={Colors.white} />
            <Text style={styles.adminButtonText}>Guest Accommodations</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/admin-settings')}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={15} color={Colors.white} />
            <Text style={styles.adminButtonText}>App Features</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLockAdmin}
            style={styles.adminLockAgain}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed" size={11} color={Colors.textMuted} />
            <Text style={styles.adminLockAgainText}>Lock admin tools</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={passwordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Admin password</Text>
            <Text style={styles.modalBody}>
              Enter the shared admin password to unlock these tools on this device.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={passwordInput}
              onChangeText={(t) => { setPasswordInput(t); if (passwordError) setPasswordError(''); }}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirmPassword}
            />
            {passwordError ? (
              <Text style={styles.modalError}>{passwordError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setPasswordModalOpen(false)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmPassword}
                disabled={!passwordInput}
                style={[
                  styles.modalBtn,
                  styles.modalBtnConfirm,
                  !passwordInput && styles.modalBtnConfirmDisabled,
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnConfirmText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  heroImage: {
    width: '100%',
    height: 380,
    justifyContent: 'flex-end',
    marginBottom: Spacing.lg,
    // Placeholder color for the brief window before the photo paints
    // (fresh cache miss, or the first frame after mount). Uses the app
    // cream so it reads as part of the background rather than a dark
    // flash — the earlier `Colors.textPrimary` version looked bad here.
    backgroundColor: Colors.background,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroGreeting: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  heroCoupleNames: {
    fontFamily: Fonts.serif,
    fontSize: 54,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 58,
    marginBottom: Spacing.md,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: Spacing.sm,
  },
  heroOrnamentLine: { flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  heroOrnamentDiamond: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginHorizontal: Spacing.sm },
  heroLocation: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.xs,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.7)',
  },

  countdownCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  countdownHeading: {
    fontFamily: Fonts.serifItalic,
    fontSize: Typography.base,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  countdownUnit: { alignItems: 'center', minWidth: 52 },
  countdownValue: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.xxl,
    color: Colors.white,
    lineHeight: Typography.xxl + 4,
  },
  countdownLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    color: Colors.white,
    opacity: 0.65,
    letterSpacing: 1.5,
  },
  countdownSep: {
    color: Colors.white,
    opacity: 0.4,
    fontSize: Typography.xl,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  countdownDate: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.white,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  countdownPast: {
    fontFamily: Fonts.serif,
    fontSize: Typography.xl,
    color: Colors.white,
  },

  eventCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  eventTag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  eventName: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  eventDetail: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  eventVenue: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  eventLink: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    color: Colors.primary,
  },

  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: 2,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  quickCardTitle: {
    fontFamily: Fonts.serifMedium,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  quickCardSub: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },

  hashtagCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  hashtagLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  hashtag: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.xl,
    color: Colors.accent,
  },

  registryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  registryLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  registryTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  registryBody: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  registryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 13,
    paddingHorizontal: Spacing.xl,
    ...Shadow.small,
  },
  registryButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.base,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
  },
  adminButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  adminLockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  adminLockedText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  adminLockAgain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  adminLockAgainText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
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
  modalError: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.xs,
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

  signOut: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  signOutText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
