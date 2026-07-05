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

// The flippable flags on the weddings row. Each renders as one
// toggle row below; adding a future flag means adding an entry here
// plus its column migration + gating at the consuming screens.
type FeatureFlag =
  | 'attendees_enabled'
  | 'chat_enabled'
  | 'onboarding_enabled'
  | 'ai_enabled';

function FeatureToggleRow({
  icon,
  label,
  hintOn,
  hintOff,
  enabled,
  saving,
  onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hintOn: string;
  hintOff: string;
  enabled: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.featureRow}
      onPress={onToggle}
      activeOpacity={0.8}
      disabled={saving}
    >
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureHint}>{enabled ? hintOn : hintOff}</Text>
      </View>
      <View style={[styles.toggleTrack, enabled && styles.toggleTrackActive]}>
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

// App Features — per-wedding feature flags the couple/planner can flip
// without a code deploy.
export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, isAdmin, wedding, patchWedding } = useWedding();

  const [saving, setSaving] = useState<FeatureFlag | null>(null);

  // Guard — should not be reachable via normal navigation, but just in case
  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const handleToggle = async (flag: FeatureFlag) => {
    if (saving) return;
    haptic.selection();
    const next = wedding[flag] === false;
    // Optimistic: flip the in-memory wedding row so the whole app
    // (Messages tabs, My Details profile card) updates immediately,
    // then persist. Revert on failure.
    patchWedding({ [flag]: next });
    setSaving(flag);
    try {
      await updateWeddingSettings(weddingId, { [flag]: next });
    } catch {
      patchWedding({ [flag]: !next });
      Alert.alert('Error', 'Could not save the setting. Please try again.');
    } finally {
      setSaving(null);
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

      <FeatureToggleRow
        icon="people-outline"
        label="Attendees & guest profiles"
        hintOn="Guests can browse the Attendees list on Messages and add a profile photo and bio on My Details."
        hintOff="The Attendees tab and the profile photo/bio editor are hidden for all guests."
        enabled={wedding.attendees_enabled !== false}
        saving={saving === 'attendees_enabled'}
        onToggle={() => handleToggle('attendees_enabled')}
      />

      <FeatureToggleRow
        icon="chatbubbles-outline"
        label="Guest chat"
        hintOn="Guests can post to everyone in the Chat tab on Messages."
        hintOff="The Chat tab is hidden for all guests. Announcements are unaffected."
        enabled={wedding.chat_enabled !== false}
        saving={saving === 'chat_enabled'}
        onToggle={() => handleToggle('chat_enabled')}
      />

      <FeatureToggleRow
        icon="airplane-outline"
        label="Arrival details onboarding"
        hintOn="New guests are asked for hotel and arrival details when they first sign in."
        hintOff="Guests land straight on Home. Travel details can still be added on My Details."
        enabled={wedding.onboarding_enabled !== false}
        saving={saving === 'onboarding_enabled'}
        onToggle={() => handleToggle('onboarding_enabled')}
      />

      <FeatureToggleRow
        icon="sparkles-outline"
        label="Ask AI assistant"
        hintOn="The floating Ask button appears on every tab so guests can chat with the AI assistant about the wedding."
        hintOff="The Ask button is hidden for all guests. Past Q&A history is kept and returns when the assistant is turned back on."
        enabled={wedding.ai_enabled !== false}
        saving={saving === 'ai_enabled'}
        onToggle={() => handleToggle('ai_enabled')}
      />

      <Text style={styles.footnote}>
        Changes apply to everyone the next time their app refreshes. Nothing
        is deleted when a feature is off — profiles, chat history, and any
        submitted details come back when it's turned on again.
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
