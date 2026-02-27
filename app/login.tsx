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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { WEDDING } from '@/constants/weddingData';

export default function LoginScreen() {
  const { login } = useAuth();
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
    setLoading(true);
    const result = await login(name);
    setLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error ?? 'Something went wrong.');
      shake();
    }
  };

  return (
    <LinearGradient colors={['#FBF7F4', '#F5EDE4', '#EDE0D4']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Decorative top flourish */}
          <View style={styles.flourishTop}>
            <Text style={styles.leaf}>🌿</Text>
            <Text style={styles.leaf}>🌸</Text>
            <Text style={styles.leaf}>🌿</Text>
          </View>

          {/* Main card */}
          <Animated.View style={[styles.card, Shadow.large, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Date & Location */}
            <Text style={styles.dateText}>Switzerland · August 2026</Text>

            {/* Couple names */}
            <Text style={styles.couplesNames}>{WEDDING.coupleNames}</Text>

            {/* Divider ornament */}
            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Text style={styles.ornamentDiamond}>◆</Text>
              <View style={styles.ornamentLine} />
            </View>

            <Text style={styles.welcomeText}>Welcome to our{'\n'}wedding companion app</Text>
            <Text style={styles.instructionText}>
              Enter your name to access your personal invitation
            </Text>

            {/* Name input */}
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
              <TextInput
                style={styles.input}
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
            </View>

            {/* Error message */}
            {!!error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Enter button */}
            <TouchableOpacity
              style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={!name.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Enter ✦</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Can't find your name? Contact us at{'\n'}
              <Text style={styles.hintLink}>{WEDDING.contactEmail}</Text>
            </Text>
          </Animated.View>

          {/* Bottom flourish */}
          <View style={styles.flourishBottom}>
            <Text style={styles.leaf}>🌿</Text>
            <Text style={styles.leaf}>🌸</Text>
            <Text style={styles.leaf}>🌿</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  flourishTop: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    opacity: 0.7,
  },
  flourishBottom: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    opacity: 0.7,
    transform: [{ scaleY: -1 }],
  },
  leaf: { fontSize: 22 },

  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  dateText: {
    fontFamily: Typography.sans,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  couplesNames: {
    fontFamily: Typography.serif,
    fontSize: Typography.xxxl,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginBottom: Spacing.md,
  },
  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.secondaryLight,
  },
  ornamentDiamond: {
    color: Colors.secondary,
    fontSize: Typography.sm,
    marginHorizontal: Spacing.sm,
  },
  welcomeText: {
    fontFamily: Typography.serif,
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  instructionText: {
    fontFamily: Typography.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontFamily: Typography.sans,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#FFF0F0',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: Colors.border,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontFamily: Typography.sans,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  hintLink: {
    color: Colors.primary,
  },
});
