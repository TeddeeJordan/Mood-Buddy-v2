import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import { useAppTheme } from '@/themes/useAppTheme';
import { HapticTabButton } from '@/ui/widgets/HapticTabButton/HapticTabButton';
import { tabAccessibilityLabel } from '@/utils/tabAccessibility';

/** Visible tabs only; hidden tabs are not counted in the screen-reader position. */
const VISIBLE_TAB_COUNT = 2;

/**
 * Drawer → JS Tabs (D35). Home and Dashboard are visible; Diary, Profile and Settings are hidden
 * tabs that stay navigable. Hidden tabs MUST use the object form `options={{ href: null }}`
 * (TabsClient.js:15 ignores `href` when options is a function). HapticTabButton is set only here.
 * The selected tab shows a filled icon and the others an outline icon, so state isn't colour-only
 * (WCAG 1.4.1).
 */
export default function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTabButton,
        tabBarHideOnKeyboard: Platform.OS === 'android',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surface },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: tabAccessibilityLabel('Home', 1, VISIBLE_TAB_COUNT),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
              testID={focused ? 'tab-icon-home-filled' : 'tab-icon-home-outline'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarAccessibilityLabel: tabAccessibilityLabel('Dashboard', 2, VISIBLE_TAB_COUNT),
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'chart-box' : 'chart-box-outline'}
              color={color}
              size={size}
              testID={focused ? 'tab-icon-dashboard-filled' : 'tab-icon-dashboard-outline'}
            />
          ),
        }}
      />
      <Tabs.Screen name="diary" options={{ href: null, title: 'Diary' }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
    </Tabs>
  );
}
