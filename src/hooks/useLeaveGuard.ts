import { useFocusEffect, useNavigation } from 'expo-router';
import { getDrawerStatusFromState } from 'expo-router/drawer';
import { createContext, use, useCallback, useLayoutEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/**
 * Asks the focused screen whether the user may leave it.
 * Returns `true` when the screen blocks the leave: it then asks the user (e.g. a "Discard
 * changes?" dialog) and calls `proceed` only if they confirm. Returns `false` to let the
 * navigation go ahead untouched (the caller performs it).
 */
export type LeaveGuard = (proceed: () => void) => boolean;

/**
 * One active guard at a time: the focused screen's. JS Tabs keep a screen mounted when another
 * tab or drawer item is chosen, so React Navigation's `beforeRemove` / `usePreventRemove` never
 * fire for those switches. The navigation entry points ask this registry instead: the Tabs
 * `tabPress` listener (`useTabLeaveGuardListeners`), the drawer items, and Android hardware back
 * (`useLeaveGuard`).
 */
export interface LeaveGuardRegistry {
  /** Makes `guard` the active one. The returned function clears it (only if still active). */
  register(guard: LeaveGuard): () => void;
  /** Asks the active guard, if any. See `LeaveGuard` for the return value. */
  requestLeave(proceed: () => void): boolean;
}

export function createLeaveGuardRegistry(): LeaveGuardRegistry {
  let active: LeaveGuard | null = null;
  return {
    register(guard) {
      active = guard;
      return () => {
        if (active === guard) active = null;
      };
    },
    requestLeave(proceed) {
      return active?.(proceed) ?? false;
    },
  };
}

/** Outside a provider (e.g. a screen rendered alone in a test) nothing is ever blocked. */
const NO_GUARDS: LeaveGuardRegistry = { register: () => () => undefined, requestLeave: () => false };

/** Provided once around the Drawer (`LeaveGuardProvider`); the value is a stable registry. */
export const LeaveGuardContext = createContext<LeaveGuardRegistry>(NO_GUARDS);

/** For navigation entry points: `if (!requestLeave(go)) go();`. */
export function useRequestLeave(): LeaveGuardRegistry['requestLeave'] {
  return use(LeaveGuardContext).requestLeave;
}

/**
 * `screenListeners` for the Tabs navigator: a tab press while the focused screen blocks leaving
 * is prevented, and the guard navigates to the pressed tab if the user confirms.
 */
export function useTabLeaveGuardListeners() {
  const requestLeave = useRequestLeave();
  return ({ navigation, route }: { navigation: { navigate: (name: string) => void }; route: { name: string } }) => ({
    tabPress: (event: { preventDefault: () => void }) => {
      if (requestLeave(() => navigation.navigate(route.name))) event.preventDefault();
    },
  });
}

/** The parts of a navigation object `isInsideOpenDrawer` reads. */
interface NavigationNode {
  getState(): { type: string } | undefined;
  getParent(): NavigationNode | undefined;
}

/**
 * True when the nearest Drawer navigator above `navigation` is open. Walks up the parents instead
 * of `useDrawerStatus()`, which throws outside a Drawer (e.g. a screen rendered alone in a test).
 */
export function isInsideOpenDrawer(navigation: NavigationNode): boolean {
  for (let node: NavigationNode | undefined = navigation; node; node = node.getParent()) {
    const state = node.getState();
    if (state?.type === 'drawer') {
      try {
        return getDrawerStatusFromState(state as Parameters<typeof getDrawerStatusFromState>[0]) === 'open';
      } catch {
        // Not a full drawer state (e.g. no `history`): treat as closed so the guard still runs.
        return false;
      }
    }
  }
  return false;
}

/**
 * Guards the calling screen while it is focused: registers `guard` with the registry and runs it
 * for Android hardware back (confirming then goes back). While the drawer is open, back is left to
 * the navigator so it closes the drawer; the guard is not asked. `onBlur` runs whenever the screen loses
 * focus by any route (including ones no guard sees, e.g. a deep link), so a screen can drop an
 * unfinished draft there. Both callbacks are read through a ref, so they may change every render.
 */
export function useLeaveGuard(guard: LeaveGuard, onBlur?: () => void) {
  const registry = use(LeaveGuardContext);
  const navigation = useNavigation();
  const latest = useRef({ guard, onBlur });
  useLayoutEffect(() => {
    latest.current = { guard, onBlur };
  });

  useFocusEffect(
    useCallback(() => {
      const unregister = registry.register((proceed) => latest.current.guard(proceed));
      const back = BackHandler.addEventListener('hardwareBackPress', () =>
        isInsideOpenDrawer(navigation) ? false : latest.current.guard(() => navigation.goBack()),
      );
      return () => {
        unregister();
        back.remove();
        latest.current.onBlur?.();
      };
    }, [registry, navigation]),
  );
}
