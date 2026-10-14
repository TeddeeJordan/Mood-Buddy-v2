import { fireEvent, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import { iconButtonContainerStyle } from '@/tests/helpers/touchTarget';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { HEADER_MIN_HEIGHT, HEADER_TRAILING_SPACER_WIDTH } from '@/ui/components/ScreenHeader/ScreenHeader.props';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useNavigation: jest.fn(),
  router: { navigate: jest.fn(), back: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('expo-router/react-navigation', () => ({
  ...jest.requireActual('expo-router/react-navigation'),
  DrawerActions: { openDrawer: jest.fn(() => ({ type: 'OPEN_DRAWER' })) },
}));

type Style = Record<string, unknown>;
const originalOS = Platform.OS;

function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

/** Flattened styles of the node and all its ancestors, innermost first. */
function ancestorStyles(node: ReturnType<typeof screen.getByText>): Style[] {
  const styles: Style[] = [];
  for (let n: typeof node | null = node; n; n = n.parent) {
    styles.push((StyleSheet.flatten(n.props.style) ?? {}) as Style);
  }
  return styles;
}

function titleContainerStyle(): Style {
  return ancestorStyles(screen.getByText('Title')).find((style) => style.flex === 1) ?? {};
}

/** Widths of the direct children of the bar row (the node carrying minHeight). */
function barChildWidths(): unknown[] {
  let node: ReturnType<typeof screen.getByText> | null = screen.getByText('Title');
  while (node && StyleSheet.flatten(node.props.style)?.minHeight !== HEADER_MIN_HEIGHT) node = node.parent;
  return (node?.children ?? []).map((c) => (typeof c === 'string' ? undefined : StyleSheet.flatten(c.props.style)?.width));
}

const twoActions = [
  { icon: 'close', accessibilityLabel: 'Cancel editing', onPress: jest.fn() },
  { icon: 'check', accessibilityLabel: 'Save profile', onPress: jest.fn() },
];
const threeActions = [...twoActions, { icon: 'pencil', accessibilityLabel: 'Edit profile', onPress: jest.fn() }];

describe('ScreenHeader', () => {
  const dispatch = jest.fn();

  afterEach(() => setOS(originalOS));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 47, left: 0, right: 0, bottom: 34 });
    jest.mocked(useNavigation).mockReturnValue({ dispatch } as unknown as ReturnType<typeof useNavigation>);
  });

  it('defaults to the menu variant: shows the title and an "Open menu" button, no back button', async () => {
    await renderWithProviders(<ScreenHeader title="Home" />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
    expect(screen.queryByLabelText('Go back')).toBeNull();
  });

  it('does not cap the title font scaling (it follows the system text size)', async () => {
    await renderWithProviders(<ScreenHeader title="Home" />);
    // Neither the old 1.5 cap nor an accidental 0: undefined leaves RN's default (uncapped).
    expect(screen.getByText('Home').props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('marks the title as a header for screen readers', async () => {
    await renderWithProviders(<ScreenHeader title="Home" />);
    expect(screen.getByRole('header', { name: 'Home' })).toBeTruthy();
  });

  it('lets the bar grow with the title: a 64 minimum and no fixed height', async () => {
    await renderWithProviders(<ScreenHeader title="Home" />);
    const styles = ancestorStyles(screen.getByText('Home'));
    expect(styles.some((style) => style.minHeight === HEADER_MIN_HEIGHT)).toBe(true);
    expect(styles.some((style) => typeof style.height === 'number' && style.height === 64)).toBe(false);
    expect(styles.some((style) => style.height !== undefined)).toBe(false);
    expect(HEADER_MIN_HEIGHT).toBe(64);
  });

  describe('layout per platform', () => {
    it('iOS: centres the title and balances it with a trailing spacer when there are no actions', async () => {
      setOS('ios');
      await renderWithProviders(<ScreenHeader title="Title" />);
      expect(StyleSheet.flatten(screen.getByText('Title').props.style)).toMatchObject({ textAlign: 'center' });
      expect(titleContainerStyle()).toMatchObject({ alignItems: 'center', marginStart: 0 });
      expect(barChildWidths()).toContain(HEADER_TRAILING_SPACER_WIDTH);
      expect(HEADER_TRAILING_SPACER_WIDTH).toBe(52);
    });

    it('iOS: keeps the title centred with one or two actions but without the spacer', async () => {
      setOS('ios');
      await renderWithProviders(<ScreenHeader title="Title" actions={twoActions} />);
      expect(StyleSheet.flatten(screen.getByText('Title').props.style)).toMatchObject({ textAlign: 'center' });
      expect(barChildWidths()).not.toContain(HEADER_TRAILING_SPACER_WIDTH);
    });

    it('iOS: has no spacer with exactly one action', async () => {
      setOS('ios');
      await renderWithProviders(<ScreenHeader title="Title" actions={twoActions.slice(0, 1)} />);
      expect(StyleSheet.flatten(screen.getByText('Title').props.style)).toMatchObject({ textAlign: 'center' });
      expect(barChildWidths()).not.toContain(HEADER_TRAILING_SPACER_WIDTH);
    });

    it('iOS: left-aligns the title with three or more actions', async () => {
      setOS('ios');
      await renderWithProviders(<ScreenHeader title="Title" actions={threeActions} />);
      expect(StyleSheet.flatten(screen.getByText('Title').props.style)).toMatchObject({ textAlign: 'left' });
      expect(titleContainerStyle()).toMatchObject({ alignItems: 'stretch' });
    });

    it('Android: left-aligns the title with no start margin in the menu variant and no spacer', async () => {
      setOS('android');
      await renderWithProviders(<ScreenHeader title="Title" />);
      expect(StyleSheet.flatten(screen.getByText('Title').props.style)).toMatchObject({ textAlign: 'left' });
      expect(titleContainerStyle()).toMatchObject({ alignItems: 'stretch', marginStart: 0 });
      expect(barChildWidths()).not.toContain(HEADER_TRAILING_SPACER_WIDTH);
    });

    it('Android: adds a 12 start margin only in the back variant', async () => {
      setOS('android');
      await renderWithProviders(<ScreenHeader title="Title" variant="back" />);
      expect(titleContainerStyle()).toMatchObject({ marginStart: 12 });
    });

    it('iOS: has no start margin in the back variant (title is centred)', async () => {
      setOS('ios');
      await renderWithProviders(<ScreenHeader title="Title" variant="back" />);
      expect(titleContainerStyle()).toMatchObject({ marginStart: 0 });
    });
  });

  describe('safe area', () => {
    it('pads the top by the inset and both sides by the larger horizontal inset', async () => {
      jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 30, left: 10, right: 20, bottom: 0 });
      await renderWithProviders(<ScreenHeader title="Title" />);
      const styles = ancestorStyles(screen.getByText('Title'));
      expect(styles.some((s) => s.paddingTop === 30 && s.paddingHorizontal === 20)).toBe(true);
    });

    it('uses the left inset when it is the larger one', async () => {
      jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 0, left: 44, right: 0, bottom: 0 });
      await renderWithProviders(<ScreenHeader title="Title" />);
      expect(ancestorStyles(screen.getByText('Title')).some((s) => s.paddingHorizontal === 44)).toBe(true);
    });
  });

  describe('actions', () => {
    it('renders no trailing buttons without actions', async () => {
      await renderWithProviders(<ScreenHeader title="Home" />);
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('renders each action as a labelled button after the title, in order', async () => {
      await renderWithProviders(
        <ScreenHeader
          title="Profile"
          actions={[
            { icon: 'close', accessibilityLabel: 'Cancel editing', onPress: jest.fn() },
            { icon: 'check', accessibilityLabel: 'Save profile', onPress: jest.fn() },
          ]}
        />,
      );
      const labels = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
      expect(labels).toEqual(['Open menu', 'Cancel editing', 'Save profile']);
    });

    it('calls onPress of the pressed action only', async () => {
      const cancel = jest.fn();
      const save = jest.fn();
      await renderWithProviders(
        <ScreenHeader
          title="Profile"
          actions={[
            { icon: 'close', accessibilityLabel: 'Cancel editing', onPress: cancel },
            { icon: 'check', accessibilityLabel: 'Save profile', onPress: save },
          ]}
        />,
      );
      await fireEvent.press(screen.getByLabelText('Save profile'));
      expect(save).toHaveBeenCalledTimes(1);
      expect(cancel).not.toHaveBeenCalled();
    });

    it('gives actions a container of at least the minimum touch target', async () => {
      await renderWithProviders(
        <ScreenHeader title="Profile" actions={[{ icon: 'pencil', accessibilityLabel: 'Edit profile', onPress: jest.fn() }]} />,
      );
      const style = iconButtonContainerStyle(screen.getByLabelText('Edit profile'));
      expect(style.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(style.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('exposes disabled as accessibility state and blocks presses', async () => {
      const onPress = jest.fn();
      await renderWithProviders(
        <ScreenHeader
          title="Profile"
          actions={[{ icon: 'pencil', accessibilityLabel: 'Edit profile', onPress, disabled: true }]}
        />,
      );
      expect(screen.getByLabelText('Edit profile').props.accessibilityState).toMatchObject({ disabled: true });
      await fireEvent.press(screen.getByLabelText('Edit profile'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('is enabled by default', async () => {
      await renderWithProviders(
        <ScreenHeader title="Profile" actions={[{ icon: 'pencil', accessibilityLabel: 'Edit profile', onPress: jest.fn() }]} />,
      );
      expect(screen.getByLabelText('Edit profile').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('forwards the ref of an action to its button', async () => {
      const ref = { current: null } as { current: unknown };
      await renderWithProviders(
        <ScreenHeader
          title="Profile"
          actions={[{ icon: 'pencil', accessibilityLabel: 'Edit profile', onPress: jest.fn(), ref: ref as never }]}
        />,
      );
      expect(ref.current).not.toBeNull();
    });
  });

  it('opens the drawer when the menu button is pressed', async () => {
    await renderWithProviders(<ScreenHeader title="Home" />);
    await fireEvent.press(screen.getByLabelText('Open menu'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
  });

  it('shows a "Go back" button instead of the menu in the back variant and navigates back', async () => {
    await renderWithProviders(<ScreenHeader title="Chat" variant="back" />);
    expect(screen.queryByLabelText('Open menu')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Go back'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('gives the "Open menu" button a container of at least the minimum touch target', async () => {
    await renderWithProviders(<ScreenHeader title="Home" />);
    const style = iconButtonContainerStyle(screen.getByLabelText('Open menu'));
    expect(style.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(style.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('renders the back action with the back variant, keeping the title as a header', async () => {
    await renderWithProviders(<ScreenHeader title="Chat" variant="back" />);
    expect(screen.getByRole('header', { name: 'Chat' })).toBeTruthy();
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('gives trailing actions the touch-target container alongside the leading one', async () => {
    await renderWithProviders(<ScreenHeader title="Title" actions={twoActions} />);
    for (const label of ['Open menu', 'Cancel editing', 'Save profile']) {
      const style = iconButtonContainerStyle(screen.getByLabelText(label));
      expect(style.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(style.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });

  it('gives the "Go back" button a container of at least the minimum touch target', async () => {
    await renderWithProviders(<ScreenHeader title="Chat" variant="back" />);
    const style = iconButtonContainerStyle(screen.getByLabelText('Go back'));
    expect(style.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(style.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
