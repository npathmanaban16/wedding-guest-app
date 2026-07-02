import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import { updateWeddingSettings } from '@/services/wedding';

// App Features — per-wedding feature flags the couple/planner can flip
// without a code deploy. Currently just the Attendees directory; new
// flags follow the same optimistic-toggle pattern below.
export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, isAdmin, wedding, patchWedding } = useWedding();

  const attendeesEnabled = wedding.attendees_enabled !== false;
  const [savingAttendees, setSavingAttendees] = useState(false);

  // Guard — should not be reachable via normal navigation, but just in case
  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const handleToggleAttendees = async () => {
    if (savingAttendees) return;
    haptic.selection();
    const next = !attendeesEnabled;
    // Optimistic: flip the in-memory wedding row so the whole app
    // (Messages tabs, My Details profile card) updates immediately,
    // then persist. Revert on failure.
    patchWedding({ attendees_enabled: next });
    setSavingAttendees(true);
    try {
      await updateWeddingSettings(weddingId, { attendees_enabled: next });
    } catch {
      patchWedding({ attendees_enabled: !next });
      Alert.alert('Error', 'Could not save the setting. Please try again.');
    } finally {
      setSavingAttendees(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>App Features</Text>
        <Text style={styles.pageSubtitle}>Turn parts of the guest app on or off</Text>
      </View>

      {/* Attendees directory + guest profiles */}
      <TouchableOpacity
        style={styles.featureRow}
        onPress={handleToggleAttendees}
        activeOpacity={0.8}
        disabled={savingAttendees}
      >
        <View style={styles.featureIcon}>
          <Ionicons name="people-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.featureText}>
          <Text style={styles.featureLabel}>Attendees & guest profiles</Text>
          <Text style={styles.featureHint}>
            {attendeesEnabled
              ? 'Guests can browse the Attendees list on Messages and add a profile photo and bio on My Details.'
              : 'The Attendees tab and the profile photo/bio editor are hidden for all guests.'}
          </Text>
        </View>
        <View style={[styles.toggleTrack, attendeesEnabled && styles.toggleTrackActive]}>
          <View style={[styles.toggleThumb, attendeesEnabled && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Changes apply to everyone the next time their app refreshes. Guest
        photos and bios are kept, so turning the directory back on restores
        them.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

  guard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guardText: { fontFamily: Fonts.sans, color: Colors.textMuted },

  header: { marginBottom: Spacing.xl },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  featureText: { flex: 1, marginRight: Spacing.md },
  featureLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackActive: { backgroundColor: Colors.primary },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  toggleThumbActive: { transform: [{ translateX: 18 }] },

  footnote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    paddingHorizontal: Spacing.xs,
  },
});
