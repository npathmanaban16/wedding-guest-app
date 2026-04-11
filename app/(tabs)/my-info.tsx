import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getMyInfo, saveMyInfo, MyInfo } from '@/services/storage';

const HOTEL_OPTIONS = [
  'Fairmont Le Montreux Palace (wedding hotel)',
  'Hôtel Suisse & Majestic',
  'Hotel Eden Palace au Lac',
  'Eurotel Riviera Montreux',
  'Maison Décotterd',
  'Hôtel du Grand Lac Excelsior',
  'Golf Hôtel René Capt',
  'AirBnb / Other rental',
  'Staying in Lausanne or nearby',
  'Day trip (not staying overnight)',
];

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

function Field({ label, value, onChange, placeholder, multiline }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize="sentences"
      />
    </View>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyText}>{value || '—'}</Text>
      </View>
    </View>
  );
}

interface PickerFieldProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

function PickerField({ label, options, value, onChange }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={[styles.pickerValue, !value && { color: Colors.textMuted }]}>
          {value || 'Tap to select...'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.optionsList, Shadow.medium]}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.optionItem, value === opt && styles.optionItemSelected]}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <Text style={[styles.optionText, value === opt && styles.optionTextSelected]}>
                {opt}
              </Text>
              {value === opt && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function MyInfoScreen() {
  const insets = useSafeAreaInsets();
  const { guestName, logout } = useAuth();
  const [info, setInfo] = useState<MyInfo>({
    hotel: '',
    checkIn: '',
    checkOut: '',
    arrivalTime: '',
    flightNumber: '',
    extraNotes: '',
    dietary: '',
    meal1: '',
    meal2: '',
    meal3: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (guestName) {
      getMyInfo(guestName).then((data) => {
        setInfo(data);
        setLoading(false);
      });
    }
  }, [guestName]);

  const update = (key: keyof MyInfo) => (value: string) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!guestName) return;
    setSaving(true);
    await saveMyInfo(guestName, info);
    setSaving(false);
    setSaved(true);
    Alert.alert('Saved!', 'Your details have been saved.');
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Details</Text>
          <Text style={styles.pageSubtitleTag}>Your Information</Text>
          <Text style={styles.pageSubtitle}>
            Help us plan for your arrival and make sure we have everything just right for you!
          </Text>
        </View>

        {/* Guest name display */}
        <View style={styles.guestBadge}>
          <Ionicons name="person-circle-outline" size={26} color={Colors.primary} />
          <View style={styles.guestBadgeText}>
            <Text style={styles.guestBadgeLabel}>Logged in as</Text>
            <Text style={styles.guestBadgeName}>{guestName}</Text>
          </View>
        </View>

        {/* Accommodation section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Accommodation</Text>
          <Text style={styles.sectionTitle}>Where are you staying?</Text>
          <PickerField
            label="Hotel or accommodation"
            options={HOTEL_OPTIONS}
            value={info.hotel}
            onChange={update('hotel')}
          />
          <Field
            label="Check-in date"
            value={info.checkIn}
            onChange={update('checkIn')}
            placeholder="e.g. Friday 22 May 2026"
          />
          <Field
            label="Check-out date"
            value={info.checkOut}
            onChange={update('checkOut')}
            placeholder="e.g. Sunday 24 May 2026"
          />
        </View>

        {/* Arrival section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Arrival</Text>
          <Text style={styles.sectionTitle}>Getting to Montreux</Text>
          <Field
            label="Estimated arrival time in Montreux"
            value={info.arrivalTime}
            onChange={update('arrivalTime')}
            placeholder="e.g. Thursday 3:00 PM"
          />
          <Field
            label="Flight number (if applicable)"
            value={info.flightNumber}
            onChange={update('flightNumber')}
            placeholder="e.g. LX1234 arriving Geneva 11:30"
          />
        </View>

        {/* Meal choices — pre-collected, read-only */}
        {(info.meal1 || info.meal2 || info.meal3) ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTag}>Menu</Text>
            <Text style={styles.sectionTitle}>Your Meal Selections</Text>
            <Text style={styles.sectionSubtext}>
              Your meal choices from your RSVP. Contact us if anything needs to change.
            </Text>
            <ReadOnlyField label="Starter" value={info.meal1} />
            <ReadOnlyField label="Second Course" value={info.meal2} />
            <ReadOnlyField label="Main Course" value={info.meal3} />
          </View>
        ) : null}

        {/* Dietary — pre-collected, read-only */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Dietary</Text>
          <Text style={styles.sectionTitle}>Dietary Requirements</Text>
          {info.dietary ? (
            <>
              <Text style={styles.sectionSubtext}>
                We have noted the following from your RSVP. Contact us if anything has changed.
              </Text>
              <View style={styles.dietaryBadge}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.dietaryBadgeText}>{info.dietary}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.noRestrictions}>
              No dietary restrictions noted from your RSVP. If anything has changed, please contact us.
            </Text>
          )}
        </View>

        {/* Extra notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Notes</Text>
          <Text style={styles.sectionTitle}>Anything else?</Text>
          <Text style={styles.sectionSubtext}>
            Accessibility needs, special requests, or just a message for the couple?
          </Text>
          <Field
            label="Notes for Neha & Naveen"
            value={info.extraNotes}
            onChange={update('extraNotes')}
            placeholder="Type your message here..."
            multiline
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={19} color={Colors.white} />
              <Text style={styles.saveButtonText}>{saved ? 'Saved!' : 'Save my details'}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          Your accommodation and arrival details are shared with Neha & Naveen to help with planning.
        </Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={17} color={Colors.textMuted} />
          <Text style={styles.logoutText}>Switch guest account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

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

  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  guestBadgeText: { flex: 1, marginLeft: Spacing.sm },
  guestBadgeLabel: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  guestBadgeName: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  sectionTag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  sectionSubtext: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  readOnlyField: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceWarm,
  },
  readOnlyText: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },

  dietaryBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  dietaryBadgeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  noRestrictions: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 20,
  },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  pickerValue: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },
  optionsList: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  optionItemSelected: { backgroundColor: Colors.surfaceWarm },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    marginHorizontal: Spacing.lg,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    ...Shadow.medium,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
  },

  privacyNote: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  logoutText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
