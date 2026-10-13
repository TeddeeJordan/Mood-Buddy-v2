import * as Haptics from 'expo-haptics';
import { Platform, type GestureResponderEvent } from 'react-native';

import type { HapticTabButtonProps } from './HapticTabButton.props';

/**
 * Light impact on press-in, iOS only (D17). Always forwards to the navigator's own handler.
 * `selected` is the tab's real state: the tab bar passes it as `aria-selected`.
 */
export function useHapticTabButton({
  onPressIn,
  'aria-selected': ariaSelected,
  accessibilityState,
}: Pick<HapticTabButtonProps, 'onPressIn' | 'aria-selected' | 'accessibilityState'>) {
  const handlePressIn = (event: GestureResponderEvent) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressIn?.(event);
  };
  return { onPressIn: handlePressIn, selected: Boolean(ariaSelected ?? accessibilityState?.selected) };
}
