import { screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ANXIETY_SCALE, MOOD_SCALE, STRESS_SCALE, type Scale } from '@/constants/scales';
import { UNCAPPED_FONT_SCALE } from '@/constants/textScaling';
import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { EmojiPicker } from '@/ui/components/EmojiPicker/EmojiPicker';

const tileIds = () => screen.getAllByRole('radio').map((t) => t.props.testID as string);

async function renderPicker(scale: Scale, value: Parameters<typeof EmojiPicker>[0]['value'] = null, onChange = jest.fn()) {
  await renderWithProviders(<EmojiPicker scale={scale} value={value} onChange={onChange} />);
  return onChange;
}

describe('EmojiPicker', () => {
  it('renders mood tiles 1 to 5', async () => {
    await renderPicker(MOOD_SCALE);
    expect(tileIds()).toEqual([1, 2, 3, 4, 5].map((v) => `emoji-tile-mood-${v}`));
  });

  it.each([STRESS_SCALE, ANXIETY_SCALE])('renders $metric tiles 5 to 1 (accessibility order matches)', async (scale) => {
    await renderPicker(scale);
    expect(tileIds()).toEqual([5, 4, 3, 2, 1].map((v) => `emoji-tile-${scale.metric}-${v}`));
    expect(screen.getAllByRole('radio').map((t) => t.props.accessibilityLabel)).toEqual(
      [...scale.options].reverse().map((o) => `${o.label}, ${o.direction}`),
    );
  });

  it('shows the question as a header and labels the radio group with it', async () => {
    await renderPicker(MOOD_SCALE);
    expect(screen.getByRole('header', { name: MOOD_SCALE.question })).toBeTruthy();
    expect(screen.getByLabelText(MOOD_SCALE.question).props.accessibilityRole).toBe('radiogroup');
  });

  it('selects nothing by default', async () => {
    await renderPicker(STRESS_SCALE);
    for (const tile of screen.getAllByRole('radio')) {
      expect(tile.props.accessibilityState).toMatchObject({ checked: false });
    }
  });

  it('checks only the tile matching the stored value', async () => {
    await renderPicker(STRESS_SCALE, 2);
    const checked = screen.getAllByRole('radio').filter((t) => t.props.accessibilityState?.checked);
    expect(checked.map((t) => t.props.testID)).toEqual(['emoji-tile-stress-2']);
  });

  it('tapping the leftmost stress tile selects the stored value 5 (SPEC 3.2)', async () => {
    const onChange = await renderPicker(STRESS_SCALE);
    const user = userEvent.setup();
    await user.press(screen.getAllByRole('radio')[0]);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('tapping the leftmost mood tile selects 1', async () => {
    const onChange = await renderPicker(MOOD_SCALE);
    const user = userEvent.setup();
    await user.press(screen.getAllByRole('radio')[0]);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('has word-only tile labels', async () => {
    await renderPicker(ANXIETY_SCALE);
    for (const tile of screen.getAllByRole('radio')) {
      expect(tile.props.accessibilityLabel).not.toMatch(/\d/);
    }
  });

  it('shows end labels visually but hides them from accessibility', async () => {
    await renderPicker(STRESS_SCALE);
    const left = screen.getByText('Most stress', { includeHiddenElements: true });
    expect(screen.getByText('Least stress', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Most stress')).toBeNull();
    expect(left).toBeTruthy();
  });

  it('gives each end caption half the row, left and right aligned', async () => {
    await renderPicker(STRESS_SCALE);
    const left = StyleSheet.flatten(screen.getByText('Most stress', { includeHiddenElements: true }).props.style);
    const right = StyleSheet.flatten(screen.getByText('Least stress', { includeHiddenElements: true }).props.style);
    expect(left).toMatchObject({ flex: 1, textAlign: 'left' });
    expect(right).toMatchObject({ flex: 1, textAlign: 'right' });
  });

  it('shows the error text only when provided', async () => {
    const { rerender } = await renderWithProviders(
      <EmojiPicker scale={MOOD_SCALE} value={null} onChange={jest.fn()} />,
    );
    expect(screen.queryByText('Please choose one.')).toBeNull();
    await rerender(<EmojiPicker scale={MOOD_SCALE} value={null} onChange={jest.fn()} errorText="Please choose one." />);
    expect(screen.getByText('Please choose one.')).toBeTruthy();
  });

  it('does not cap the error text size (WCAG 1.4.4)', async () => {
    await renderWithProviders(<EmojiPicker scale={MOOD_SCALE} value={null} onChange={jest.fn()} errorText="Please choose one." />);
    expect(screen.getByText('Please choose one.').props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
  });

  it('keeps every tile at least the minimum touch target', async () => {
    await renderPicker(MOOD_SCALE);
    for (const tile of screen.getAllByRole('radio')) {
      const style = StyleSheet.flatten(tile.props.style) as { minWidth: number; minHeight: number };
      expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });
});
