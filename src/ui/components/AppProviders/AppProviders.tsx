import { QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as ReduxProvider } from 'react-redux';

import { DATABASE_NAME } from '@/constants/database';
import { useQueryFocusManager } from '@/hooks/useQueryFocusManager';
import { migrateDbIfNeeded } from '@/services/db/migrations';

import { AppReadyGate } from '../AppReadyGate/AppReadyGate';
import { ThemedPaperProvider } from '../ThemedPaperProvider/ThemedPaperProvider';
import { styles, type AppProvidersProps } from './AppProviders.props';
import { queryClient, useAppStore } from './useAppProviders';

/**
 * Provider order: GestureHandlerRootView → Redux → TanStack Query → Paper → SQLite → ready gate.
 * `migrateDbIfNeeded` is a module-scope function, so SQLiteProvider's memo sees a stable `onInit`.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const store = useAppStore();
  // TanStack Query refetch-on-focus follows AppState (React Native has no window focus events).
  useQueryFocusManager();
  return (
    <GestureHandlerRootView style={styles.root}>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemedPaperProvider>
            <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
              <AppReadyGate>{children}</AppReadyGate>
            </SQLiteProvider>
          </ThemedPaperProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
