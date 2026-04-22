import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useWeddingSession } from '@/context/WeddingContext';
import type { WeddingRow } from '@/services/wedding';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';

// Shared normalization — mirrors WeddingContext so invite-screen validation
// agrees with the validation the provider applies after login.
const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

// Public demo credentials surfaced via the "Try the demo" link. Kept in
// sync with supabase/seed_demo_wedding.sql on the SaaS project — change
// one and change the other.
const DEMO_INVITE_CODE = 'DEMO2027';
const DEMO_GUEST_NAME = 'Preview Guest';

export default function InviteScreen() {
  const { resolveWeddingByInviteCode, applyResolvedWedding } = useWeddingSession();
  const { login } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Set only when the code resolved successfully but the name wasn't on
  // the guest list. Holds the wedding so we can offer a mailto link to
  // the couple for that specific wedding.
  const [nameNotFoundFor, setNameNotFoundFor] = useState<WeddingRow | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // Clear transient error state on any edit — the user is re-attempting.
  const clearError = () => {
    if (error) setError('');
    if (nameNotFoundFor) setNameNotFoundFor(null);
  };

  // Shared login path used both by the ENTER button (reads from state) and
  // by the "Try the demo" shortcut (passes literal values so the call
  // doesn't need to wait for React to flush state setters first).
  const runLogin = async (inputCode: string, inputName: string) => {
    setError('');
    setNameNotFoundFor(null);
    const trimmedCode = inputCode.trim();
    const trimmedName = inputName.trim();
    if (!trimmedCode) {
      setError('Please enter your invite code.');
      shake();
      return;
    }
    if (!trimmedName) {
      setError('Please enter your name.');
      shake();
      return;
    }
    setLoading(true);
    try {
      const resolved = await resolveWeddingByInviteCode(trimmedCode);
      if (!resolved) {
        setError("We couldn't find a wedding with that invite code.");
        shake();
        return;
      }
      const n = normalize(trimmedName);
      const canonical =
        resolved.guests.find((g) => normalize(g.canonical_name) === n)?.canonical_name ??
        resolved.admins.find((a) => normalize(a.guest_name) === n)?.guest_name ??
        null;
      if (!canonical) {
        setError("We couldn't find your name on the guest list. Please check the spelling.");
        setNameNotFoundFor(resolved.wedding);
        shake();
        return;
      }
      await applyResolvedWedding(resolved);
      await login(canonical);
      router.replace('/(tabs)');
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => runLogin(code, name);

  const handleTryDemo = async () => {
    // Prefill the form so users can see what they submitted, but pass the
    // literal values to runLogin so we don't race React's state batching.
    setCode(DEMO_INVITE_CODE);
    setName(DEMO_GUEST_NAME);

    // Reset the shared demo tenant back to seed state before signing the
    // next curious couple in. Non-blocking on failure: if the RPC errors
    // (network hiccup, old backend without migration 005) we still let
    // the user into the demo — they'll just see whatever state it's in.
    try {
      await supabase.rpc('reset_demo_wedding');
    } catch (e) {
      console.warn('[demo] reset_demo_wedding RPC failed:', e);
    }

    runLogin(DEMO_INVITE_CODE, DEMO_GUEST_NAME);
  };

  // Button stays tappable while fields are incomplete so handleSubmit can
  // show the "please enter your name" / "please enter your code" error.
  // `dimButton` is only for visual affordance.
  const dimButton = !code.trim() || !name.trim() || loading;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ornament}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentDiamond}>◆</Text>
            <View style={styles.ornamentLine} />
          </View>

          <Text style={styles.title}>Tetherly</Text>

          <View style={styles.ornament}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentDiamond}>◆</Text>
            <View style={styles.ornamentLine} />
          </View>

          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.instruction}>
            Enter the invite code the couple shared with you, along with your full name.
          </Text>

          <Animated.View style={[styles.formWrap, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.label}>Invite code</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="e.g. ABC123"
              placeholderTextColor={Colors.textMuted}
              value={code}
              onChangeText={(t) => { setCode(t); clearError(); }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>Your full name</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="e.g. Jane Doe"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={(t) => { setName(t); clearError(); }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </Animated.View>

          <TouchableOpacity
            style={[styles.button, dimButton && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.75}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.buttonText}>ENTER</Text>
            )}
          </TouchableOpacity>

          {nameNotFoundFor && (
            <Text style={styles.hint}>
              Can't find your name?{' '}
              {nameNotFoundFor.contact_email ? (
                <Text
                  style={styles.hintLink}
                  onPress={() =>
                    Linking.openURL(`mailto:${nameNotFoundFor.contact_email}`)
                  }
                >
                  Contact the couple
                </Text>
              ) : (
                <Text style={styles.hintStrong}>Contact the couple</Text>
              )}
              .
            </Text>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryCta}
            onPress={() => router.push('/couple-signup')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryCtaText}>
              Getting married? Set up your wedding →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryCta}
            onPress={handleTryDemo}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.tertiaryCtaText}>
              Just curious? Try the demo →
            </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginVertical: Spacing.lg,
  },
  ornamentLine: { flex: 1, height: 0.5, backgroundColor: Colors.primaryLight },
  ornamentDiamond: {
    color: Colors.primaryLight,
    fontSize: Typography.xs,
    marginHorizontal: Spacing.sm,
  },

  title: {
    fontFamily: Fonts.serif,
    fontSize: 44,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 50,
  },
  welcome: {
    fontFamily: Fonts.serifItalic,
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  instruction: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },

  formWrap: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    fontSize: Typography.md,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  inputError: {
    borderBottomColor: Colors.error,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  button: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing.xl,
    minWidth: 180,
  },
  buttonDisabled: {
    borderColor: Colors.border,
  },
  buttonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.xs,
    letterSpacing: 3,
    color: Colors.primary,
  },

  hint: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  hintLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  hintStrong: {
    color: Colors.textSecondary,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },
  secondaryCta: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  secondaryCtaText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tertiaryCta: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  tertiaryCtaText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
