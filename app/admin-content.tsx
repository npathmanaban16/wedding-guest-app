import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';

// Menu screen listing everything an admin can edit under "App Content".
// Adding a new content editor is a matter of dropping another
// ContentLink row here — no other wiring needed since each editor is
// a self-contained screen.

// `as const` preserves the literal href strings so router.push()
// accepts them under Expo Router's typed Href.
const LINKS = [
  {
    href: '/admin-schedule',
    icon: 'calendar-outline',
    label: 'Schedule',
    hint: 'Edit the text shown for each wedding event — title, date, venue, dress code, and more.',
  },
  {
    href: '/admin-packing',
    icon: 'briefcase-outline',
    label: 'Packing List',
    hint: 'Edit categories and items on the Packing tab, including per-guest visibility flags.',
  },
  {
    href: '/admin-guide',
    icon: 'map-outline',
    label: 'Travel Guide',
    hint: 'Edit page copy, filter pills, quick facts, and the sections tree on the Travel tab.',
  },
  {
    href: '/admin-guide-photos',
    icon: 'images-outline',
    label: 'Travel Photos',
    hint: 'Upload and reorder the photo carousel that appears at the top of the Travel tab.',
  },
] as const;

export default function AdminContentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { isAdmin } = useWedding();

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Edit App Content</Text>
        <Text style={styles.pageSubtitle}>
          Update the schedule, travel photos, and other content guests see in the app.
        </Text>
      </View>

      {LINKS.map((link) => (
        <TouchableOpacity
          key={link.href}
          style={styles.linkRow}
          onPress={() => router.push(link.href)}
          activeOpacity={0.85}
        >
          <View style={styles.linkIcon}>
            <Ionicons name={link.icon} size={18} color={Colors.primary} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkLabel}>{link.label}</Text>
            <Text style={styles.linkHint}>{link.hint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      <View style={{ height: insets.bottom + Spacing.xxl }} />
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
    lineHeight: 19,
  },

  linkRow: {
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
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  linkText: { flex: 1, marginRight: Spacing.md },
  linkLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  linkHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
});
