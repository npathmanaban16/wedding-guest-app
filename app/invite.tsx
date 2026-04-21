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
import { useWeddingSession } from '@/context/WeddingContext';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/constants/theme';

export default function InviteScreen() {
  const { setWeddingIdFromInviteCode } = useWeddingSession();
  const router = useRouter();

  const [code, setCode] = useState('');
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

  const handleSubmit = async () => {
    setError('');
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your invite code.');
      shake();
      return;
    }
    setLoading(true);
    try {
      const wedding = await setWeddingIdFromInviteCode(trimmed);
      if (!wedding) {
        setError("We couldn't find a wedding with that code. Please check with the couple.");
        shake();
        return;
      }
      router.replace('/login');
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
      shake();
    } finally {
      setLoading(false);
    }
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
              onChangeText={(t) => {
                setCode(t);
                if (error) setError('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </Animated.View>

          <TouchableOpacity
            style={[styles.button, (!code.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!code.trim() || loading}
            activeOpacity={0.75}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>CONTINUE</Text>
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
});
