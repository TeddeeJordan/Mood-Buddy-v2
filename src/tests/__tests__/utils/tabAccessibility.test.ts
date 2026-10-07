import { Platform } from 'react-native';

import { tabAccessibilityLabel } from '@/utils/tabAccessibility';

describe('tabAccessibilityLabel', () => {
  it('includes "tab" on iOS, where tab buttons have role "button"', () => {
    expect(tabAccessibilityLabel('Home', 1, 2, 'ios')).toBe('Home, tab, 1 of 2');
    expect(tabAccessibilityLabel('Dashboard', 2, 2, 'ios')).toBe('Dashboard, tab, 2 of 2');
  });

  it('leaves "tab" out on Android, where TalkBack announces the "tab" role itself', () => {
    expect(tabAccessibilityLabel('Home', 1, 2, 'android')).toBe('Home, 1 of 2');
    expect(tabAccessibilityLabel('Dashboard', 2, 2, 'android')).toBe('Dashboard, 2 of 2');
  });

  it('defaults to the current platform', () => {
    expect(tabAccessibilityLabel('Home', 1, 2)).toBe(tabAccessibilityLabel('Home', 1, 2, Platform.OS));
  });
});
