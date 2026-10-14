import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import { useTabLeaveGuardListeners } from '@/hooks/useLeaveGuard';
import { textRelayoutStyle } from '@/themes/paperTheme';
import { useAppTheme } from '@/themes/useAppTheme';
import { HapticTabButton } from '@/ui/widgets/HapticTabButton/HapticTabButton';
import { TabBarIcon } from '@/ui/widgets/TabBarIcon/TabBarIcon';
import { tabAccessibilityLabel } from '@/utils/tabAccessibility';

/** Visible tabs only; hidden tabs are not counted in the screen-reader position. */
const VISIBLE_TAB_COUNT = 2;

/**
 * Drawer → JS Tabs (D35). Home and Dashboard are visible; Diary, Profile and Settings are hidden
 * tabs that stay navigable. Hidden tabs MUST use the object form `options={{ href: null }}`
 * (TabsClient.js:15 ignores `href` when options is a function). HapticTabButton is set only here.
 * The selected tab shows a filled icon and the others an outline icon, so state isn't colour-only
 * (WCAG 1.4.1). TabBarIcon renders only the visible one of the tab bar's two icon layers.
 * `screenListeners` asks the focused screen's leave guard before a tab press switches tabs.
 * `tabBarLabelStyle` re-measures the labels after a live text-size change (`textRelayoutStyle`).
 */
export default function TabsLayout() {
  const theme = useAppTheme();
  const { colors } = theme;
  const screenListeners = useTabLeaveGuardListeners();
  return (
    <Tabs
      screenListeners={screenListeners}
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTabButton,
        tabBarHideOnKeyboard: Platform.OS === 'android',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: colors.surface },
        // Tab labels aren't Paper text: this carries the theme's live font-scale re-layout marker.
        tabBarLabelStyle: textRelayoutStyle(theme),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: tabAccessibilityLabel('Home', 1, VISIBLE_TAB_COUNT),
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              focused={focused}
              color={color}
              size={size}
              filledName="home"
              outlineName="home-outline"
              testIDBase="tab-icon-home"
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
            <TabBarIcon
              focused={focused}
              color={color}
              size={size}
              filledName="chart-box"
              outlineName="chart-box-outline"
              testIDBase="tab-icon-dashboard"
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
