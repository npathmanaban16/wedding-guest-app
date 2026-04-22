import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
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
import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';

// Shared normalization — mirrors WeddingContext so invite-screen validation
// agrees with the validation the provider applies after login.
const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

export default function InviteScreen() {
  const { resolveWeddingByInviteCode, applyResolvedWedding } = useWeddingSession();
  const { login } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const clearError = () => { if (error) setError(''); };

  const handleSubmit = async () => {
    setError('');
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
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
        setError(
          "We couldn't find your name on the guest list. Please check the spelling or contact the couple.",
        );
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

  const canSubmit = !!code.trim() && !!name.trim() && !loading;

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

          <Text style={styles.title}>Wedding Companion</Text>

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
            <TextInput
              style={[styles.input, styles.codeInput, error ? styles.inputError : null]}
              placeholder="Invite code"
              placeholderTextColor={Colors.textMuted}
              value={code}
              onChangeText={(t) => { setCode(t); clearError(); }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Your full name"
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
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.75}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.buttonText}>ENTER</Text>
            )}
          </TouchableOpacity>

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
    alignItems: 'center',
  },
  input: {
    width: '100%',
    minWidth: 280,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    fontSize: Typography.md,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
  codeInput: {
    letterSpacing: 2,
  },
  inputError: {
    borderBottomColor: Colors.error,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  button: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing.lg,
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
});
