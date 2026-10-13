import { renderHook } from '@testing-library/react-native';

import { useHapticTabButton } from '@/ui/widgets/HapticTabButton/useHapticTabButton';

jest.mock('expo-haptics');

describe('useHapticTabButton selected', () => {
  it.each([true, false])('uses aria-selected=%s', async (value) => {
    const { result } = await renderHook(() => useHapticTabButton({ 'aria-selected': value }));
    expect(result.current.selected).toBe(value);
  });

  it('prefers aria-selected over accessibilityState', async () => {
    const { result } = await renderHook(() =>
      useHapticTabButton({ 'aria-selected': false, accessibilityState: { selected: true } }),
    );
    expect(result.current.selected).toBe(false);
  });

  it('falls back to accessibilityState.selected', async () => {
    const { result } = await renderHook(() => useHapticTabButton({ accessibilityState: { selected: true } }));
    expect(result.current.selected).toBe(true);
  });

  it('is false when neither is given', async () => {
    const { result } = await renderHook(() => useHapticTabButton({}));
    expect(result.current.selected).toBe(false);
  });
});
