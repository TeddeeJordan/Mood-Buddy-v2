import { Platform } from 'react-native';

/**
 * Screen-reader label for a visible tab bar button.
 *
 * The JS bottom tab bar's default iOS label is "{Title}, tab, {n} of {routes.length}", and
 * `routes.length` counts the hidden tabs too ("Home, tab, 1 of 5"). We pass the visible position
 * and count instead. iOS renders tab buttons with role "button", so the word "tab" belongs in the
 * label there; Android uses role "tab", which TalkBack already announces, so it is left out.
 */
export function tabAccessibilityLabel(
  title: string,
  position: number,
  count: number,
  os: typeof Platform.OS = Platform.OS,
): string {
  return os === 'ios' ? `${title}, tab, ${position} of ${count}` : `${title}, ${position} of ${count}`;
}
