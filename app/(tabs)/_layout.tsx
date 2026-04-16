import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Fonts } from '@/constants/theme';
import { ActivityIndicator, AppState, View, StyleSheet } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { isOnboardingDone, getNotifications, getMessagesLastRead, markMessagesRead } from '@/services/storage';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TABS: TabConfig[] = [
  { name: 'index',       title: 'Home',        icon: 'heart-outline',         iconFocused: 'heart' },
  { name: 'schedule',    title: 'Schedule',    icon: 'calendar-outline',      iconFocused: 'calendar' },
  { name: 'switzerland', title: 'Montreux',    icon: 'map-outline',           iconFocused: 'map' },
  { name: 'packing',     title: 'Packing',     icon: 'bag-handle-outline',    iconFocused: 'bag-handle' },
  { name: 'photos',      title: 'Photos',      icon: 'camera-outline',        iconFocused: 'camera' },
  { name: 'songs',       title: 'Songs',       icon: 'musical-notes-outline', iconFocused: 'musical-notes' },
  { name: 'messages',    title: 'Messages',    icon: 'notifications-outline', iconFocused: 'notifications' },
  { name: 'my-info',     title: 'My Details',  icon: 'person-outline',        iconFocused: 'person' },
];

export default function TabLayout() {
  const { guestName, isLoading, onboardingSkipped } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  usePushNotifications(guestName);

  useEffect(() => {
    if (isLoading) return;
    if (!guestName) {
      setOnboardingChecked(true);
      return;
    }
    isOnboardingDone(guestName).then((done) => {
      setNeedsOnboarding(!done);
      setOnboardingChecked(true);
    });
  }, [guestName, isLoading]);

  const refreshUnread = useCallback(async () => {
    const [notifs, lastRead] = await Promise.all([getNotifications(), getMessagesLastRead()]);
    if (!lastRead) {
      setUnreadCount(notifs.length);
      return;
    }
    const count = notifs.filter((n) => new Date(n.sentAt) > new Date(lastRead)).length;
    setUnreadCount(count);
  }, []);

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
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0.5,
          borderTopColor: Colors.border,
          height: 84,
          paddingBottom: 22,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.sansMedium,
          fontSize: 10,
          letterSpacing: 0.3,
        },
        headerShown: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={22}
                color={color}
              />
            ),
            ...(tab.name === 'messages' && unreadCount > 0
              ? { tabBarBadge: unreadCount }
              : {}),
          }}
          listeners={tab.name === 'messages' ? {
            tabPress: () => {
              markMessagesRead().catch(() => {});
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
