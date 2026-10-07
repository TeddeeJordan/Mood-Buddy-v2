import type { Href } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { StyleSheet } from 'react-native';

import { ICON_BUTTON_TOUCH_TARGET } from '@/constants/touchTarget';
import type { AppTheme } from '@/themes/paperTheme';

export type AppDrawerContentProps = DrawerContentComponentProps;

export interface DrawerMenuItem {
  label: string;
  href: Href;
  /** The pathname that marks this item active. */
  pathname: string;
  /** Filled icon, shown when the item is active. */
  activeIcon: string;
  /** Outline icon, shown otherwise (selection is never shown by colour alone, WCAG 1.4.1). */
  icon: string;
}

/** Diary, Profile and Settings only (D17, D35). Home and Dashboard live in the tab bar. */
export const DRAWER_ITEMS: readonly DrawerMenuItem[] = [
  { label: 'Diary', href: '/diary', pathname: '/diary', activeIcon: 'book-open-variant', icon: 'book-open-variant-outline' },
  { label: 'Profile', href: '/profile', pathname: '/profile', activeIcon: 'account-circle', icon: 'account-circle-outline' },
  { label: 'Settings', href: '/settings', pathname: '/settings', activeIcon: 'cog', icon: 'cog-outline' },
];

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.surface },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 16,
      paddingBottom: 8,
    },
    title: { color: theme.colors.onSurface },
    // 48x48 touch target (>= 44pt iOS / 48dp Android); see ICON_BUTTON_TOUCH_TARGET.
    closeButton: ICON_BUTTON_TOUCH_TARGET,
    // The active pill (secondaryContainer) is < 3:1 against the white drawer, so the active item
    // also gets a >= 3:1 border (primaryUi on surface is asserted in contrast.test.ts) and a filled icon.
    activeItem: { borderWidth: 2, borderColor: theme.colors.primaryUi },
  });
