import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';

import { AppDrawerContent } from '@/ui/components/AppDrawerContent/AppDrawerContent';

// Module scope: a stable function identity for the navigator.
const renderDrawerContent = (props: DrawerContentComponentProps) => <AppDrawerContent {...props} />;

export default function DrawerLayout() {
  return <Drawer drawerContent={renderDrawerContent} screenOptions={{ headerShown: false }} />;
}
