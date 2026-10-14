import { act, render, renderHook, screen } from '@testing-library/react-native';
import { useNavigation } from 'expo-router';
import { type ReactNode, use } from 'react';
import { BackHandler, Text } from 'react-native';

import {
  createLeaveGuardRegistry,
  isInsideOpenDrawer,
  LeaveGuardContext,
  useLeaveGuard,
  useRequestLeave,
  useTabLeaveGuardListeners,
  type LeaveGuard,
} from '@/hooks/useLeaveGuard';
import { LeaveGuardProvider } from '@/ui/components/LeaveGuardProvider/LeaveGuardProvider';

// Focus is controlled by tests: useFocusEffect runs its callback while `mockFocus.focused`.
const mockFocus = {
  focused: true,
  listeners: new Set<() => void>(),
  set(value: boolean) {
    this.focused = value;
    this.listeners.forEach((l) => l());
  },
};

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    ...jest.requireActual('expo-router'),
    useNavigation: jest.fn(),
    useFocusEffect: (effect: () => void | (() => void)) => {
      const focused = React.useSyncExternalStore(
        (listener) => {
          mockFocus.listeners.add(listener);
          return () => mockFocus.listeners.delete(listener);
        },
        () => mockFocus.focused,
      );
      React.useEffect(() => (focused ? effect() : undefined), [focused, effect]);
    },
  };
});

type BackListener = () => boolean | null | undefined;

describe('createLeaveGuardRegistry', () => {
  it('does not block when no guard is registered', () => {
    const proceed = jest.fn();
    expect(createLeaveGuardRegistry().requestLeave(proceed)).toBe(false);
    expect(proceed).not.toHaveBeenCalled();
  });

  it('asks the active guard, passes proceed through and returns its answer', () => {
    const registry = createLeaveGuardRegistry();
    const guard = jest.fn<boolean, [() => void]>(() => true);
    registry.register(guard);
    const proceed = jest.fn();
    expect(registry.requestLeave(proceed)).toBe(true);
    expect(guard).toHaveBeenCalledWith(proceed);
    guard.mockReturnValue(false);
    expect(registry.requestLeave(proceed)).toBe(false);
  });

  it('stops asking a guard once it is unregistered', () => {
    const registry = createLeaveGuardRegistry();
    const guard = jest.fn(() => true);
    const unregister = registry.register(guard);
    unregister();
    expect(registry.requestLeave(jest.fn())).toBe(false);
    expect(guard).not.toHaveBeenCalled();
  });

  it('unregister only clears its own guard', () => {
    const registry = createLeaveGuardRegistry();
    const first = jest.fn(() => true);
    const second = jest.fn(() => true);
    const unregisterFirst = registry.register(first);
    registry.register(second);
    unregisterFirst();
    expect(registry.requestLeave(jest.fn())).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('outside a provider', () => {
  it('useRequestLeave never blocks', async () => {
    const { result } = await renderHook(() => useRequestLeave());
    expect(result.current(jest.fn())).toBe(false);
  });
});

describe('LeaveGuardProvider', () => {
  it('renders its children and provides one stable registry', async () => {
    const seen: unknown[] = [];
    function Probe() {
      seen.push(use(LeaveGuardContext));
      return <Text>child</Text>;
    }
    const { rerender } = await render(
      <LeaveGuardProvider>
        <Probe />
      </LeaveGuardProvider>,
    );
    expect(screen.getByText('child')).toBeTruthy();
    await rerender(
      <LeaveGuardProvider>
        <Probe />
      </LeaveGuardProvider>,
    );
    expect(new Set(seen).size).toBe(1);
  });
});

describe('useTabLeaveGuardListeners', () => {
  const wrapperFor = (registry: ReturnType<typeof createLeaveGuardRegistry>) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <LeaveGuardContext value={registry}>{children}</LeaveGuardContext>;
    };

  it('prevents the tab press when the guard blocks, and navigates to the tab if the user confirms', async () => {
    const registry = createLeaveGuardRegistry();
    let proceed: (() => void) | undefined;
    registry.register((p) => {
      proceed = p;
      return true;
    });
    const { result } = await renderHook(() => useTabLeaveGuardListeners(), { wrapper: wrapperFor(registry) });
    const navigation = { navigate: jest.fn() };
    const event = { preventDefault: jest.fn() };
    result.current({ navigation, route: { name: 'dashboard' } }).tabPress(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    proceed?.();
    expect(navigation.navigate).toHaveBeenCalledWith('dashboard');
  });

  it('lets the tab press through when no guard blocks', async () => {
    const registry = createLeaveGuardRegistry();
    registry.register(() => false);
    const { result } = await renderHook(() => useTabLeaveGuardListeners(), { wrapper: wrapperFor(registry) });
    const navigation = { navigate: jest.fn() };
    const event = { preventDefault: jest.fn() };
    result.current({ navigation, route: { name: 'index' } }).tabPress(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe('isInsideOpenDrawer', () => {
  interface TestNode {
    getState(): { type: string } | undefined;
    getParent(): TestNode | undefined;
  }
  const node = (state: { type: string } | undefined, parent?: TestNode): TestNode => ({
    getState: () => state,
    getParent: () => parent,
  });

  it('is true when the nearest drawer ancestor is open', () => {
    expect(isInsideOpenDrawer(node({ type: 'drawer', history: [{ type: 'drawer', status: 'open' }] } as never))).toBe(true);
  });

  it('is false when the drawer is closed', () => {
    expect(isInsideOpenDrawer(node({ type: 'drawer', history: [] } as never))).toBe(false);
    expect(
      isInsideOpenDrawer(
        node({ type: 'drawer', history: [{ type: 'drawer', status: 'open' }, { type: 'drawer', status: 'closed' }] } as never),
      ),
    ).toBe(false);
  });

  it('walks up through non-drawer parents (tabs inside the drawer)', () => {
    const drawer = node({ type: 'drawer', history: [{ type: 'drawer', status: 'open' }] } as never);
    const stack = node({ type: 'stack' }, drawer);
    const tabs = node({ type: 'tab' }, stack);
    expect(isInsideOpenDrawer(tabs)).toBe(true);
  });

  it('skips nodes with no state', () => {
    const drawer = node({ type: 'drawer', history: [{ type: 'drawer', status: 'open' }] } as never);
    expect(isInsideOpenDrawer(node(undefined, drawer))).toBe(true);
  });

  it('uses the nearest drawer, not a further one', () => {
    const outer = node({ type: 'drawer', history: [{ type: 'drawer', status: 'open' }] } as never);
    const inner = node({ type: 'drawer', history: [] } as never, outer);
    expect(isInsideOpenDrawer(inner)).toBe(false);
  });

  it('is false when the drawer state is partial (throws) so the guard still runs', () => {
    expect(isInsideOpenDrawer(node({ type: 'drawer' }))).toBe(false);
  });

  it('is false with no drawer ancestor', () => {
    expect(isInsideOpenDrawer(node({ type: 'tab' }, node({ type: 'stack' })))).toBe(false);
  });
});

describe('useLeaveGuard', () => {
  const navigation = { goBack: jest.fn(), getState: jest.fn(), getParent: jest.fn() };
  let backListeners: BackListener[];
  let removeBack: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFocus.focused = true;
    navigation.getState.mockReturnValue({ type: 'tab' });
    navigation.getParent.mockReturnValue(undefined);
    jest.mocked(useNavigation).mockReturnValue(navigation as never);
    backListeners = [];
    removeBack = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_event: string, listener: BackListener) => {
      backListeners.push(listener);
      return { remove: removeBack };
    }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  async function setup(guard: LeaveGuard, onBlur?: () => void) {
    const registry = createLeaveGuardRegistry();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LeaveGuardContext value={registry}>{children}</LeaveGuardContext>
    );
    const hook = await renderHook((props: { guard: LeaveGuard; onBlur?: () => void }) => useLeaveGuard(props.guard, props.onBlur), {
      wrapper,
      initialProps: { guard, onBlur },
    });
    return { registry, ...hook };
  }

  it('registers the guard with the registry while focused', async () => {
    const guard = jest.fn(() => true);
    const { registry } = await setup(guard);
    const proceed = jest.fn();
    expect(registry.requestLeave(proceed)).toBe(true);
    expect(guard).toHaveBeenCalledWith(proceed);
  });

  it('unregisters and removes the back listener on blur, and runs onBlur', async () => {
    const guard = jest.fn(() => true);
    const onBlur = jest.fn();
    const { registry } = await setup(guard, onBlur);
    await act(async () => mockFocus.set(false));
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(removeBack).toHaveBeenCalledTimes(1);
    expect(registry.requestLeave(jest.fn())).toBe(false);
  });

  it('runs onBlur on unmount', async () => {
    const onBlur = jest.fn();
    const hook = await setup(() => false, onBlur);
    await hook.unmount();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('works without an onBlur callback', async () => {
    const hook = await setup(() => false);
    await hook.unmount();
  });

  it('uses the latest guard and onBlur after a re-render without re-registering', async () => {
    const first = jest.fn(() => false);
    const second = jest.fn(() => true);
    const firstBlur = jest.fn();
    const secondBlur = jest.fn();
    const hook = await setup(first, firstBlur);
    await hook.rerender({ guard: second, onBlur: secondBlur });
    expect(hook.registry.requestLeave(jest.fn())).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    await act(async () => mockFocus.set(false));
    expect(secondBlur).toHaveBeenCalledTimes(1);
    expect(firstBlur).not.toHaveBeenCalled();
  });

  it('Android hardware back asks the guard; confirming goes back', async () => {
    let proceed: (() => void) | undefined;
    const guard = jest.fn((p: () => void) => {
      proceed = p;
      return true;
    });
    await setup(guard);
    expect(backListeners[0]()).toBe(true);
    expect(navigation.goBack).not.toHaveBeenCalled();
    proceed?.();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('hardware back is left to the navigator when the guard does not block', async () => {
    await setup(() => false);
    expect(backListeners[0]()).toBe(false);
  });

  it('hardware back is not guarded while the drawer is open (it closes the drawer)', async () => {
    navigation.getState.mockReturnValue({ type: 'drawer', history: [{ type: 'drawer', status: 'open' }] });
    const guard = jest.fn(() => true);
    await setup(guard);
    expect(backListeners[0]()).toBe(false);
    expect(guard).not.toHaveBeenCalled();
  });

  it('is safe outside a provider', async () => {
    const hook = await renderHook(() => useLeaveGuard(() => false));
    await hook.unmount();
  });
});
