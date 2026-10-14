import { Platform } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScreenHeaderLayout, ScreenHeaderProps } from './ScreenHeader.props';

/**
 * Most trailing actions that still keep the iOS title centred (Paper's `center-aligned` rule:
 * fewer than 3 trailing items).
 */
const MAX_TRAILING_ACTIONS_CENTRED = 2;

/**
 * Header actions and layout. The drawer action bubbles up from the tab screen to the parent Drawer.
 *
 * Layout mirrors Paper 5.15.3 `Appbar.Header` (see ScreenHeader.props.ts): safe-area top inset as
 * padding, the larger horizontal inset on both sides, iOS `center-aligned` / Android `small` title.
 */
export function useScreenHeader({ variant = 'menu', actions }: Pick<ScreenHeaderProps, 'variant' | 'actions'>) {
  const navigation = useNavigation();
  const { top, left, right } = useSafeAreaInsets();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const goBack = () => router.back();

  const trailingCount = actions?.length ?? 0;
  const centerTitle = Platform.OS === 'ios' && trailingCount <= MAX_TRAILING_ACTIONS_CENTRED;
  const layout: ScreenHeaderLayout = {
    insetTop: top,
    insetHorizontal: Math.max(left, right),
    centerTitle,
    // Paper adds a 12 margin before a left-aligned title only when it is the first item after the
    // back action (the `back` variant); after the menu action it has none.
    titleInsetStart: !centerTitle && variant === 'back' ? 12 : 0,
  };
  // Paper balances a centred title with an action-sized spacer when there is no trailing action.
  const showTrailingSpacer = centerTitle && trailingCount === 0;

  return { openDrawer, goBack, layout, showTrailingSpacer };
}
