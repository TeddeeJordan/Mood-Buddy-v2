import { router, usePathname } from 'expo-router';

import { useRequestLeave } from '@/hooks/useLeaveGuard';

import { DRAWER_ITEMS, type AppDrawerContentProps, type DrawerMenuItem } from './AppDrawerContent.props';

/**
 * Active item comes from the pathname: the Drawer's own focused route is always `(tabs)`.
 * Choosing another item first asks the focused screen's leave guard (e.g. Profile with unsaved
 * edits); the drawer closes first so the guard's dialog is not covered.
 */
export function useAppDrawerContent({ navigation }: Pick<AppDrawerContentProps, 'navigation'>) {
  const pathname = usePathname();
  const items = DRAWER_ITEMS.map((item) => {
    const active = pathname === item.pathname;
    return { ...item, active, shownIcon: active ? item.activeIcon : item.icon };
  });

  const requestLeave = useRequestLeave();

  const onSelect = (item: DrawerMenuItem) => {
    const go = () => router.navigate(item.href);
    navigation.closeDrawer();
    if (pathname === item.pathname || !requestLeave(go)) go();
  };
  const onClose = () => navigation.closeDrawer();

  return { items, onSelect, onClose };
}
