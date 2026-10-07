import * as SplashScreen from 'expo-splash-screen';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { storage } from '@/services/storage/mmkv';
import { secureStoreMock } from '@/tests/helpers/secureStoreMock';

/**
 * Real provider chain (AppProviders → real SQLiteProvider → real migrateDbIfNeeded) under the real
 * root layout, with only expo-sqlite's native module faked. The fake connection opens fine but its
 * first statement (`PRAGMA foreign_keys = ON`, run by configureConnection) fails, so the migration
 * `onInit` rejects exactly as a locked/corrupt database would.
 */
const mockExec = jest.fn<Promise<void>, [string]>();
jest.mock('../../../../node_modules/expo-sqlite/build/ExpoSQLite', () => ({
  __esModule: true,
  default: {
    defaultDatabaseDirectory: '/mock/SQLite',
    ensureDatabasePathExistsAsync: jest.fn(async () => undefined),
    NativeDatabase: class {
      initAsync = async () => undefined;
      closeAsync = async () => undefined;
      execAsync = (source: string) => mockExec(source);
    },
  },
}));
jest.mock('../../../../node_modules/expo-sqlite/build/SQLiteDevToolsClient', () => ({
  registerDatabaseForDevToolsAsync: jest.fn(),
  unregisterDatabaseForDevToolsAsync: jest.fn(),
}));
jest.mock('expo-splash-screen', () => ({
  hide: jest.fn(),
  hideAsync: jest.fn(async () => undefined),
  preventAutoHideAsync: jest.fn(async () => true),
}));

beforeEach(() => {
  storage.clearAll();
  secureStoreMock().__resetSecureStore();
  mockExec.mockRejectedValue(new Error('database disk image is malformed'));
});

describe('startup failure (migration onInit rejects)', () => {
  it('shows the error boundary, hides the splash and never renders the app', async () => {
    // React logs the caught render error; keep the output clean but assert nothing else is logged.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = renderRouter('src/app', { initialUrl: '/' });
    await result;

    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeTruthy());
    expect(screen.getByTestId('router_error_message')).toHaveTextContent('Error: database disk image is malformed');
    expect(screen.getByTestId('router_error_retry')).toBeTruthy();
    // AppReadyGate never mounted, so only the boundary can have hidden the splash.
    expect(screen.queryByTestId('app-ready-root')).toBeNull();
    expect(SplashScreen.hide).toHaveBeenCalled();
    // The failing statement was the first thing the migration ran: nothing else touched the DB.
    expect(mockExec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    errorSpy.mockRestore();
  });
});
