/**
 * A controllable `expo-router` for screen-hook tests: `useFocusEffect` runs its effect while
 * `routerFocus.focused` is true (set it with `routerFocus.set(false)` to simulate a blur), and
 * `useNavigation` returns one stable fake navigation. Use it as
 * `jest.mock('expo-router', () => require('@/tests/helpers/expoRouterFocusMock').expoRouterMock());`
 * (the factory and the test share this module instance).
 */
import { useEffect, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

export const routerFocus = {
  focused: true,
  set(value: boolean) {
    routerFocus.focused = value;
    listeners.forEach((listener) => listener());
  },
  reset() {
    routerFocus.focused = true;
    listeners.clear();
  },
};

/** Stable identity, like React Navigation's. `isFocused` follows `routerFocus` unless overridden. */
export const fakeNavigation = {
  isFocused: jest.fn(() => routerFocus.focused),
  goBack: jest.fn(),
  navigate: jest.fn(),
  dispatch: jest.fn(),
  getState: jest.fn((): { type: string } | undefined => ({ type: 'tab' })),
  getParent: jest.fn((): unknown => undefined),
};

export function resetFakeNavigation() {
  fakeNavigation.isFocused.mockReset().mockImplementation(() => routerFocus.focused);
  fakeNavigation.goBack.mockReset();
  fakeNavigation.navigate.mockReset();
  fakeNavigation.dispatch.mockReset();
  fakeNavigation.getState.mockReset().mockImplementation(() => ({ type: 'tab' }));
  fakeNavigation.getParent.mockReset().mockImplementation(() => undefined);
}

export function expoRouterMock() {
  return {
    ...jest.requireActual('expo-router'),
    useNavigation: () => fakeNavigation,
    useFocusEffect: (effect: () => void | (() => void)) => {
      const focused = useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => routerFocus.focused,
      );
      useEffect(() => (focused ? effect() : undefined), [focused, effect]);
    },
    router: { navigate: jest.fn(), back: jest.fn() },
  };
}
