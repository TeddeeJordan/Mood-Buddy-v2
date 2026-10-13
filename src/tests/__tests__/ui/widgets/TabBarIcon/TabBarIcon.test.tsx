import { render, renderHook, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { TabBarIcon } from '@/ui/widgets/TabBarIcon/TabBarIcon';
import { TabSelectedContext } from '@/ui/widgets/TabBarIcon/TabSelectedContext';
import { useTabBarIcon } from '@/ui/widgets/TabBarIcon/useTabBarIcon';

const iconProps = { color: '#000', size: 24, filledName: 'home', outlineName: 'home-outline', testIDBase: 'tab-icon-x' } as const;

const withSelected = (selected: boolean | undefined) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <TabSelectedContext value={selected}>{children}</TabSelectedContext>;
  };

describe('useTabBarIcon', () => {
  it('is visible without a tab context for either layer', async () => {
    expect((await renderHook(() => useTabBarIcon(true))).result.current.visible).toBe(true);
    expect((await renderHook(() => useTabBarIcon(false))).result.current.visible).toBe(true);
  });

  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, true],
  ])('selected=%s focused=%s -> visible=%s', async (selected, focused, visible) => {
    const { result } = await renderHook(() => useTabBarIcon(focused), { wrapper: withSelected(selected) });
    expect(result.current.visible).toBe(visible);
  });
});

describe('TabBarIcon', () => {
  it('renders the filled icon for the focused layer of a selected tab', async () => {
    await render(<TabSelectedContext value={true}><TabBarIcon focused {...iconProps} /></TabSelectedContext>);
    expect(screen.getByTestId('tab-icon-x-filled')).toBeTruthy();
  });

  it('renders nothing for the focused layer of an unselected tab', async () => {
    await render(<TabSelectedContext value={false}><TabBarIcon focused {...iconProps} /></TabSelectedContext>);
    expect(screen.queryByTestId('tab-icon-x-filled')).toBeNull();
  });

  it('renders the outline icon for the unfocused layer of an unselected tab', async () => {
    await render(<TabSelectedContext value={false}><TabBarIcon focused={false} {...iconProps} /></TabSelectedContext>);
    expect(screen.getByTestId('tab-icon-x-outline')).toBeTruthy();
    expect(screen.queryByTestId('tab-icon-x-filled')).toBeNull();
  });

  it('renders outside a tab button (no context)', async () => {
    await render(<TabBarIcon focused={false} {...iconProps} />);
    expect(screen.getByTestId('tab-icon-x-outline')).toBeTruthy();
  });
});
