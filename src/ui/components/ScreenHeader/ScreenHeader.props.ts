import type { RefObject } from 'react';
import { StyleSheet, type View } from 'react-native';

import { ICON_BUTTON_TOUCH_TARGET } from '@/constants/touchTarget';
import type { AppTheme } from '@/themes/paperTheme';

/** A trailing icon action, rendered as an `Appbar.Action` with the 48x48 touch target. */
export interface ScreenHeaderAction {
  /** Material Community icon name. */
  icon: string;
  /** Required: icon buttons need a label. Also the React key, so keep it unique per header. */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  /** E.g. to move screen-reader focus back to this action. */
  ref?: RefObject<View | null>;
}

export interface ScreenHeaderProps {
  title: string;
  /** `menu` opens the drawer (tab screens); `back` pops the stack (Chat). */
  variant?: 'menu' | 'back';
  /** Trailing actions, in order. */
  actions?: readonly ScreenHeaderAction[];
}

/** Values from `useScreenHeader` that the styles depend on. */
export interface ScreenHeaderLayout {
  /** Safe-area top inset, applied as padding above the bar. */
  insetTop: number;
  /** The larger of the left/right safe-area insets, applied on both sides. */
  insetHorizontal: number;
  /** iOS: centred title (Paper `center-aligned`). Android: left-aligned (Paper `small`). */
  centerTitle: boolean;
  /** Space before a left-aligned title (12 after the back action, as in Paper). */
  titleInsetStart: number;
}

/**
 * Paper MD3 `small` / `center-aligned` Appbar height, kept as the bar's minimum. The title is not
 * capped (no `maxFontSizeMultiplier`): it wraps and the bar grows with it.
 *
 * Why not Paper's `Appbar.Header`: its bar is a `Surface`, and on iOS `Surface` moves `height` to an
 * outer view and gives the inner view `flex: 1` whenever `height` is set (react-native-paper 5.15.3
 * `Surface.tsx`, `SurfaceIOS`). Paper always sets a height (64, or our `'auto'` override), so the
 * inner row gets flex basis 0 and is sized by `minHeight` alone: the bar stays 64 and a large title
 * is clipped. Android's `Surface` keeps one view, so it grew there. This header copies Paper's layout
 * with plain views instead (same insets, 64 minimum, 4 side padding, 52 spacer, title alignment).
 */
export const HEADER_MIN_HEIGHT = 64;

/** Paper's `v3Spacing` width: balances a centred title when there is no trailing action. */
export const HEADER_TRAILING_SPACER_WIDTH = 52;

export const makeStyles = (theme: AppTheme, layout: ScreenHeaderLayout) =>
  StyleSheet.create({
    root: {
      backgroundColor: theme.colors.background,
      paddingTop: layout.insetTop,
      paddingHorizontal: layout.insetHorizontal,
    },
    // No fixed height: the row grows with a wrapped title.
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      minHeight: HEADER_MIN_HEIGHT,
    },
    titleContainer: {
      flex: 1,
      marginStart: layout.titleInsetStart,
      alignItems: layout.centerTitle ? 'center' : 'stretch',
    },
    title: {
      color: theme.colors.onSurface,
      paddingVertical: 4,
      textAlign: layout.centerTitle ? 'center' : 'left',
    },
    trailingSpacer: { width: HEADER_TRAILING_SPACER_WIDTH },
    // 48x48 touch target (>= 44pt iOS / 48dp Android); see ICON_BUTTON_TOUCH_TARGET.
    action: ICON_BUTTON_TOUCH_TARGET,
  });
