import { ErrorBoundary as RouterErrorBoundary } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import type { AppErrorBoundaryProps } from './AppErrorBoundary.props';

/**
 * Root error boundary. If startup fails (e.g. a migration throws inside SQLiteProvider),
 * AppReadyGate never mounts, so hide the native splash here or the user is stuck on it.
 */
export function AppErrorBoundary(props: AppErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return <RouterErrorBoundary {...props} />;
}
