import React, { useState } from 'react';
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
import { getMyInfo, saveMyInfo, markOnboardingDone } from '@/services/storage';

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
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
        />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();

  const [hotel, setHotel] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const firstName = guestName?.split(' ')[0] ?? 'there';

  const handleSave = async () => {
    if (!guestName) return;
    setSaving(true);
    try {
      const existing = await getMyInfo(guestName);
      await saveMyInfo(guestName, {
        ...existing,
        hotel: hotel.trim(),
        checkIn: checkIn.trim(),
        checkOut: checkOut.trim(),
        arrivalTime: arrivalTime.trim(),
        flightNumber: flightNumber.trim(),
      });
      await markOnboardingDone(guestName);
      router.replace('/(tabs)');
    } catch {
      await markOnboardingDone(guestName);
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    if (!guestName) return;
    await markOnboardingDone(guestName);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, {firstName}!</Text>
          <Text style={styles.subtitle}>A quick note before you explore</Text>
          <Text style={styles.body}>
            Help us prepare for your arrival by sharing a few travel details. You can always
            update these later in the My Details tab.
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bed-outline" size={18} color={Colors.gold} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.cardTitle}>Where are you staying?</Text>
          </View>

          <Field
            label="Hotel / Accommodation"
            placeholder="e.g. Fairmont Le Montreux Palace"
            value={hotel}
            onChangeText={setHotel}
            icon="business-outline"
          />
          <Field
            label="Check-in Date"
            placeholder="e.g. 21 May 2026"
            value={checkIn}
            onChangeText={setCheckIn}
            icon="calendar-outline"
          />
          <Field
            label="Check-out Date"
            placeholder="e.g. 25 May 2026"
            value={checkOut}
            onChangeText={setCheckOut}
            icon="calendar-outline"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="airplane-outline" size={18} color={Colors.gold} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.cardTitle}>How are you arriving?</Text>
          </View>

          <Field
            label="Arrival Time in Montreux"
            placeholder="e.g. 2:30 PM on 21 May"
            value={arrivalTime}
            onChangeText={setArrivalTime}
            icon="time-outline"
          />
          <Field
            label="Flight Number (optional)"
            placeholder="e.g. LX1234"
            value={flightNumber}
            onChangeText={setFlightNumber}
            icon="paper-plane-outline"
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
            <Text style={styles.saveButtonText}>Save my details</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={styles.skipButtonText}>I'll fill this in later</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 36,
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
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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

  field: {
    marginBottom: Spacing.md,
  },
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
  inputIcon: {
    marginRight: Spacing.xs,
  },
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
    paddingVertical: Spacing.sm,
  },
  skipButtonText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
