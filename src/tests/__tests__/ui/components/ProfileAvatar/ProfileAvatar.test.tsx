import { fireEvent, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import type { View } from 'react-native';

import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { ProfileAvatar } from '@/ui/components/ProfileAvatar/ProfileAvatar';

type Json = { type?: string; props?: Record<string, unknown>; children?: Json[] | string[] | null } | string;

/** Rendered Views hidden from screen readers (iOS and Android flags both set). */
function hiddenNodes(): Json[] {
  const found: Json[] = [];
  const walk = (node: Json | Json[] | null) => {
    if (node === null || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'View' && node.props?.importantForAccessibility === 'no-hide-descendants' && node.props.accessibilityElementsHidden === true) {
      found.push(node);
    }
    walk((node.children as Json[] | null | undefined) ?? null);
  };
  walk(screen.toJSON() as unknown as Json | Json[] | null);
  return found;
}

const PHOTO = 'file:///data/document/profile/photo-a-b.jpg';

describe('ProfileAvatar', () => {
  describe('view mode', () => {
    it('shows the photo as an image labelled "Profile photo"', async () => {
      await renderWithProviders(<ProfileAvatar photoUri={PHOTO} editable={false} />);
      expect(screen.getByRole('image', { name: 'Profile photo' })).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('hides the placeholder from screen readers when there is no photo', async () => {
      await renderWithProviders(<ProfileAvatar photoUri={null} editable={false} />);
      expect(screen.queryByRole('image')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
      expect(hiddenNodes()).toHaveLength(1);
    });
  });

  describe('edit mode', () => {
    it('is a button labelled "Add profile photo" without a photo, and the placeholder is not hidden (only the badge is)', async () => {
      await renderWithProviders(<ProfileAvatar photoUri={null} editable onPress={jest.fn()} />);
      expect(hiddenNodes()).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Add profile photo' })).toBeTruthy();
    });

    it('is a button labelled "Change profile photo" with a photo, and the image itself is not separately focusable', async () => {
      await renderWithProviders(<ProfileAvatar photoUri={PHOTO} editable onPress={jest.fn()} />);
      expect(screen.getByRole('button', { name: 'Change profile photo' })).toBeTruthy();
      expect(screen.queryByRole('image')).toBeNull();
      expect(screen.queryByLabelText('Profile photo')).toBeNull();
    });

    it('hides the decorative camera badge from the accessibility tree', async () => {
      await renderWithProviders(<ProfileAvatar photoUri={PHOTO} editable onPress={jest.fn()} />);
      expect(hiddenNodes()).toHaveLength(1);
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      await renderWithProviders(<ProfileAvatar photoUri={null} editable onPress={onPress} />);
      await fireEvent.press(screen.getByRole('button', { name: 'Add profile photo' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('blocks onPress and exposes the disabled state when disabled', async () => {
      const onPress = jest.fn();
      await renderWithProviders(<ProfileAvatar photoUri={null} editable onPress={onPress} disabled />);
      const button = screen.getByRole('button', { name: 'Add profile photo' });
      expect(button.props.accessibilityState).toMatchObject({ disabled: true });
      await fireEvent.press(button);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('reports an enabled state by default', async () => {
      await renderWithProviders(<ProfileAvatar photoUri={null} editable onPress={jest.fn()} />);
      expect(screen.getByRole('button', { name: 'Add profile photo' }).props.accessibilityState).toMatchObject({
        disabled: false,
      });
    });

    it('forwards the ref to the button', async () => {
      const ref = createRef<View>();
      await renderWithProviders(<ProfileAvatar ref={ref} photoUri={null} editable onPress={jest.fn()} />);
      expect(ref.current).not.toBeNull();
    });
  });
});
