import * as Haptics from 'expo-haptics';
import { Platform, type GestureResponderEvent } from 'react-native';

import type { HapticTabButtonProps } from './HapticTabButton.props';

/** Light impact on press-in, iOS only (D17). Always forwards to the navigator's own handler. */
export function useHapticTabButton({ onPressIn }: Pick<HapticTabButtonProps, 'onPressIn'>) {
  const handlePressIn = (event: GestureResponderEvent) => {
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressIn?.(event);
  };
  return { onPressIn: handlePressIn };
}
