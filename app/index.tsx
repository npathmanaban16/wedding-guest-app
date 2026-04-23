import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useWeddingSession } from '@/context/WeddingContext';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { Colors } from '@/constants/theme';

// Mirrors DEMO_GUEST_NAME in app/invite.tsx. Real wedding logins persist
// across cold launches, but the public demo is a try-it-once preview — we
// don't want a reopen to resume it mid-onboarding.
const PREVIEW_GUEST_NAME = 'Preview Guest';

export default function Index() {
  const { weddingId, clearWeddingId } = useWeddingSession();
  const { guestName, isLoading, logout } = useAuth();

  const isStaleDemo =
    !isLoading && DEFAULT_WEDDING_ID === null && guestName === PREVIEW_GUEST_NAME;

  useEffect(() => {
    if (!isStaleDemo) return;
    clearWeddingId();
    logout();
  }, [isStaleDemo, clearWeddingId, logout]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isStaleDemo) return <Redirect href="/invite" />;

  if (!weddingId) return <Redirect href="/invite" />;
  if (!guestName) {
    // SaaS: a signed-out device goes back to /invite (not /login) so the
    // user can type a different invite code. N&N keeps /login since the
    // wedding is pinned by the build.
    return <Redirect href={DEFAULT_WEDDING_ID === null ? '/invite' : '/login'} />;
  }
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
