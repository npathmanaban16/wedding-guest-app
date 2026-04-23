import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { DEFAULT_WEDDING_ID, getTravelWindow } from '@/constants/weddingData';
import { getMyInfo, saveMyInfo, deleteMyAccount, MyInfo } from '@/services/storage';
import { HotelPickerField } from '@/components/HotelPickerField';
import { DateField } from '@/components/DateField';

// Kept in sync with WeddingContext's WEDDING_ID_STORAGE_KEY. Inlined here
// so sign-out can drop the persisted wedding id without also clearing the
// in-memory context state — clearing context state mid-sign-out can throw
// on any still-mounted screen that calls useWedding().
const WEDDING_ID_STORAGE_KEY = '@wedding_id';

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType, autoCapitalize }: FieldProps) {
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
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
        autoCorrect={false}
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

export default function MyInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName, logout } = useAuth();
  const { weddingId, wedding } = useWedding();

  // Travel window is keyed on the actual weddingId (not the build variant)
  // so the N&N wedding always gets its 2026 window even when reached from
  // the SaaS/Tetherly build.
  const travel = getTravelWindow(weddingId);

  // SaaS: navigate to /invite explicitly and clear storage so the next
  // cold launch also routes to /invite. We do NOT call clearWeddingId()
  // — that mutates in-memory WeddingContext state, which can throw on
  // any screen that's mid-unmount and still calling useWedding().
  const handleSignOut = async () => {
    if (DEFAULT_WEDDING_ID === null) {
      router.replace('/invite');
      await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
    }
    await logout();
  };

  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = () => {
    if (!guestName || deleting) return;
    Alert.alert(
      'Delete your account?',
      'This permanently removes your travel details, packing list, song requests, message replies, and reactions for this wedding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteMyAccount(weddingId, guestName);
              if (DEFAULT_WEDDING_ID === null) {
                router.replace('/invite');
                await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
              }
              await logout();
            } catch {
              setDeleting(false);
              Alert.alert(
                'Could not delete account',
                'Something went wrong. Please check your connection and try again.',
              );
            }
          },
        },
      ],
    );
  };
  const [info, setInfo] = useState<MyInfo>({
    hotel: '',
    checkIn: '',
    checkOut: '',
    arrivalTime: '',
    flightNumber: '',
    extraNotes: '',
    phone: '',
    email: '',
    dietary: '',
    meal1: '',
    meal2: '',
    meal3: '',
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (guestName) {
      getMyInfo(weddingId, guestName).then((data) => {
        setInfo(data);
        setLoading(false);
      });
    }
  }, [weddingId, guestName]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const persist = useCallback(async (updated: MyInfo) => {
    if (!guestName) return;
    setSaveStatus('saving');
    await saveMyInfo(weddingId, guestName, updated);
    setSaveStatus('saved');
  }, [weddingId, guestName]);

  // For text fields: debounce 1 second after typing stops
  const update = (key: keyof MyInfo) => (value: string) => {
    setInfo((prev) => {
      const updated = { ...prev, [key]: value };
      setSaveStatus('idle');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(updated), 1000);
      return updated;
    });
  };

  // For pickers / date fields: save immediately
  const updateImmediate = (key: keyof MyInfo) => (value: string) => {
    setInfo((prev) => {
      const updated = { ...prev, [key]: value };
      clearTimeout(saveTimer.current);
      persist(updated);
      return updated;
    });
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
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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

        {/* Contact section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Contact</Text>
          <Text style={styles.sectionTitle}>Your contact details</Text>
          <Text style={styles.sectionSubtext}>
            So we can reach you if anything changes before or during the trip.
          </Text>
          <Field
            label="Phone number"
            value={info.phone}
            onChange={update('phone')}
            placeholder="e.g. +1 (555) 000-0000"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Field
            label="Email address"
            value={info.email}
            onChange={update('email')}
            placeholder="e.g. your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Accommodation section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Accommodation</Text>
          <Text style={styles.sectionTitle}>Where are you staying?</Text>
          <HotelPickerField
            label="Hotel or accommodation"
            value={info.hotel}
            onChange={updateImmediate('hotel')}
            scrollRef={scrollRef}
          />
          <DateField
            label="Check-in date"
            value={info.checkIn}
            onChange={updateImmediate('checkIn')}
            placeholder="Select date"
            minimumDate={travel.min}
            maximumDate={travel.max}
            initialDate={travel.checkInInitial}
          />
          <DateField
            label="Check-out date"
            value={info.checkOut}
            onChange={updateImmediate('checkOut')}
            placeholder="Select date"
            minimumDate={travel.min}
            maximumDate={travel.max}
            initialDate={travel.checkOutInitial}
          />
        </View>

        {/* Arrival section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Arrival</Text>
          <Text style={styles.sectionTitle}>Getting to {wedding.destination_city}</Text>
          <Field
            label={`Estimated arrival time in ${wedding.destination_city}`}
            value={info.arrivalTime}
            onChange={update('arrivalTime')}
            placeholder="e.g. Thursday 3:00 PM"
          />
          <Field
            label="Flight number (if applicable)"
            value={info.flightNumber}
            onChange={update('flightNumber')}
            placeholder="e.g. LX1234 arriving Geneva 11:30"
            autoCapitalize="characters"
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
            label={`Notes for ${wedding.couple_names}`}
            value={info.extraNotes}
            onChange={update('extraNotes')}
            placeholder="Type your message here..."
            multiline
          />
        </View>

        {/* Auto-save status */}
        {saveStatus !== 'idle' && (
          <View style={styles.saveStatus}>
            {saveStatus === 'saving' ? (
              <>
                <ActivityIndicator size="small" color={Colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.saveStatusText}>Saving…</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={15} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.saveStatusText, { color: Colors.primary }]}>All changes saved</Text>
              </>
            )}
          </View>
        )}

        <Text style={styles.privacyNote}>
          Your details are shared with {wedding.couple_names} to help with planning.
        </Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} disabled={deleting}>
          <Ionicons name="log-out-outline" size={17} color={Colors.textMuted} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={15} color={Colors.error} />
              <Text style={styles.deleteAccountText}>Delete my account</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.deleteAccountHint}>
          Permanently removes your data from this wedding. This cannot be undone.
        </Text>
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

  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  saveStatusText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
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

  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    minHeight: 32,
  },
  deleteAccountText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.error,
  },
  deleteAccountHint: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 16,
    marginTop: 2,
  },
});
