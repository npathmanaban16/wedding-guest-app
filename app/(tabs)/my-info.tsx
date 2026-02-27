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
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getMyInfo, saveMyInfo, MyInfo } from '@/services/storage';

const HOTEL_OPTIONS = [
  'Hotel Zermatterhof',
  'Mont Cervin Palace',
  'Riffelalp Resort',
  'Hotel Julen',
  'Hotel Alex Zermatt',
  'Cervo Mountain Resort',
  'Hotel Riffelberg',
  'AirBnb / Other rental',
  'Day trip (not staying overnight)',
];

const DIETARY_OPTIONS = [
  'No restrictions',
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Halal',
  'Kosher',
  'Nut allergy',
  'Dairy-free',
  'Other (please specify below)',
];

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: FieldProps) {
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
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="sentences"
      />
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
              <Text
                style={[styles.optionText, value === opt && styles.optionTextSelected]}
              >
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
    dietary: '',
    songRequest: '',
    extraNotes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyInfo().then((data) => {
      setInfo(data);
      setLoading(false);
    });
  }, []);

  const update = (key: keyof MyInfo) => (value: string) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveMyInfo(info);
    setSaving(false);
    setSaved(true);
    Alert.alert('Saved! 🎉', 'Your details have been saved on this device.');
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
          <Text style={styles.pageEmoji}>✈️</Text>
          <Text style={styles.pageTitle}>My Details</Text>
          <Text style={styles.pageSubtitle}>
            Help us plan for your arrival and make sure we have everything just right for you!
          </Text>
        </View>

        {/* Guest name display */}
        <View style={[styles.guestBadge, Shadow.small]}>
          <Ionicons name="person-circle-outline" size={28} color={Colors.primary} />
          <View style={styles.guestBadgeText}>
            <Text style={styles.guestBadgeLabel}>Logged in as</Text>
            <Text style={styles.guestBadgeName}>{guestName}</Text>
          </View>
        </View>

        {/* Accommodation section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏨 Accommodation</Text>
          <PickerField
            label="Where are you staying?"
            options={HOTEL_OPTIONS}
            value={info.hotel}
            onChange={update('hotel')}
          />
          <Field
            label="Check-in date"
            value={info.checkIn}
            onChange={update('checkIn')}
            placeholder="e.g. Friday 14 August 2026"
          />
          <Field
            label="Check-out date"
            value={info.checkOut}
            onChange={update('checkOut')}
            placeholder="e.g. Sunday 16 August 2026"
          />
        </View>

        {/* Arrival section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🚄 Arrival</Text>
          <Field
            label="Estimated arrival time in Zermatt"
            value={info.arrivalTime}
            onChange={update('arrivalTime')}
            placeholder="e.g. Friday 3:00 PM"
          />
          <Field
            label="Flight number (if applicable)"
            value={info.flightNumber}
            onChange={update('flightNumber')}
            placeholder="e.g. LX1234 arriving Zurich 11:30"
          />
        </View>

        {/* Dietary section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🍽️ Dietary Requirements</Text>
          <PickerField
            label="Any dietary requirements?"
            options={DIETARY_OPTIONS}
            value={info.dietary}
            onChange={update('dietary')}
          />
          {(info.dietary === 'Other (please specify below)' || info.dietary === 'Nut allergy') && (
            <Field
              label="Please specify"
              value={info.extraNotes}
              onChange={update('extraNotes')}
              placeholder="Please describe your dietary needs..."
              multiline
            />
          )}
        </View>

        {/* Song request section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🎵 Song Request</Text>
          <Text style={styles.sectionSubtext}>
            Got a song you'd love to hear at the reception? Pop it here (or use the Song Requests tab for more!).
          </Text>
          <Field
            label="Your favourite song request"
            value={info.songRequest}
            onChange={update('songRequest')}
            placeholder="e.g. Jai Ho — A.R. Rahman"
          />
        </View>

        {/* Extra notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💬 Anything else?</Text>
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
              <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>{saved ? 'Saved!' : 'Save my details'}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          Your details are saved on this device. We may contact you about your responses to help plan the wedding.
        </Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.textMuted} />
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
    paddingBottom: Spacing.lg,
  },
  pageEmoji: { fontSize: 48, marginBottom: Spacing.sm },
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

  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  guestBadgeText: { flex: 1, marginLeft: Spacing.sm },
  guestBadgeLabel: { fontSize: Typography.xs, color: Colors.textMuted },
  guestBadgeName: { fontSize: Typography.base, fontFamily: Typography.serif, color: Colors.textPrimary },

  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.small,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtext: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  pickerValue: {
    flex: 1,
    fontSize: Typography.base,
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
  optionItemSelected: {
    backgroundColor: Colors.surfaceWarm,
  },
  optionText: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
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
    fontSize: Typography.base,
    fontWeight: '600',
  },

  privacyNote: {
    fontSize: Typography.xs,
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
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
