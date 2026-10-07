import { fireEvent, screen } from '@testing-library/react-native';
import { router, useNavigation } from 'expo-router';

import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import { iconButtonContainerStyle } from '@/tests/helpers/touchTarget';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { ScreenHeader } from '@/ui/components/ScreenHeader/ScreenHeader';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useNavigation: jest.fn(),
  router: { navigate: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-router/react-navigation', () => ({
  ...jest.requireActual('expo-router/react-navigation'),
  DrawerActions: { openDrawer: jest.fn(() => ({ type: 'OPEN_DRAWER' })) },
}));

describe('ScreenHeader', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigation).mockReturnValue({ dispatch } as unknown as ReturnType<typeof useNavigation>);
  });

  it('defaults to the menu variant: shows the title and an "Open menu" button, no back button', async () => {
    await renderWithProviders(<ScreenHeader title="Home" />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
    expect(screen.queryByLabelText('Go back')).toBeNull();
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

  it('gives the "Go back" button a container of at least the minimum touch target', async () => {
    await renderWithProviders(<ScreenHeader title="Chat" variant="back" />);
    const style = iconButtonContainerStyle(screen.getByLabelText('Go back'));
    expect(style.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(style.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
