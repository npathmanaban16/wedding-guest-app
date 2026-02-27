import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography } from '@/constants/theme';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'heart-outline', iconFocused: 'heart' },
  { name: 'schedule', title: 'Schedule', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'switzerland', title: 'Switzerland', icon: 'map-outline', iconFocused: 'map' },
  { name: 'packing', title: 'Packing', icon: 'bag-outline', iconFocused: 'bag' },
  { name: 'photos', title: 'Photos', icon: 'camera-outline', iconFocused: 'camera' },
  { name: 'songs', title: 'Songs', icon: 'musical-notes-outline', iconFocused: 'musical-notes' },
  { name: 'my-info', title: 'My Info', icon: 'person-outline', iconFocused: 'person' },
];

export default function TabLayout() {
  const { guestName, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!guestName) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 88,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: Typography.xs,
          fontFamily: Typography.sans,
          fontWeight: '500',
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
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
