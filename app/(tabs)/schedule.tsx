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
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
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
      style={styles.card}
      onPress={toggle}
      activeOpacity={0.9}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDateTime}>{event.date}</Text>
          <Text style={styles.eventTime}>{event.time}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
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
            <Text style={styles.dressCodeLabel}>Dress Code</Text>
            <Text style={styles.dressCodeText}>{event.dressCode}</Text>
          </View>

          <Text style={styles.description}>{event.description}</Text>

          {event.notes && (
            <View style={styles.notesCard}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.gold} style={{ marginRight: Spacing.xs, marginTop: 1 }} />
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
      <Ionicons name={icon} size={15} color={Colors.primary} style={styles.infoIcon} />
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
        <Text style={styles.pageTitle}>Wedding Schedule</Text>
        <Text style={styles.pageSubtitleTag}>Programme</Text>
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
        <Ionicons name="time-outline" size={14} color={Colors.textMuted} style={{ marginRight: Spacing.xs }} />
        <Text style={styles.footerText}>
          All times are Central European Summer Time (CEST / UTC+2)
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  pageTitle: {
    fontSize: 34,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitleTag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: Spacing.sm,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
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
    width: 1,
    backgroundColor: Colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    position: 'absolute',
    left: -21,
    top: 19,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  timelineContent: { flex: 1 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardHeaderText: { flex: 1 },
  eventTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  eventDateTime: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
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
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  dressCodeCard: {
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  dressCodeLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: 4,
  },
  dressCodeText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  description: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },

  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.gold,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
