import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { TabBarIconProps } from './TabBarIcon.props';
import { useTabBarIcon } from './useTabBarIcon';

/** Tab icon: filled when selected, outline otherwise. Renders only the visible icon layer. */
export function TabBarIcon({ focused, color, size, filledName, outlineName, testIDBase }: TabBarIconProps) {
  const { visible } = useTabBarIcon(focused);
  if (!visible) return null;
  return (
    <MaterialCommunityIcons
      name={focused ? filledName : outlineName}
      color={color}
      size={size}
      testID={`${testIDBase}-${focused ? 'filled' : 'outline'}`}
    />
  );
}
