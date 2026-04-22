import React, { useMemo, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useWeddingSession } from '@/context/WeddingContext';
import type { ResolvedWedding } from '@/services/wedding';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';

// Shared normalization — mirrors WeddingContext so invite-screen validation
// agrees with the validation the provider applies after login.
const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

const formatDateRange = (iso: string): string => {
  // Single-day wedding — match the look of the old login screen, e.g.
  // "MAY 22 – 23, 2026" isn't quite right for a generic SaaS build,
  // so fall back to the full formatted date.
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
};

export default function InviteScreen() {
  const { resolveWeddingByInviteCode, applyResolvedWedding } = useWeddingSession();
  const { login } = useAuth();
  const router = useRouter();

  const [stage, setStage] = useState<'code' | 'name'>('code');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [resolved, setResolved] = useState<ResolvedWedding | null>(null);

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

  const handleCodeSubmit = async () => {
    setError('');
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your invite code.');
      shake();
      return;
    }
    setLoading(true);
    try {
      const bundle = await resolveWeddingByInviteCode(trimmed);
      if (!bundle) {
        setError("We couldn't find a wedding with that code. Please check with the couple.");
        shake();
        return;
      }
      setResolved(bundle);
      setStage('name');
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  const guestLookup = useMemo(() => {
    if (!resolved) return null;
    const guestByNormalized = new Map(
      resolved.guests.map((g) => [normalize(g.canonical_name), g.canonical_name]),
    );
    const adminByNormalized = new Map(
      resolved.admins.map((a) => [normalize(a.guest_name), a.guest_name]),
    );
    return { guestByNormalized, adminByNormalized };
  }, [resolved]);

  const handleNameSubmit = async () => {
    if (!resolved || !guestLookup) return;
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      shake();
      return;
    }
    const n = normalize(trimmed);
    const canonical =
      guestLookup.guestByNormalized.get(n) ??
      guestLookup.adminByNormalized.get(n) ??
      null;
    if (!canonical) {
      setError(
        "We couldn't find your name on the guest list. Please check the spelling or contact the couple.",
      );
      shake();
      return;
    }
    setLoading(true);
    try {
      await applyResolvedWedding(resolved);
      await login(canonical);
      router.replace('/(tabs)');
    } catch {
      setError("Something went wrong signing you in. Please try again.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCode = () => {
    setStage('code');
    setName('');
    setError('');
  };

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
          {stage === 'code' ? (
            <CodeStage
              code={code}
              setCode={(t) => { setCode(t); if (error) setError(''); }}
              onSubmit={handleCodeSubmit}
              onSignup={() => router.push('/couple-signup')}
              error={error}
              loading={loading}
              shakeAnim={shakeAnim}
            />
          ) : (
            resolved && (
              <NameStage
                wedding={resolved.wedding}
                name={name}
                setName={(t) => { setName(t); if (error) setError(''); }}
                onSubmit={handleNameSubmit}
                onBack={handleBackToCode}
                error={error}
                loading={loading}
                shakeAnim={shakeAnim}
              />
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Stage: enter invite code ────────────────────────────────────────────────

interface CodeStageProps {
  code: string;
  setCode: (t: string) => void;
  onSubmit: () => void;
  onSignup: () => void;
  error: string;
  loading: boolean;
  shakeAnim: Animated.Value;
}

function CodeStage({
  code, setCode, onSubmit, onSignup, error, loading, shakeAnim,
}: CodeStageProps) {
  return (
    <>
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

      <Text style={styles.welcome}>Enter your invite code</Text>
      <Text style={styles.instruction}>
        The couple shared a code with their invitation. It unlocks your wedding's app.
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Invite code"
          placeholderTextColor={Colors.textMuted}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </Animated.View>

      <TouchableOpacity
        style={[styles.button, (!code.trim() || loading) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!code.trim() || loading}
        activeOpacity={0.75}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Text style={styles.buttonText}>CONTINUE</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={styles.secondaryCta}
        onPress={onSignup}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryCtaText}>
          Getting married? Set up your wedding →
        </Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Stage: enter name (wedding is resolved, shown in header) ────────────────

interface NameStageProps {
  wedding: ResolvedWedding['wedding'];
  name: string;
  setName: (t: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string;
  loading: boolean;
  shakeAnim: Animated.Value;
}

function NameStage({
  wedding, name, setName, onSubmit, onBack, error, loading, shakeAnim,
}: NameStageProps) {
  return (
    <>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        <Text style={styles.backText}>Change invite code</Text>
      </TouchableOpacity>

      <View style={styles.ornament}>
        <View style={styles.ornamentLine} />
        <Text style={styles.ornamentDiamond}>◆</Text>
        <View style={styles.ornamentLine} />
      </View>

      <Text style={styles.locationText}>{wedding.location.toUpperCase()}</Text>
      <Text style={styles.coupleNames}>{wedding.couple_names}</Text>
      <Text style={styles.dateText}>{formatDateRange(wedding.wedding_date)}</Text>

      <View style={styles.ornament}>
        <View style={styles.ornamentLine} />
        <Text style={styles.ornamentDiamond}>◆</Text>
        <View style={styles.ornamentLine} />
      </View>

      <Text style={styles.welcome}>Welcome to our wedding companion</Text>
      <Text style={styles.instruction}>
        Enter your full name to access your invitation.
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TextInput
          style={[styles.input, styles.inputNoTracking, error ? styles.inputError : null]}
          placeholder="Your full name"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </Animated.View>

      <TouchableOpacity
        style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!name.trim() || loading}
        activeOpacity={0.75}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Text style={styles.buttonText}>ENTER</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Can't find your name?{' '}
        <Text
          style={styles.hintLink}
          onPress={() => {
            if (wedding.contact_email) {
              Linking.openURL(`mailto:${wedding.contact_email}`);
            }
          }}
        >
          Contact the couple
        </Text>
      </Text>
    </>
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

  locationText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    letterSpacing: 3,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  coupleNames: {
    fontFamily: Fonts.serif,
    fontSize: 56,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 62,
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    letterSpacing: 2.5,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    marginBottom: Spacing.sm,
    backgroundColor: 'transparent',
    letterSpacing: 2,
  },
  inputNoTracking: {
    letterSpacing: 0,
  },
  inputError: {
    borderBottomColor: Colors.error,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
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

  hint: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  hintLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
