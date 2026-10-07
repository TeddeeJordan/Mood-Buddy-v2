import { router, useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';

/** Header actions. The drawer action bubbles up from the tab screen to the parent Drawer. */
export function useScreenHeader() {
  const navigation = useNavigation();
  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const goBack = () => router.back();
  return { openDrawer, goBack };
}
