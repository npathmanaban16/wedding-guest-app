import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { Colors, Fonts } from '@/constants/theme';
import { ActivityIndicator, AppState, View, StyleSheet } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isOnboardingDone, getNotifications, getMessagesLastRead, markMessagesRead } from '@/services/storage';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

export default function TabLayout() {
  const { guestName, isLoading, onboardingSkipped } = useAuth();
  const { weddingId, wedding } = useWedding();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  usePushNotifications(weddingId, guestName);

  const tabs: TabConfig[] = useMemo(() => [
    { name: 'index',       title: 'Home',        icon: 'heart-outline',         iconFocused: 'heart' },
    { name: 'schedule',    title: 'Schedule',    icon: 'calendar-outline',      iconFocused: 'calendar' },
    { name: 'switzerland', title: wedding.destination_city, icon: 'map-outline', iconFocused: 'map' },
    { name: 'packing',     title: 'Packing',     icon: 'bag-handle-outline',    iconFocused: 'bag-handle' },
    { name: 'photos',      title: 'Photos',      icon: 'camera-outline',        iconFocused: 'camera' },
    { name: 'songs',       title: 'Songs',       icon: 'musical-notes-outline', iconFocused: 'musical-notes' },
    { name: 'messages',    title: 'Messages',    icon: 'notifications-outline', iconFocused: 'notifications' },
    { name: 'my-info',     title: 'Details',     icon: 'person-outline',        iconFocused: 'person' },
  ], [wedding.destination_city]);

  useEffect(() => {
    if (isLoading) return;
    if (!guestName) {
      setOnboardingChecked(true);
      return;
    }
    isOnboardingDone(weddingId, guestName).then((done) => {
      setNeedsOnboarding(!done);
      setOnboardingChecked(true);
    });
  }, [weddingId, guestName, isLoading]);

  const refreshUnread = useCallback(async () => {
    if (!guestName) return;
    const [notifs, lastRead] = await Promise.all([
      getNotifications(weddingId),
      getMessagesLastRead(weddingId, guestName),
    ]);
    if (!lastRead) {
      setUnreadCount(notifs.length);
      return;
    }
    const count = notifs.filter((n) => new Date(n.sentAt) > new Date(lastRead)).length;
    setUnreadCount(count);
  }, [weddingId, guestName]);

  useEffect(() => {
    refreshUnread();
    const poll = setInterval(refreshUnread, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshUnread();
    });
    return () => { clearInterval(poll); sub.remove(); };
  }, [refreshUnread]);

  if (isLoading || !onboardingChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!guestName) return <Redirect href="/login" />;
  if (needsOnboarding && !onboardingSkipped) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarStyle: {
          backgroundColor: Colors.primary,
          borderTopWidth: 0,
          height: 100,
          paddingTop: 14,
          paddingBottom: 0,
          shadowColor: '#1C1810',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.sansMedium,
          fontSize: 10,
          letterSpacing: 0.2,
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={26}
                color={color}
              />
            ),
            ...(tab.name === 'messages' && unreadCount > 0
              ? { tabBarBadge: unreadCount }
              : {}),
          }}
          listeners={tab.name === 'messages' ? {
            tabPress: () => {
              if (guestName) markMessagesRead(weddingId, guestName).catch(() => {});
              setUnreadCount(0);
            },
          } : undefined}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
});
