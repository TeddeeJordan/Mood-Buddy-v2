import { screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { STRESS_SCALE, tileAccessibilityLabel } from '@/constants/scales';
import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { EmojiTile } from '@/ui/widgets/EmojiTile/EmojiTile';

const option = STRESS_SCALE.options[4]; // value 5, Crushed

describe('EmojiTile', () => {
  it('is a radio with a word-only "{Label}, {direction}" label', async () => {
    await renderWithProviders(<EmojiTile metric="stress" option={option} selected={false} onSelect={jest.fn()} />);
    const tile = screen.getByRole('radio', { name: 'Crushed, most stress' });
    expect(tile.props.accessibilityLabel).toBe(tileAccessibilityLabel(option));
    expect(tile.props.accessibilityLabel).not.toMatch(/\d/);
  });

  it('reports checked state', async () => {
    const { rerender } = await renderWithProviders(
      <EmojiTile metric="stress" option={option} selected={false} onSelect={jest.fn()} />,
    );
    expect(screen.getByRole('radio').props.accessibilityState).toMatchObject({ checked: false });
    await rerender(<EmojiTile metric="stress" option={option} selected onSelect={jest.fn()} />);
    expect(screen.getByRole('radio').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('calls onSelect with the option value, not a position', async () => {
    const onSelect = jest.fn();
    await renderWithProviders(<EmojiTile metric="stress" option={option} selected={false} onSelect={onSelect} />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it('shows a decorative badge hidden from accessibility only when selected', async () => {
    const hiddenBadges = () => {
      const found: { props: Record<string, unknown> }[] = [];
      const walk = (node: unknown) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        const n = node as { props?: Record<string, unknown>; children?: unknown };
        if (n.props?.accessibilityElementsHidden === true) found.push({ props: n.props });
        walk(n.children);
      };
      walk(screen.toJSON());
      return found;
    };
    const { rerender } = await renderWithProviders(
      <EmojiTile metric="stress" option={option} selected={false} onSelect={jest.fn()} />,
    );
    expect(hiddenBadges()).toHaveLength(0);
    await rerender(<EmojiTile metric="stress" option={option} selected onSelect={jest.fn()} />);
    const badges = hiddenBadges();
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('uses a metric-and-stored-value test id', async () => {
    await renderWithProviders(<EmojiTile metric="stress" option={option} selected={false} onSelect={jest.fn()} />);
    expect(screen.getByRole('radio').props.testID).toBe('emoji-tile-stress-5');
  });

  it('is at least the minimum touch target in both dimensions', async () => {
    await renderWithProviders(<EmojiTile metric="stress" option={option} selected={false} onSelect={jest.fn()} />);
    const style = StyleSheet.flatten(screen.getByRole('radio').props.style) as {
      minWidth: number;
      minHeight: number;
    };
    expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
