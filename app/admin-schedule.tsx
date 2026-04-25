import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import {
  EVENTS_NN,
  EVENTS_DEMO,
  NN_WEDDING_IDS,
  WeddingEvent,
} from '@/constants/weddingData';
import { getEventTimeOverrides, setEventTimeOverride } from '@/services/storage';

export default function AdminScheduleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, isAdmin, wedding } = useWedding();

  const events: WeddingEvent[] = NN_WEDDING_IDS.has(wedding.id) ? EVENTS_NN : EVENTS_DEMO;

  // edited[eventId] = current text in the input (override if set, else default)
  const [edited, setEdited] = useState<Record<string, string>>({});
  // saved[eventId] = the latest server value, used to diff for the Save button
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    getEventTimeOverrides(weddingId)
      .then((overrides) => {
        const initial: Record<string, string> = {};
        for (const e of events) {
          initial[e.id] = overrides[e.id] ?? e.time;
        }
        setSaved(initial);
        setEdited(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weddingId, events]);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const handleSave = async (eventId: string) => {
    const value = edited[eventId]?.trim();
    if (!value) return;
    haptic.medium();
    setSavingId(eventId);
    try {
      await setEventTimeOverride(weddingId, eventId, value);
      setSaved((prev) => ({ ...prev, [eventId]: value }));
    } catch {
      Alert.alert('Error', 'Could not save the time. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Schedule Times</Text>
          <Text style={styles.pageSubtitle}>
            Edit the time displayed on each event in the schedule.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          events.map((event) => {
            const value = edited[event.id] ?? '';
            const dirty = value.trim() !== (saved[event.id] ?? '').trim();
            const empty = !value.trim();
            const isSavingThis = savingId === event.id;
            return (
              <View key={event.id} style={styles.card}>
                <Text style={styles.eventTitle}>
                  {event.emoji ? `${event.emoji}  ` : ''}{event.title}
                </Text>
                <Text style={styles.eventDate}>{event.date}</Text>

                <Text style={styles.fieldLabel}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={(text) =>
                    setEdited((prev) => ({ ...prev, [event.id]: text }))
                  }
                  placeholder="e.g. 6:30 PM – 11:00 PM"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => handleSave(event.id)}
                    disabled={!dirty || empty || isSavingThis}
                    style={[
                      styles.saveBtn,
                      (!dirty || empty || isSavingThis) && styles.saveBtnDisabled,
                    ]}
                    activeOpacity={0.85}
                  >
                    {isSavingThis ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>{dirty ? 'Save' : 'Saved'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.footnote}>
          Changes apply to all guests on their next app open. Other event
          fields (date, venue, dress code) can only be changed in code.
        </Text>

        <View style={{ height: insets.bottom + Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
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

  loader: { marginTop: Spacing.xxl },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  eventTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  eventDate: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.full,
    minWidth: 88,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  footnote: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
