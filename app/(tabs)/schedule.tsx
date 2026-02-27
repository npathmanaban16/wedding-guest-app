import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { EVENTS, WeddingEvent } from '@/constants/weddingData';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function EventCard({ event }: { event: WeddingEvent }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <TouchableOpacity
      style={[styles.card, Shadow.small]}
      onPress={toggle}
      activeOpacity={0.9}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <Text style={styles.eventEmoji}>{event.emoji}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDateTime}>
            {event.date}
          </Text>
          <Text style={styles.eventTime}>⏰ {event.time}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textMuted}
        />
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.cardBody}>
          <View style={styles.divider} />

          <InfoRow icon="location-outline" label="Venue" value={event.venue} />
          <InfoRow icon="navigate-outline" label="Address" value={event.address} />

          <View style={styles.dressCodeCard}>
            <Text style={styles.dressCodeLabel}>👗 Dress Code</Text>
            <Text style={styles.dressCodeText}>{event.dressCode}</Text>
          </View>

          <Text style={styles.description}>{event.description}</Text>

          {event.notes && (
            <View style={styles.notesCard}>
              <Text style={styles.notesIcon}>💡</Text>
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

interface InfoRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.secondary} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageEmoji}>📅</Text>
        <Text style={styles.pageTitle}>Wedding Schedule</Text>
        <Text style={styles.pageSubtitle}>Tap each event for full details, venue, and dress code</Text>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {EVENTS.map((event, index) => (
          <View key={event.id} style={styles.timelineItem}>
            {/* Connector line */}
            {index < EVENTS.length - 1 && <View style={styles.connector} />}
            {/* Dot */}
            <View style={styles.dot} />
            <View style={styles.timelineContent}>
              <EventCard event={event} />
            </View>
          </View>
        ))}
      </View>

      {/* Footer note */}
      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          🔔 All times are Central European Summer Time (CEST / UTC+2)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },

  pageHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  pageEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  pageTitle: {
    fontSize: Typography.xxl,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  timeline: { paddingLeft: Spacing.xl, paddingRight: Spacing.lg },
  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md, position: 'relative' },
  connector: {
    position: 'absolute',
    left: -16,
    top: 24,
    bottom: -Spacing.md,
    width: 2,
    backgroundColor: Colors.secondaryLight,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    position: 'absolute',
    left: -22,
    top: 18,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  timelineContent: { flex: 1 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  eventEmoji: { fontSize: 28, marginRight: Spacing.sm, marginTop: 2 },
  cardHeaderText: { flex: 1 },
  eventTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  eventDateTime: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: Typography.sm,
    color: Colors.secondary,
    fontWeight: '600',
  },

  cardBody: { marginTop: Spacing.sm },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  infoIcon: { marginRight: Spacing.sm, marginTop: 2 },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  dressCodeCard: {
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dressCodeLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dressCodeText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  description: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },

  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBF0',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  notesIcon: { fontSize: 16, marginRight: Spacing.xs },
  notesText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  footerNote: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.sageLight,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.xs,
    color: Colors.sageDark,
    textAlign: 'center',
  },
});
