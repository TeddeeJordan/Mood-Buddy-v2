import { screen } from '@testing-library/react-native';

import { NOTE_MAX_LENGTH } from '@/constants/limits';
import { UNCAPPED_FONT_SCALE } from '@/constants/textScaling';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { NoteField } from '@/ui/components/NoteField/NoteField';

describe('NoteField', () => {
  it('renders a labelled input limited to 50 characters with its counter', async () => {
    await renderWithProviders(
      <NoteField name="Stressor 2" accessibilityLabel="Stressor 2 of 3" value="abc" onChangeText={jest.fn()} />,
    );
    const input = screen.getByLabelText('Stressor 2 of 3');
    expect(input.props.maxLength).toBe(NOTE_MAX_LENGTH);
    expect(input.props.placeholder).toBe('Stressor 2');
    expect(input.props.value).toBe('abc');
    expect(screen.getByText('3/50')).toBeTruthy();
  });

  it('does not cap the input text size (WCAG 1.4.4)', async () => {
    await renderWithProviders(<NoteField name="Stressor 1" accessibilityLabel="Stressor 1 of 3" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText('Stressor 1 of 3').props.maxFontSizeMultiplier).toBe(UNCAPPED_FONT_SCALE);
  });
});
