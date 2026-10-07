import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/ui/components/AppProviders/AppProviders';

// Keep the native splash (sky colour) up until AppReadyGate hides it.
void SplashScreen.preventAutoHideAsync();

// A cold start straight into /chat still mounts the drawer underneath (SPEC §3.10).
export const unstable_settings = { anchor: '(drawer)' };

export { AppErrorBoundary as ErrorBoundary } from '@/ui/components/AppErrorBoundary/AppErrorBoundary';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="chat" options={{ gestureEnabled: true }} />
      </Stack>
    </AppProviders>
  );
}
