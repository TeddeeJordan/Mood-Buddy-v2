import { StyleSheet } from 'react-native';

import { ICON_BUTTON_TOUCH_TARGET } from '@/constants/touchTarget';
import type { AppTheme } from '@/themes/paperTheme';

export interface ScreenHeaderProps {
  title: string;
  /** `menu` opens the drawer (tab screens); `back` pops the stack (Chat). */
  variant?: 'menu' | 'back';
}

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    header: { backgroundColor: theme.colors.background },
    // 48x48 touch target (>= 44pt iOS / 48dp Android); see ICON_BUTTON_TOUCH_TARGET.
    action: ICON_BUTTON_TOUCH_TARGET,
  });
