import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';

import { createQueryClient } from '@/services/query/queryClient';
import { initialSettingsState } from '@/state/settingsSlice';
import { makeStore, type RootState } from '@/state/store';
import { buildPaperTheme } from '@/themes/paperTheme';

export const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Redux + Query + Paper (+ safe area), without SQLite. Returns the store for assertions. */
export function makeProviders(preloaded: RootState = { settings: initialSettingsState }) {
  const store = makeStore(preloaded);
  const queryClient = createQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <PaperProvider theme={buildPaperTheme(preloaded.settings.theme)}>{children}</PaperProvider>
          </QueryClientProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    );
  }
  return { store, queryClient, Wrapper };
}

export async function renderWithProviders(ui: ReactElement, preloaded?: RootState) {
  const { store, queryClient, Wrapper } = makeProviders(preloaded);
  const result = await render(ui, { wrapper: Wrapper });
  return { ...result, store, queryClient };
}
