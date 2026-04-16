import { useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { savePushToken } from '@/services/storage';

// Show notifications as banners even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(guestName: string | null) {
  useEffect(() => {
    if (!guestName) return;
    registerForPushNotifications(guestName);
  }, [guestName]);
}

async function registerForPushNotifications(guestName: string) {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators — skip silently
    return;
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Wedding Updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return; // Guest declined — respect their choice
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      'ae93c50e-f645-405a-818e-2737f5560e96';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(guestName, tokenData.data);
  } catch {
    // Token fetch failed (e.g. no network) — will retry on next launch
  }
}
