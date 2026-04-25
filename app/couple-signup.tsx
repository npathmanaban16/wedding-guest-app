import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { DateField } from '@/components/DateField';
import { supabase } from '@/lib/supabase';
import { isDisposableEmail } from '@/constants/disposableEmailDomains';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CoupleSignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [coupleName, setCoupleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  // Honeypot — real humans never see this, bots usually fill every field.
  const [website, setWebsite] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): string | null => {
    if (!coupleName.trim()) return 'Please enter the couple name.';
    if (!startDate) return 'Please enter your wedding date.';
    if (isMultiDay && !endDate) return 'Please enter the end date, or turn off multi-day.';
    if (isMultiDay && endDate && endDate < startDate) return 'End date must be after the start date.';
    if (!email.trim()) return 'Please enter your email.';
    if (!EMAIL_REGEX.test(email.trim())) return 'That email doesn’t look right.';
    if (isDisposableEmail(email.trim())) return 'Please use a non-disposable email address.';
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      return 'Email addresses don’t match.';
    }
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);

    // Honeypot: a bot filled the hidden field. Pretend success to keep it
    // from retrying; skip the DB insert and email entirely.
    if (website.trim()) {
      setLoading(false);
      setSubmitted(true);
      return;
    }

    const parsedGuests = parseInt(guestCount.trim(), 10);
    const payload = {
      couple_name: coupleName.trim(),
      wedding_date_start: startDate,
      wedding_date_end: isMultiDay && endDate ? endDate : null,
      email: email.trim(),
      guest_count: Number.isFinite(parsedGuests) ? parsedGuests : null,
      city: city.trim() || null,
      notes: notes.trim() || null,
    };

    const { error: dbError } = await supabase.from('wedding_requests').insert(payload);
    if (dbError) {
      // Rate-limit trigger raises a P0001 with "rate_limited:" prefix.
      if (dbError.message?.toLowerCase().includes('rate_limited')) {
        setError('You just submitted a request. Please wait a minute before trying again.');
      } else if (dbError.message?.toLowerCase().includes('disposable_email')) {
        setError('Please use a non-disposable email address.');
      } else {
        setError('Something went wrong saving your request. Please try again.');
      }
      setLoading(false);
      return;
    }

    // Fire-and-forget email notification. If it fails, the request row is
    // still saved and the admin will see it in the Supabase dashboard —
    // we don't want to block the user's UX on email delivery.
    supabase.functions.invoke('send-wedding-request', {
      body: {
        coupleName: payload.couple_name,
        weddingDateStart: payload.wedding_date_start,
        weddingDateEnd: payload.wedding_date_end,
        email: payload.email,
        guestCount: payload.guest_count,
        city: payload.city,
        notes: payload.notes,
      },
    }).catch((e) => console.warn('send-wedding-request invoke failed:', e));

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmWrap}>
          <View style={styles.ornament}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentDiamond}>◆</Text>
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.confirmTitle}>Thank you!</Text>
          <Text style={styles.confirmBody}>
            We received your request. We’ll reach out at{' '}
            <Text style={styles.confirmEmail}>{email.trim()}</Text> within a few days to get
            your wedding set up.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/invite')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>BACK TO INVITE CODE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.ornament}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentDiamond}>◆</Text>
            <View style={styles.ornamentLine} />
          </View>

          <Text style={styles.title}>Set up your wedding</Text>
          <Text style={styles.subtitle}>
            Tell us a little about your wedding and we’ll reach out to get your Tetherly app set up.
          </Text>

          <Text style={styles.label}>Couple</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Emma & James"
            placeholderTextColor={Colors.textMuted}
            value={coupleName}
            onChangeText={(t) => { setCoupleName(t); if (error) setError(''); }}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <DateField
            label="Wedding date"
            value={startDate}
            onChange={(v) => { setStartDate(v); if (error) setError(''); }}
            placeholder="Select a date..."
          />

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsMultiDay((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isMultiDay && styles.checkboxActive]}>
              {isMultiDay && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <Text style={styles.toggleLabel}>It’s a multi-day celebration</Text>
          </TouchableOpacity>

          {isMultiDay && (
            <DateField
              label="End date"
              value={endDate}
              onChange={(v) => { setEndDate(v); if (error) setError(''); }}
              placeholder="Select end date..."
              minimumDate={startDate ? new Date(startDate + 'T00:00:00') : undefined}
            />
          )}

          <Text style={styles.helperNote}>Dates can be changed later.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          {email.length > 0 && (
            <>
              <Text style={styles.label}>Confirm email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                value={confirmEmail}
                onChangeText={(t) => { setConfirmEmail(t); if (error) setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
              />
            </>
          )}

          <View style={styles.fieldRow}>
            <View style={styles.fieldRowGuests}>
              <Text style={styles.label}>Guests <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 120"
                placeholderTextColor={Colors.textMuted}
                value={guestCount}
                onChangeText={(t) => setGuestCount(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </View>
            <View style={styles.fieldRowCity}>
              <Text style={styles.label}>City or venue <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Montreux"
                placeholderTextColor={Colors.textMuted}
                value={city}
                onChangeText={setCity}
                returnKeyType="next"
              />
            </View>
          </View>

          <Text style={styles.label}>Notes <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Tell us a bit more about your wedding - events, hotels, travel info, and whether this is a destination wedding."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Honeypot — positioned off-screen, hidden from users but
              present in the DOM so naive bots fill it in. */}
          <View style={styles.honeypot} pointerEvents="none">
            <TextInput
              value={website}
              onChangeText={setWebsite}
              autoComplete="off"
              autoCorrect={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              tabIndex={-1}
              placeholder="Website"
            />
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>REQUEST ACCESS</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginLeft: 2,
  },

  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '40%',
    marginBottom: Spacing.md,
  },
  ornamentLine: { flex: 1, height: 0.5, backgroundColor: Colors.primaryLight },
  ornamentDiamond: {
    color: Colors.primaryLight,
    fontSize: Typography.xs,
    marginHorizontal: Spacing.sm,
  },

  title: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },

  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  optional: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'none',
    color: Colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    marginBottom: Spacing.md,
  },
  textarea: {
    minHeight: 90,
    paddingTop: 12,
  },

  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fieldRowGuests: { flex: 1 },
  fieldRowCity: { flex: 1.6 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleLabel: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },

  helperNote: {
    fontFamily: Fonts.sans,
    fontStyle: 'italic',
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },

  errorText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  honeypot: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },

  primaryButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.xs,
    letterSpacing: 3,
    color: Colors.white,
  },

  confirmWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  confirmTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  confirmBody: {
    fontFamily: Fonts.sans,
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  confirmEmail: {
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
  },
});
