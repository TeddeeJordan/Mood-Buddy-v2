import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';

import { AppDrawerContent } from '@/ui/components/AppDrawerContent/AppDrawerContent';
import { LeaveGuardProvider } from '@/ui/components/LeaveGuardProvider/LeaveGuardProvider';

// Module scope: a stable function identity for the navigator.
const renderDrawerContent = (props: DrawerContentComponentProps) => <AppDrawerContent {...props} />;

/** LeaveGuardProvider: drawer items and tab presses ask the focused screen before leaving it. */
export default function DrawerLayout() {
  return (
    <LeaveGuardProvider>
      <Drawer drawerContent={renderDrawerContent} screenOptions={{ headerShown: false }} />
    </LeaveGuardProvider>
  );
}
