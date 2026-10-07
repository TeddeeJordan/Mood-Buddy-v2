import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import { storage } from '@/services/storage/mmkv';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { secureStoreMock } from '@/tests/helpers/secureStoreMock';
import { AppErrorBoundary } from '@/ui/components/AppErrorBoundary/AppErrorBoundary';
import { AppReadyGate } from '@/ui/components/AppReadyGate/AppReadyGate';

jest.mock('expo-splash-screen', () => ({
  hide: jest.fn(),
  hideAsync: jest.fn(async () => undefined),
  preventAutoHideAsync: jest.fn(async () => true),
}));

beforeEach(() => {
  storage.clearAll();
  secureStoreMock().__resetSecureStore();
  jest.mocked(SplashScreen.hide).mockClear();
});

describe('AppReadyGate', () => {
  it('renders nothing until ready, then the app; hides the splash once on layout', async () => {
    await renderWithProviders(
      <AppReadyGate>
        <Text>app content</Text>
      </AppReadyGate>,
    );
    await waitFor(() => expect(screen.getByText('app content')).toBeTruthy());
    expect(SplashScreen.hide).not.toHaveBeenCalled();

    const root = screen.getByTestId('app-ready-root');
    await fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } } });
    await fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } });
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
  });
});

describe('AppErrorBoundary', () => {
  it('hides the splash so a startup error is visible', async () => {
    await renderWithProviders(<AppErrorBoundary error={new Error('boom')} retry={async () => undefined} />);
    expect(SplashScreen.hide).toHaveBeenCalled();
    expect(screen.getByText(/boom/)).toBeTruthy();
  });
});
