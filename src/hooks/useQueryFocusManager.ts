import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function handleAppStateChange(status: AppStateStatus): void {
  focusManager.setFocused(status === 'active');
}

/** Tells TanStack Query when the app is foregrounded (RN has no window focus). Removes the listener on unmount. */
export function useQueryFocusManager(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);
}
