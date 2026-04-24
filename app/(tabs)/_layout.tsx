import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ActivityIndicator, AppState, Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isOnboardingDone, getNotifications, getMessagesLastRead, markMessagesRead } from '@/services/storage';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Guest name used by the public "Try the demo" link on /invite. Only this
// name triggers the preview-mode affordances below; Apple reviewers signing
// in as "Taylor Reviewer" get the normal sign-out flow.
const PREVIEW_GUEST_NAME = 'Preview Guest';
// Kept in sync with WeddingContext's WEDDING_ID_STORAGE_KEY.
const WEDDING_ID_STORAGE_KEY = '@wedding_id';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

export default function TabLayout() {
  const { guestName, isLoading, logout, onboardingSkipped } = useAuth();
  const { weddingId, wedding, isWeddingParty } = useWedding();
  const inWeddingParty = !!guestName && isWeddingParty(guestName);
  const insets = useSafeAreaInsets();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  usePushNotifications(weddingId, guestName);

  const isPreviewMode =
    DEFAULT_WEDDING_ID === null && guestName === PREVIEW_GUEST_NAME;

  const exitPreview = useCallback(async () => {
    // Same detach flow as my-info.tsx sign-out on SaaS: drop the persisted
    // wedding id so cold launches route to /invite, then clear the auth
    // name. The guard below catches the null guestName and redirects.
    await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
    await logout();
  }, [logout]);

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
    const [allNotifs, lastRead] = await Promise.all([
      getNotifications(weddingId),
      getMessagesLastRead(weddingId, guestName),
    ]);
    // Same filter the Messages screen applies — don't badge non-wedding-
    // party users for messages they can't see.
    const notifs = allNotifs.filter((n) => !n.weddingPartyOnly || inWeddingParty);
    if (!lastRead) {
      setUnreadCount(notifs.length);
      return;
    }
    const count = notifs.filter((n) => new Date(n.sentAt) > new Date(lastRead)).length;
    setUnreadCount(count);
  }, [weddingId, guestName, inWeddingParty]);

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

  // SaaS (no pinned wedding): a signed-out device should land on the
  // invite-code screen so the user can enter a different wedding. N&N
  // keeps the login screen since the wedding is baked into the build.
  if (!guestName) {
    return <Redirect href={DEFAULT_WEDDING_ID === null ? '/invite' : '/login'} />;
  }
  if (needsOnboarding && !onboardingSkipped) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.root}>
      {isPreviewMode && (
        <Pressable
          onPress={exitPreview}
          style={({ pressed }) => [
            styles.previewBanner,
            { paddingTop: insets.top + 6 },
            pressed && styles.previewBannerPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Exit preview mode and return to the invite screen"
        >
          <Text style={styles.previewBannerText}>
            Preview mode · Tap to exit →
          </Text>
        </Pressable>
      )}
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
            shadowColor: '#1C1810',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.sansMedium,
            fontSize: 9,
            letterSpacing: 0,
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
                if (guestName) markMessagesRead(weddingId, guestName).catch(() => {});
                setUnreadCount(0);
              },
            } : undefined}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  previewBanner: {
    backgroundColor: Colors.primaryLight,
    paddingBottom: 8,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  previewBannerPressed: {
    opacity: 0.75,
  },
  previewBannerText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textPrimary,
  },
});
