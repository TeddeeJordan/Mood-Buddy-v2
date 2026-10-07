import { fireEvent, renderHook, screen } from '@testing-library/react-native';
import { router, usePathname } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';

import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import { iconButtonContainerStyle } from '@/tests/helpers/touchTarget';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { buildPaperTheme } from '@/themes/paperTheme';
import { AppDrawerContent } from '@/ui/components/AppDrawerContent/AppDrawerContent';
import { useAppDrawerContent } from '@/ui/components/AppDrawerContent/useAppDrawerContent';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  usePathname: jest.fn(() => '/'),
  router: { navigate: jest.fn(), back: jest.fn() },
}));

jest.mock('expo-router/drawer', () => {
  const { ScrollView } = jest.requireActual('react-native');
  return { DrawerContentScrollView: ScrollView };
});

function makeProps() {
  const navigation = { closeDrawer: jest.fn() };
  return { navigation, props: { navigation } as unknown as DrawerContentComponentProps };
}

describe('AppDrawerContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the title, a labelled close button and exactly Diary, Profile, Settings', async () => {
    await renderWithProviders(<AppDrawerContent {...makeProps().props} />);
    expect(screen.getByText('Mood Buddy')).toBeTruthy();
    expect(screen.getByLabelText('Close menu')).toBeTruthy();
    const items = screen.getAllByRole('button').filter((b) => ['Diary', 'Profile', 'Settings'].includes(b.props.accessibilityLabel));
    expect(items.map((b) => b.props.accessibilityLabel)).toEqual(['Diary', 'Profile', 'Settings']);
    expect(screen.queryByLabelText('Home')).toBeNull();
    expect(screen.queryByLabelText('Dashboard')).toBeNull();
  });

  it('gives the "Close menu" button a container of at least the minimum touch target', async () => {
    await renderWithProviders(<AppDrawerContent {...makeProps().props} />);
    const style = iconButtonContainerStyle(screen.getByLabelText('Close menu'));
    expect(style.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(style.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('marks no item selected on Home', async () => {
    await renderWithProviders(<AppDrawerContent {...makeProps().props} />);
    for (const label of ['Diary', 'Profile', 'Settings']) {
      expect(screen.getByLabelText(label)).not.toBeSelected();
    }
  });

  it('marks the item for the current pathname as selected', async () => {
    jest.mocked(usePathname).mockReturnValue('/profile');
    await renderWithProviders(<AppDrawerContent {...makeProps().props} />);
    expect(screen.getByLabelText('Profile')).toBeSelected();
    expect(screen.getByLabelText('Diary')).not.toBeSelected();
  });

  it('marks the active item with a >= 3:1 border as well as the pill colour (not colour-only fill)', async () => {
    jest.mocked(usePathname).mockReturnValue('/diary');
    await renderWithProviders(<AppDrawerContent {...makeProps().props} />);
    const { primaryUi } = buildPaperTheme('lavender').colors;
    expect(screen.getByLabelText('Diary')).toHaveStyle({ borderWidth: 2, borderColor: primaryUi });
    expect(screen.getByLabelText('Settings')).not.toHaveStyle({ borderWidth: 2 });
  });

  it('shows a filled icon for the active item and outline icons for the rest', async () => {
    jest.mocked(usePathname).mockReturnValue('/settings');
    const { result } = await renderHook(() => useAppDrawerContent(makeProps().props));
    expect(result.current.items.map((i) => [i.label, i.active, i.shownIcon])).toEqual([
      ['Diary', false, 'book-open-variant-outline'],
      ['Profile', false, 'account-circle-outline'],
      ['Settings', true, 'cog'],
    ]);
  });

  it('navigates and closes the drawer when an item is pressed', async () => {
    const { navigation, props } = makeProps();
    await renderWithProviders(<AppDrawerContent {...props} />);
    await fireEvent.press(screen.getByLabelText('Settings'));
    expect(router.navigate).toHaveBeenCalledWith('/settings');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('closes from the close button', async () => {
    const { navigation, props } = makeProps();
    await renderWithProviders(<AppDrawerContent {...props} />);
    await fireEvent.press(screen.getByLabelText('Close menu'));
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
