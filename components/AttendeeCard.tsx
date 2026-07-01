import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import type { GuestRow } from '@/services/wedding';

interface AttendeeCardProps {
  attendee: GuestRow;
  // Callout adjacent to the name (e.g. "You" for the current guest, or
  // "Wedding party" for members of the party). Optional.
  badge?: string;
}

// Square-ish card rendered inside a 2-column grid on the Attendees tab.
// Photo (or initials) sits at the top, name centered below, optional
// badge, then bio. No "Attending" fallback text — an empty bio just
// doesn't render.
export function AttendeeCard({ attendee, badge }: AttendeeCardProps) {
  const initials = getInitials(attendee.canonical_name);
  const hasPhoto = !!attendee.profile_photo_url;

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrapper}>
        {hasPhoto ? (
          <Image
            source={{ uri: attendee.profile_photo_url! }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarInitials}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {attendee.canonical_name}
      </Text>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {attendee.bio && (
        <Text style={styles.bio} numberOfLines={3}>
          {attendee.bio}
        </Text>
      )}
    </View>
  );
}

// Split "Neha Pathmanaban" → "NP", "Cher" → "C", drop punctuation.
function getInitials(name: string): string {
  const clean = name.trim().replace(/[^\p{L}\s]/gu, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  avatarWrapper: {
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceWarm,
  },
  avatarInitials: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 26,
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  name: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.gold,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.gold,
  },
  bio: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 2,
  },
});
