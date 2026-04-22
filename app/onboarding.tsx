import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { getMyInfo, saveMyInfo } from '@/services/storage';
import { HotelPickerField } from '@/components/HotelPickerField';
import { DateField } from '@/components/DateField';

const MIN_DATE = new Date('2026-05-18');
const MAX_DATE = new Date('2026-06-01');

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

function Field({ label, placeholder, value, onChangeText, icon, keyboardType, autoCapitalize }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={16} color={Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
        />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { guestName, skipOnboarding } = useAuth();
  const { weddingId, wedding } = useWedding();

  const [hotel, setHotel] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const firstName = guestName?.split(' ')[0] ?? 'there';

  useEffect(() => {
    if (!guestName) { setLoading(false); return; }
    getMyInfo(weddingId, guestName).then((data) => {
      const prefilled = !!(data.hotel || data.arrivalTime || data.checkIn);
      setHasPrefilled(prefilled);
      setHotel(data.hotel);
      setCheckIn(data.checkIn);
      setCheckOut(data.checkOut);
      setArrivalTime(data.arrivalTime);
      setFlightNumber(data.flightNumber);
      setLoading(false);
    });
  }, [weddingId, guestName]);

  const handleSave = async () => {
    if (!guestName) return;
    setSaving(true);
    try {
      const existing = await getMyInfo(weddingId, guestName);
      await saveMyInfo(weddingId, guestName, {
        ...existing,
        hotel: hotel.trim(),
        checkIn,
        checkOut,
        arrivalTime: arrivalTime.trim(),
        flightNumber: flightNumber.trim(),
      });
    } catch {
      // silently continue — data will be editable from My Details
    }
    skipOnboarding(); // marks session as done so confirm doesn't loop this session
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    skipOnboarding();
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {hasPrefilled ? `Hello, ${firstName}!` : `Welcome, ${firstName}!`}
          </Text>
          <Text style={styles.subtitle}>
            {hasPrefilled ? 'Please confirm your details' : 'A quick note before you explore'}
          </Text>
          <Text style={styles.body}>
            {hasPrefilled
              ? "We've already noted some of your travel information. Please take a moment to check everything looks right — you can edit anything that's changed."
              : 'Help us prepare for your arrival by sharing a few travel details. You can always update these later in the My Details tab.'}
          </Text>
        </View>

        {/* Accommodation card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bed-outline" size={18} color={Colors.gold} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.cardTitle}>Where are you staying?</Text>
          </View>
          <HotelPickerField
            label="Hotel or accommodation"
            value={hotel}
            onChange={setHotel}
          />
          <DateField
            label="Check-in date"
            value={checkIn}
            onChange={setCheckIn}
            placeholder="Select date"
            minimumDate={MIN_DATE}
            maximumDate={MAX_DATE}
          />
          <DateField
            label="Check-out date"
            value={checkOut}
            onChange={setCheckOut}
            placeholder="Select date"
            minimumDate={MIN_DATE}
            maximumDate={MAX_DATE}
          />
        </View>

        {/* Arrival card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="airplane-outline" size={18} color={Colors.gold} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.cardTitle}>How are you arriving?</Text>
          </View>
          <Field
            label={`Arrival time in ${wedding.destination_city}`}
            placeholder="e.g. 2:30 PM on 21 May"
            value={arrivalTime}
            onChangeText={setArrivalTime}
            icon="time-outline"
          />
          <Field
            label="Flight number (optional)"
            placeholder="e.g. LX1234"
            value={flightNumber}
            onChangeText={setFlightNumber}
            icon="paper-plane-outline"
            autoCapitalize="characters"
          />
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {hasPrefilled ? 'Confirm my details' : 'Save my details'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={styles.skipButtonText}>
            {hasPrefilled ? "I'll review later" : 'Remind me next time'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: 28,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  inputIcon: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },

  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
