import { PlatformPressable } from 'expo-router/react-navigation';

import type { HapticTabButtonProps } from './HapticTabButton.props';
import { useHapticTabButton } from './useHapticTabButton';

/**
 * Tab bar button with iOS haptics. Use ONLY as Tabs `screenOptions.tabBarButton`, never in a
 * screen's own options: a screen with both `href` and `tabBarButton` throws (TabsClient.js:17-18).
 */
export function HapticTabButton(props: HapticTabButtonProps) {
  const { onPressIn } = useHapticTabButton(props);
  return <PlatformPressable {...props} onPressIn={onPressIn} />;
}
