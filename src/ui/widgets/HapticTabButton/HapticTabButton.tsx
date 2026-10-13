import { PlatformPressable } from 'expo-router/react-navigation';

import { TabSelectedContext } from '@/ui/widgets/TabBarIcon/TabSelectedContext';

import type { HapticTabButtonProps } from './HapticTabButton.props';
import { useHapticTabButton } from './useHapticTabButton';

/**
 * Tab bar button with iOS haptics. Use ONLY as Tabs `screenOptions.tabBarButton`, never in a
 * screen's own options: a screen with both `href` and `tabBarButton` throws (TabsClient.js:17-18).
 * It also tells its `TabBarIcon` whether this tab is selected, so only the visible icon renders.
 */
export function HapticTabButton(props: HapticTabButtonProps) {
  const { onPressIn, selected } = useHapticTabButton(props);
  return (
    <TabSelectedContext value={selected}>
      <PlatformPressable {...props} onPressIn={onPressIn} />
    </TabSelectedContext>
  );
}
