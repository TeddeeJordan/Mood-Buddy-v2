import { router, usePathname } from 'expo-router';

import { DRAWER_ITEMS, type AppDrawerContentProps, type DrawerMenuItem } from './AppDrawerContent.props';

/** Active item comes from the pathname: the Drawer's own focused route is always `(tabs)`. */
export function useAppDrawerContent({ navigation }: Pick<AppDrawerContentProps, 'navigation'>) {
  const pathname = usePathname();
  const items = DRAWER_ITEMS.map((item) => {
    const active = pathname === item.pathname;
    return { ...item, active, shownIcon: active ? item.activeIcon : item.icon };
  });

  const onSelect = (item: DrawerMenuItem) => {
    router.navigate(item.href);
    navigation.closeDrawer();
  };
  const onClose = () => navigation.closeDrawer();

  return { items, onSelect, onClose };
}
