import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import type React from 'react';
import { Platform, Text } from 'react-native';

import { HapticTabButton } from '@/ui/widgets/HapticTabButton/HapticTabButton';

const originalOS = Platform.OS;

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

afterEach(() => {
  setOS(originalOS);
  jest.mocked(Haptics.impactAsync).mockClear();
});

// PlatformPressable reads the navigation theme.
const withNavTheme = { wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider value={DefaultTheme}>{children}</ThemeProvider> };

async function renderButton(onPressIn = jest.fn(), onPress = jest.fn()) {
  await render(
    <HapticTabButton onPressIn={onPressIn} onPress={onPress} accessibilityLabel="Home tab">
      <Text>Home</Text>
    </HapticTabButton>,
    withNavTheme,
  );
  return { onPressIn, onPress };
}

describe('HapticTabButton', () => {
  it('fires a light impact on press-in on iOS and forwards the handlers', async () => {
    setOS('ios');
    const { onPressIn, onPress } = await renderButton();
    await fireEvent(screen.getByLabelText('Home tab'), 'pressIn');
    await fireEvent.press(screen.getByLabelText('Home tab'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(onPressIn).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });

  it('does not fire haptics on Android', async () => {
    setOS('android');
    const { onPressIn } = await renderButton();
    await fireEvent(screen.getByLabelText('Home tab'), 'pressIn');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(onPressIn).toHaveBeenCalled();
  });

  it('works without an onPressIn handler', async () => {
    setOS('ios');
    await render(
      <HapticTabButton accessibilityLabel="Dash">
        <Text>Dash</Text>
      </HapticTabButton>,
      withNavTheme,
    );
    await fireEvent(screen.getByLabelText('Dash'), 'pressIn');
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });
});
