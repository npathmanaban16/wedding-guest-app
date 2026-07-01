import React, { useEffect, useMemo, useState } from 'react';
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
import { WeddingEvent } from '@/constants/weddingData';
import {
  getEventOverrides,
  setEventOverride,
  type EventOverridePatch,
} from '@/services/storage';

// The fields admins can edit, in order of appearance. Mirrors EventOverridePatch
// minus weddingPartyOnly (rendered as a separate visibility control below).
type TextField = 'title' | 'date' | 'time' | 'venue' | 'address' | 'dressCode' | 'description' | 'notes';

interface FieldDef {
  key: TextField;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'title',       label: 'Title',       placeholder: 'e.g. Welcome Dinner' },
  { key: 'date',        label: 'Date',        placeholder: 'e.g. Thursday, 21 May 2026' },
  { key: 'time',        label: 'Time',        placeholder: 'e.g. 6:30 PM – 11:00 PM' },
  { key: 'venue',       label: 'Venue',       placeholder: 'e.g. Fairmont Le Montreux Palace' },
  { key: 'address',     label: 'Address',     placeholder: 'e.g. Avenue Claude-Nobs 2, 1820 Montreux' },
  { key: 'dressCode',   label: 'Dress code',  placeholder: 'e.g. Cocktail attire' },
  { key: 'description', label: 'Description', placeholder: 'Short description shown when the card is expanded', multiline: true },
  { key: 'notes',       label: 'Notes',       placeholder: 'Optional notes shown under the description',       multiline: true },
];

interface DraftEvent {
  // Merged code-default ⊕ saved override; this is what shows in the inputs
  // and what we diff against to know if anything changed.
  values: Record<TextField, string>;
  // Effective visibility: true = wedding party only, false = everyone.
  // Initialized from the saved override if present, else from the event's
  // coded default. Saved as an override only when it differs from default.
  weddingPartyOnly: boolean;
}

// Read text from a merged event for a given field.
function eventField(event: WeddingEvent, key: TextField): string {
  switch (key) {
    case 'title':       return event.title ?? '';
    case 'date':        return event.date ?? '';
    case 'time':        return event.time ?? '';
    case 'venue':       return event.venue ?? '';
    case 'address':     return event.address ?? '';
    case 'dressCode':   return event.dressCode ?? '';
    case 'description': return event.description ?? '';
    case 'notes':       return event.notes ?? '';
  }
}

// Build a save patch from a draft + the original code-default event.
// Only fields the admin actually changed away from the code default get
// included; everything else stays NULL on the server so future code
// updates to that field flow through to guests.
function diffToPatch(draft: DraftEvent, codeDefault: WeddingEvent): EventOverridePatch {
  const patch: EventOverridePatch = {};
  for (const f of FIELDS) {
    const current = draft.values[f.key].trim();
    const def = eventField(codeDefault, f.key).trim();
    if (current !== def) {
      // For required fields, a cleared input falls back to the default
      // rather than persisting an empty string.
      if (current === '') continue;
      (patch as Record<string, string>)[f.key] = current;
    }
  }
  if (draft.weddingPartyOnly !== !!codeDefault.weddingPartyOnly) {
    patch.weddingPartyOnly = draft.weddingPartyOnly;
  }
  return patch;
}

export default function AdminScheduleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, isAdmin, wedding, events } = useWedding();

  // "Base" events to apply admin overrides on top of. For tenants on
  // wedding_events these are the DB rows; for legacy tenants they're
  // the code constants. Either way the override flow works the same.
  const codeEvents: WeddingEvent[] = events;

  const [drafts, setDrafts] = useState<Record<string, DraftEvent>>({});
  const [saved, setSaved] = useState<Record<string, DraftEvent>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Accordion: at most one event expanded at a time so the screen doesn't
  // become a wall of TextInputs.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getEventOverrides(weddingId)
      .then((overrides) => {
        const initial: Record<string, DraftEvent> = {};
        for (const e of codeEvents) {
          const patch = overrides[e.id] ?? {};
          const merged = { ...e, ...patch };
          const draft: DraftEvent = {
            values: {
              title:       eventField(merged, 'title'),
              date:        eventField(merged, 'date'),
              time:        eventField(merged, 'time'),
              venue:       eventField(merged, 'venue'),
              address:     eventField(merged, 'address'),
              dressCode:   eventField(merged, 'dressCode'),
              description: eventField(merged, 'description'),
              notes:       eventField(merged, 'notes'),
            },
            weddingPartyOnly: patch.weddingPartyOnly ?? !!e.weddingPartyOnly,
          };
          initial[e.id] = draft;
        }
        setDrafts(initial);
        setSaved(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weddingId, codeEvents]);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const updateField = (eventId: string, key: TextField, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        values: { ...prev[eventId].values, [key]: value },
      },
    }));
  };

  const setVisibility = (eventId: string, v: boolean) => {
    setDrafts((prev) => ({ ...prev, [eventId]: { ...prev[eventId], weddingPartyOnly: v } }));
  };

  const handleToggle = (eventId: string) => {
    haptic.light();
    setExpandedId((cur) => (cur === eventId ? null : eventId));
  };

  const handleSave = async (eventId: string) => {
    const draft = drafts[eventId];
    const codeDefault = codeEvents.find((e) => e.id === eventId);
    if (!draft || !codeDefault) return;
    haptic.medium();
    setSavingId(eventId);
    try {
      const patch = diffToPatch(draft, codeDefault);
      await setEventOverride(weddingId, eventId, patch);
      setSaved((prev) => ({ ...prev, [eventId]: draft }));
    } catch {
      Alert.alert('Error', 'Could not save the event. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const isDirty = (eventId: string): boolean => {
    const d = drafts[eventId];
    const s = saved[eventId];
    if (!d || !s) return false;
    if (d.weddingPartyOnly !== s.weddingPartyOnly) return true;
    for (const f of FIELDS) {
      if (d.values[f.key] !== s.values[f.key]) return true;
    }
    return false;
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
          <Text style={styles.pageTitle}>Schedule</Text>
          <Text style={styles.pageSubtitle}>
            Edit the text shown for each event. Tap an event to expand.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          codeEvents.map((event) => {
            const draft = drafts[event.id];
            if (!draft) return null;
            const expanded = expandedId === event.id;
            const dirty = isDirty(event.id);
            const isSavingThis = savingId === event.id;
            const headerTitle = draft.values.title || event.title;
            const headerSub = draft.values.date || event.date;
            return (
              <View key={event.id} style={styles.card}>
                <TouchableOpacity
                  onPress={() => handleToggle(event.id)}
                  activeOpacity={0.7}
                  style={styles.cardHeader}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>
                      {event.emoji ? `${event.emoji}  ` : ''}{headerTitle}
                    </Text>
                    <Text style={styles.eventDate}>{headerSub}</Text>
                  </View>
                  {dirty && <View style={styles.dirtyDot} />}
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.cardBody}>
                    {FIELDS.map((f) => (
                      <View key={f.key} style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>{f.label}</Text>
                        <TextInput
                          style={[styles.input, f.multiline && styles.inputMultiline]}
                          value={draft.values[f.key]}
                          onChangeText={(text) => updateField(event.id, f.key, text)}
                          placeholder={f.placeholder}
                          placeholderTextColor={Colors.textMuted}
                          multiline={f.multiline}
                          textAlignVertical={f.multiline ? 'top' : 'center'}
                          autoCapitalize="sentences"
                          autoCorrect
                        />
                      </View>
                    ))}

                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Visibility</Text>
                      <View style={styles.visibilityRow}>
                        {([
                          { v: false, label: 'Everyone' },
                          { v: true,  label: 'Wedding party only' },
                        ] as { v: boolean; label: string }[]).map(({ v, label }) => {
                          const active = draft.weddingPartyOnly === v;
                          return (
                            <TouchableOpacity
                              key={String(v)}
                              onPress={() => setVisibility(event.id, v)}
                              activeOpacity={0.7}
                              style={[styles.visibilityChip, active && styles.visibilityChipActive]}
                            >
                              <Text style={[styles.visibilityChipText, active && styles.visibilityChipTextActive]}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        onPress={() => handleSave(event.id)}
                        disabled={!dirty || isSavingThis}
                        style={[
                          styles.saveBtn,
                          (!dirty || isSavingThis) && styles.saveBtnDisabled,
                        ]}
                        activeOpacity={0.85}
                      >
                        {isSavingThis ? (
                          <ActivityIndicator color={Colors.white} size="small" />
                        ) : (
                          <Text style={styles.saveBtnText}>{dirty ? 'Save event' : 'Saved'}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footnote}>
          Changes apply to all guests on their next app open. Clearing a field
          reverts it to the original. Editing the displayed date does not
          change calendar exports or the order events appear — those still
          use the event's underlying datetime.
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
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  cardBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
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
  },
  dirtyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
  },

  fieldRow: { marginTop: Spacing.md },
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
  inputMultiline: {
    minHeight: 80,
    paddingTop: 10,
  },

  visibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  visibilityChip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  visibilityChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  visibilityChipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  visibilityChipTextActive: { color: Colors.white },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.full,
    minWidth: 110,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
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
