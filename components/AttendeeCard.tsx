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
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {attendee.canonical_name}
          </Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {attendee.bio ? (
          <Text style={styles.bio}>{attendee.bio}</Text>
        ) : (
          <Text style={styles.bioEmpty}>Attending {attendee.is_wedding_party ? '· wedding party' : ''}</Text>
        )}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  avatarWrapper: {
    marginRight: Spacing.md,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceWarm,
  },
  avatarInitials: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 18,
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  body: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.gold,
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
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  bioEmpty: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
