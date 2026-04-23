import React, { useState, useRef } from 'react';
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
  Animated,
  Linking,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { Colors, Fonts, Typography, Spacing, Radius } from '@/constants/theme';

export default function LoginScreen() {
  // SaaS builds should never land on /login — the invite screen
  // captures both code + name in one form. If something routes here
  // anyway (stale redirect, deep link, etc.), bounce to /invite.
  if (DEFAULT_WEDDING_ID === null) {
    return <Redirect href="/invite" />;
  }
  return <LoginScreenInner />;
}

function LoginScreenInner() {
  const { login } = useAuth();
  const { wedding, isValidGuestOrAdmin, getCanonicalName } = useWedding();
  const router = useRouter();

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

  const handleLogin = async () => {
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      shake();
      return;
    }
    if (!isValidGuestOrAdmin(trimmed)) {
      setError("We couldn't find your name on the guest list. Please check the spelling or contact the couple.");
      shake();
      return;
    }
    setLoading(true);
    const canonical = getCanonicalName(trimmed) ?? trimmed;
    await login(canonical);
    setLoading(false);
    router.replace('/(tabs)');
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
          automaticallyAdjustKeyboardInsets
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Top ornament */}
          <View style={styles.ornamentTop}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentDiamond}>◆</Text>
            <View style={styles.ornamentLine} />
          </View>

          {/* Location & date */}
          <Text style={styles.locationText}>
            {wedding.location.toUpperCase()}
          </Text>

          {/* Couple names — large serif */}
          <Text style={styles.coupleNames}>{wedding.couple_names}</Text>

          {/* Date */}
          <Text style={styles.dateText}>
            MAY 22 – 23, 2026
          </Text>

          {/* Bottom ornament */}
          <View style={styles.ornamentBottom}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentDiamond}>◆</Text>
            <View style={styles.ornamentLine} />
          </View>

          {/* Welcome message */}
          <Text style={styles.welcomeText}>
            Welcome to our wedding companion
          </Text>
          <Text style={styles.instructionText}>
            Enter your full name to access your invitation
          </Text>

          {/* Input */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError('');
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </Animated.View>

          {/* Enter button */}
          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!name.trim() || loading}
            activeOpacity={0.75}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
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

  ornamentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginBottom: Spacing.xl,
  },
  ornamentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  ornamentLine: { flex: 1, height: 0.5, backgroundColor: Colors.primaryLight },
  ornamentDiamond: {
    color: Colors.primaryLight,
    fontSize: Typography.xs,
    marginHorizontal: Spacing.sm,
  },

  locationText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  coupleNames: {
    fontFamily: Fonts.serif,
    fontSize: 64,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 70,
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    letterSpacing: 2.5,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  welcomeText: {
    fontFamily: Fonts.serifItalic,
    fontSize: Typography.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  instructionText: {
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
    marginBottom: Spacing.lg,
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
  },
  hintLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
