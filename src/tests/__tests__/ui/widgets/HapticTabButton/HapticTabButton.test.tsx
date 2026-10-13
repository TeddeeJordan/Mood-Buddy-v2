import { render, screen } from '@testing-library/react-native';
import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';

import { HapticTabButton } from '@/ui/widgets/HapticTabButton/HapticTabButton';
import type { HapticTabButtonProps } from '@/ui/widgets/HapticTabButton/HapticTabButton.props';
import { TabBarIcon } from '@/ui/widgets/TabBarIcon/TabBarIcon';

const iconProps = { color: '#000', size: 24, filledName: 'home', outlineName: 'home-outline', testIDBase: 'tab-icon-home' } as const;

// Both layers render, as the real tab bar does (focused and unfocused icon); the button decides
// which one is visible from its `aria-selected`.
const renderButton = (selected: boolean) =>
  render(
    <ThemeProvider value={DefaultTheme}>
    <HapticTabButton {...({ 'aria-selected': selected, onPress: jest.fn() } as unknown as HapticTabButtonProps)}>
      <TabBarIcon focused {...iconProps} />
      <TabBarIcon focused={false} {...iconProps} />
    </HapticTabButton>
    </ThemeProvider>,
  );

describe('HapticTabButton', () => {
  it('shows only the filled icon when the tab is selected', async () => {
    await renderButton(true);
    expect(screen.getByTestId('tab-icon-home-filled')).toBeTruthy();
    expect(screen.queryByTestId('tab-icon-home-outline')).toBeNull();
  });

  it('shows only the outline icon when the tab is not selected', async () => {
    await renderButton(false);
    expect(screen.getByTestId('tab-icon-home-outline')).toBeTruthy();
    expect(screen.queryByTestId('tab-icon-home-filled')).toBeNull();
  });
});
