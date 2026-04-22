import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useWeddingSession } from '@/context/WeddingContext';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { weddingId } = useWeddingSession();
  const { guestName, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

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
