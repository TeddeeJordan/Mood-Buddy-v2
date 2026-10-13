import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface TabBarIconProps {
  /** The `focused` the tab bar passed for this icon layer (true = the active layer). */
  focused: boolean;
  color: ColorValue;
  size: number;
  /** Icon shown when the tab is selected. */
  filledName: IconName;
  /** Icon shown when the tab is not selected (selection is never colour-only, WCAG 1.4.1). */
  outlineName: IconName;
  /** Base test ID; the icon gets `{testIDBase}-filled` or `{testIDBase}-outline`. */
  testIDBase: string;
}
