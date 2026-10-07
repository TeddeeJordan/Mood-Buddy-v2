import { focusManager } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { handleAppStateChange, useQueryFocusManager } from '@/hooks/useQueryFocusManager';

describe('useQueryFocusManager', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    focusManager.setFocused(undefined);
  });

  it('maps AppState to focusManager and removes the listener on unmount', async () => {
    const remove = jest.fn();
    let listener: ((s: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (s: AppStateStatus) => void;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });

    const { unmount } = await renderHook(() => useQueryFocusManager());
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', handleAppStateChange);

    listener?.('background');
    expect(focusManager.isFocused()).toBe(false);
    listener?.('active');
    expect(focusManager.isFocused()).toBe(true);

    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('treats inactive as unfocused', () => {
    handleAppStateChange('inactive');
    expect(focusManager.isFocused()).toBe(false);
  });
});
