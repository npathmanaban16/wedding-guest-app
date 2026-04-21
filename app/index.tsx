import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useWeddingSession } from '@/context/WeddingContext';
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
  return <Redirect href={guestName ? '/(tabs)' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
