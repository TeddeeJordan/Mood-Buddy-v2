import { act, renderHook, waitFor } from '@testing-library/react-native';

import { BOOTSTRAP_TIMEOUT_MS } from '@/constants/limits';
import { SECURE_KEYS } from '@/constants/storageKeys';
import { bootstrapApp, useAppBootstrap } from '@/hooks/useAppBootstrap';
import { storage } from '@/services/storage/mmkv';
import { readInstallInitialized, writeInstallInitialized } from '@/services/storage/settingsStorage';
import { makeProviders } from '@/tests/helpers/renderWithProviders';
import { secureStoreMock } from '@/tests/helpers/secureStoreMock';

const mock = secureStoreMock();

beforeEach(() => {
  storage.clearAll();
  mock.__resetSecureStore();
});

describe('useAppBootstrap', () => {
  it('dispatches hasApiKey = true when a key is stored, then flips ready', async () => {
    writeInstallInitialized(true);
    await mock.setItemAsync(SECURE_KEYS.anthropicApiKey, 'sk-ant-x');
    const { store, Wrapper } = makeProviders();
    const { result } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    expect(store.getState().settings.hasApiKey).toBe(true);
  });

  it('runs the first-install cleanup before deriving hasApiKey', async () => {
    await mock.setItemAsync(SECURE_KEYS.anthropicApiKey, 'sk-ant-orphan');
    const { store, Wrapper } = makeProviders();
    const { result } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    expect(store.getState().settings.hasApiKey).toBe(false);
    expect(readInstallInitialized()).toBe(true);
    const deleteOrder = mock.deleteItemAsync.mock.invocationCallOrder[0];
    const readOrder = mock.getItemAsync.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(readOrder);
  });

  it('becomes ready with hasApiKey false when SecureStore fails, without crashing', async () => {
    writeInstallInitialized(true);
    mock.getItemAsync.mockImplementationOnce(() => Promise.reject(new Error('keychain unavailable')));
    const { store, Wrapper } = makeProviders();
    const { result } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    expect(store.getState().settings.hasApiKey).toBe(false);
  });

  it('never logs the key value when the keychain read throws an error that echoes it', async () => {
    writeInstallInitialized(true);
    await mock.setItemAsync(SECURE_KEYS.anthropicApiKey, 'sk-ant-do-not-log');
    mock.getItemAsync.mockImplementationOnce(() =>
      Promise.reject(new Error('User interaction is not allowed (value sk-ant-do-not-log)')),
    );
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation(() => undefined),
    );
    const { store, Wrapper } = makeProviders();
    const { result } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toBe(true));
    expect(store.getState().settings.hasApiKey).toBe(false);
    expect(JSON.stringify(store.getState())).not.toContain('sk-ant');
    expect(JSON.stringify(spies.flatMap((spy) => spy.mock.calls))).not.toContain('sk-ant');
    spies.forEach((spy) => spy.mockRestore());
  });

  it('becomes ready with hasApiKey false when the cleanup fails', async () => {
    mock.deleteItemAsync.mockImplementationOnce(() => Promise.reject(new Error('locked')));
    const { store } = makeProviders();
    await bootstrapApp(store.dispatch);
    expect(store.getState().settings.hasApiKey).toBe(false);
    expect(mock.getItemAsync).not.toHaveBeenCalled();
  });

  it('does not update state after unmount', async () => {
    writeInstallInitialized(true);
    let resolveRead: (value: string | null) => void = () => undefined;
    mock.getItemAsync.mockImplementationOnce(
      () => new Promise<string | null>((resolve) => {
        resolveRead = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { store, Wrapper } = makeProviders();
    const { result, unmount } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
    expect(result.current).toBe(false);
    await unmount();
    resolveRead('sk-ant-late');
    await waitFor(() => expect(store.getState().settings.hasApiKey).toBe(true));
    expect(result.current).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  describe('startup timeout', () => {
    function hangRead() {
      writeInstallInitialized(true);
      let resolveRead: (value: string | null) => void = () => undefined;
      mock.getItemAsync.mockImplementationOnce(
        () => new Promise<string | null>((resolve) => {
          resolveRead = resolve;
        }),
      );
      return (value: string | null) => resolveRead(value);
    }

    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('becomes ready with hasApiKey false after BOOTSTRAP_TIMEOUT_MS when SecureStore never settles', async () => {
      hangRead();
      const { store, Wrapper } = makeProviders();
      const { result } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
      await act(async () => {
        jest.advanceTimersByTime(BOOTSTRAP_TIMEOUT_MS - 1);
      });
      expect(result.current).toBe(false);
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe(true);
      expect(store.getState().settings.hasApiKey).toBe(false);
    });

    it('clears the timer and dispatches nothing when unmounted before the timeout', async () => {
      hangRead();
      const { store, Wrapper } = makeProviders();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const { result, unmount } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
      const clearSpy = jest.spyOn(globalThis, 'clearTimeout');
      await unmount();
      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
      await act(async () => {
        jest.advanceTimersByTime(BOOTSTRAP_TIMEOUT_MS * 2);
      });
      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(result.current).toBe(false);
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('corrects hasApiKey to the real value when bootstrap settles after the timeout', async () => {
      const resolveRead = hangRead();
      const { store, Wrapper } = makeProviders();
      const { result } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
      await act(async () => {
        jest.advanceTimersByTime(BOOTSTRAP_TIMEOUT_MS);
      });
      expect(result.current).toBe(true);
      expect(store.getState().settings.hasApiKey).toBe(false);
      await act(async () => {
        resolveRead('sk-ant-late');
      });
      expect(store.getState().settings.hasApiKey).toBe(true);
      expect(result.current).toBe(true);
    });

    it('clears the timer on the fast path so no timeout dispatch follows', async () => {
      writeInstallInitialized(true);
      await mock.setItemAsync(SECURE_KEYS.anthropicApiKey, 'sk-ant-x');
      const { store, Wrapper } = makeProviders();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      const { result } = await renderHook(() => useAppBootstrap(), { wrapper: Wrapper });
      await waitFor(() => expect(result.current).toBe(true));
      const callsBefore = dispatchSpy.mock.calls.length;
      await act(async () => {
        jest.advanceTimersByTime(BOOTSTRAP_TIMEOUT_MS * 2);
      });
      expect(dispatchSpy.mock.calls.length).toBe(callsBefore);
      expect(store.getState().settings.hasApiKey).toBe(true);
    });
  });
});
