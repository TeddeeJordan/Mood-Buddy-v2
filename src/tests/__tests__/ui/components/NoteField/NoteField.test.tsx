import { screen } from '@testing-library/react-native';

import { NOTE_MAX_LENGTH } from '@/constants/limits';
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
});
