import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { WEDDING, EVENTS } from '@/constants/weddingData';

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  function getTimeLeft(target: Date) {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, isPast: false };
  }

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

interface CountdownBoxProps {
  value: number;
  label: string;
}

function CountdownBox({ value, label }: CountdownBoxProps) {
  return (
    <View style={styles.countdownBox}>
      <Text style={styles.countdownValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  );
}

interface QuickLinkProps {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function QuickLink({ emoji, title, subtitle, onPress }: QuickLinkProps) {
  return (
    <TouchableOpacity style={[styles.quickLink, Shadow.small]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.quickLinkEmoji}>{emoji}</Text>
      <Text style={styles.quickLinkTitle}>{title}</Text>
      <Text style={styles.quickLinkSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { guestName, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const countdown = useCountdown(WEDDING.weddingDate);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = guestName?.split(' ')[0] ?? 'Guest';

  const nextEvent = EVENTS[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => setRefreshing(false)} />
      }
    >
      {/* Header */}
      <LinearGradient colors={['#FBF7F4', '#F5EDE4']} style={styles.header}>
        <Text style={styles.greeting}>Welcome, {firstName} 👋</Text>
        <Text style={styles.coupleName}>{WEDDING.coupleNames}</Text>
        <View style={styles.ornamentRow}>
          <View style={styles.ornamentLine} />
          <Text style={styles.ornamentDiamond}>◆</Text>
          <View style={styles.ornamentLine} />
        </View>
        <Text style={styles.location}>📍 {WEDDING.location}</Text>
      </LinearGradient>

      {/* Countdown */}
      <View style={[styles.countdownCard, Shadow.medium]}>
        <Text style={styles.countdownTitle}>
          {countdown.isPast ? 'The big day is here! 🎉' : 'Counting down to the wedding'}
        </Text>
        {!countdown.isPast && (
          <View style={styles.countdownRow}>
            <CountdownBox value={countdown.days} label="days" />
            <Text style={styles.countdownColon}>:</Text>
            <CountdownBox value={countdown.hours} label="hrs" />
            <Text style={styles.countdownColon}>:</Text>
            <CountdownBox value={countdown.minutes} label="mins" />
            <Text style={styles.countdownColon}>:</Text>
            <CountdownBox value={countdown.seconds} label="secs" />
          </View>
        )}
        <Text style={styles.weddingDateText}>
          {WEDDING.weddingDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* Next event teaser */}
      <View style={[styles.nextEventCard, Shadow.small]}>
        <Text style={styles.sectionLabel}>First up</Text>
        <Text style={styles.nextEventTitle}>
          {nextEvent.emoji} {nextEvent.title}
        </Text>
        <Text style={styles.nextEventDetails}>
          {nextEvent.date} · {nextEvent.time}
        </Text>
        <Text style={styles.nextEventVenue}>{nextEvent.venue}</Text>
        <TouchableOpacity
          style={styles.nextEventButton}
          onPress={() => router.push('/(tabs)/schedule')}
        >
          <Text style={styles.nextEventButtonText}>View full schedule →</Text>
        </TouchableOpacity>
      </View>

      {/* Quick links */}
      <Text style={styles.sectionTitle}>Explore</Text>
      <View style={styles.quickLinksGrid}>
        <QuickLink
          emoji="🏔️"
          title="Switzerland Guide"
          subtitle="Things to do & eat"
          onPress={() => router.push('/(tabs)/switzerland')}
        />
        <QuickLink
          emoji="🧳"
          title="Packing Guide"
          subtitle="Outfits & essentials"
          onPress={() => router.push('/(tabs)/packing')}
        />
        <QuickLink
          emoji="📸"
          title="Share Photos"
          subtitle="Upload your memories"
          onPress={() => router.push('/(tabs)/photos')}
        />
        <QuickLink
          emoji="🎵"
          title="Song Requests"
          subtitle="Request a track"
          onPress={() => router.push('/(tabs)/songs')}
        />
        <QuickLink
          emoji="✈️"
          title="My Details"
          subtitle="Hotel & arrival info"
          onPress={() => router.push('/(tabs)/my-info')}
        />
      </View>

      {/* Hashtag */}
      <View style={styles.hashtagCard}>
        <Text style={styles.hashtagTitle}>Share your moments</Text>
        <Text style={styles.hashtag}>{WEDDING.hashtag}</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Switch guest account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },

  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontFamily: Typography.sans,
    marginBottom: Spacing.xs,
  },
  coupleName: {
    fontSize: Typography.xxxl,
    fontFamily: Typography.serif,
    color: Colors.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: Spacing.sm,
  },
  ornamentLine: { flex: 1, height: 1, backgroundColor: Colors.secondaryLight },
  ornamentDiamond: { color: Colors.secondary, fontSize: Typography.xs, marginHorizontal: Spacing.sm },
  location: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  countdownCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  countdownTitle: {
    color: Colors.white,
    fontSize: Typography.sm,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    opacity: 0.9,
    textAlign: 'center',
  },
  countdownRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.sm },
  countdownBox: { alignItems: 'center', minWidth: 52 },
  countdownValue: {
    color: Colors.white,
    fontSize: Typography.xxl,
    fontFamily: Typography.serif,
    fontWeight: '700',
  },
  countdownLabel: {
    color: Colors.white,
    opacity: 0.7,
    fontSize: Typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownColon: {
    color: Colors.white,
    fontSize: Typography.xl,
    opacity: 0.6,
    marginBottom: 14,
    marginHorizontal: 2,
  },
  weddingDateText: {
    color: Colors.white,
    opacity: 0.8,
    fontSize: Typography.xs,
    letterSpacing: 0.5,
  },

  nextEventCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  sectionLabel: {
    fontSize: Typography.xs,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  nextEventTitle: {
    fontSize: Typography.lg,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  nextEventDetails: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  nextEventVenue: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  nextEventButton: {},
  nextEventButtonText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickLink: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: 2,
  },
  quickLinkEmoji: { fontSize: 28, marginBottom: Spacing.xs },
  quickLinkTitle: {
    fontSize: Typography.base,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  quickLinkSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },

  hashtagCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.sageLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  hashtagTitle: {
    fontSize: Typography.sm,
    color: Colors.sageDark,
    marginBottom: Spacing.xs,
  },
  hashtag: {
    fontSize: Typography.xl,
    fontFamily: Typography.serif,
    color: Colors.sageDark,
  },

  logoutButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  logoutText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
