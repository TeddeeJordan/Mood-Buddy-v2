import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { NOTE_MAX_LENGTH } from '@/constants/limits';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { NoteFields } from '@/ui/components/NoteFields/NoteFields';

describe('NoteFields', () => {
  it('renders the section label and three inputs labelled "Stressor n of 3"', async () => {
    await renderWithProviders(
      <NoteFields label="What stresses you?" itemName="Stressor" notes={['', '', '']} onChangeNote={jest.fn()} />,
    );
    expect(screen.getByText('What stresses you?')).toBeTruthy();
    for (const n of [1, 2, 3]) {
      expect(screen.getByLabelText(`Stressor ${n} of 3`)).toBeTruthy();
    }
    expect(screen.queryByLabelText('Stressor 4 of 3')).toBeNull();
  });

  it('labels trigger inputs the same way', async () => {
    await renderWithProviders(
      <NoteFields label="Triggers?" itemName="Trigger" notes={['', '', '']} onChangeNote={jest.fn()} />,
    );
    expect(screen.getByLabelText('Trigger 1 of 3')).toBeTruthy();
    expect(screen.getByLabelText('Trigger 3 of 3')).toBeTruthy();
  });

  it('limits each input to 50 characters', async () => {
    await renderWithProviders(
      <NoteFields label="x" itemName="Stressor" notes={['', '', '']} onChangeNote={jest.fn()} />,
    );
    for (const n of [1, 2, 3]) {
      expect(screen.getByLabelText(`Stressor ${n} of 3`).props.maxLength).toBe(NOTE_MAX_LENGTH);
    }
    expect(NOTE_MAX_LENGTH).toBe(50);
  });

  it('shows an n/50 counter per input', async () => {
    await renderWithProviders(
      <NoteFields label="x" itemName="Stressor" notes={['abc', '', 'hello world']} onChangeNote={jest.fn()} />,
    );
    expect(screen.getByText('3/50')).toBeTruthy();
    expect(screen.getByText('0/50')).toBeTruthy();
    expect(screen.getByText('11/50')).toBeTruthy();
    expect(screen.getByLabelText('3 of 50 characters')).toBeTruthy();
  });

  it('shows the placeholder "Stressor n"', async () => {
    await renderWithProviders(
      <NoteFields label="x" itemName="Stressor" notes={['', '', '']} onChangeNote={jest.fn()} />,
    );
    expect(screen.getByLabelText('Stressor 2 of 3').props.placeholder).toBe('Stressor 2');
  });

  it('reports the changed index and text', async () => {
    const onChangeNote = jest.fn();
    await renderWithProviders(
      <NoteFields label="x" itemName="Stressor" notes={['', '', '']} onChangeNote={onChangeNote} />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Stressor 2 of 3'), 'a');
    expect(onChangeNote).toHaveBeenCalledWith(1, 'a');
  });

  it('displays the provided values', async () => {
    await renderWithProviders(
      <NoteFields label="x" itemName="Stressor" notes={['work', '', '']} onChangeNote={jest.fn()} />,
    );
    expect(screen.getByLabelText('Stressor 1 of 3').props.value).toBe('work');
  });

  describe('field focus and blur callbacks', () => {
    const renderFields = async (onFieldFocus: jest.Mock, onFieldBlur: jest.Mock, unstable = true) => {
      const ui = (blur: (f: unknown) => void) => (
        <NoteFields
          label="x"
          itemName="Stressor"
          notes={['', '', '']}
          onChangeNote={jest.fn()}
          onFieldFocus={onFieldFocus}
          onFieldBlur={blur}
        />
      );
      // An inline arrow gets a new identity on every render, like the screen's props can.
      const screenResult = await renderWithProviders(unstable ? ui((f) => onFieldBlur(f)) : ui(onFieldBlur));
      return screenResult;
    };

    it('calls onFieldFocus with the container when an input gains focus', async () => {
      const onFieldFocus = jest.fn();
      await renderFields(onFieldFocus, jest.fn());
      await fireEvent(screen.getByLabelText('Stressor 1 of 3'), 'focus');
      expect(onFieldFocus).toHaveBeenCalledTimes(1);
      expect(onFieldFocus.mock.calls[0][0]).not.toBeNull();
    });

    it('does not call onFieldBlur while typing into a stateful parent, even with an unstable onFieldBlur', async () => {
      const onFieldBlur = jest.fn();
      function Harness() {
        const [notes, setNotes] = useState<[string, string, string]>(['', '', '']);
        return (
          <NoteFields
            label="x"
            itemName="Stressor"
            notes={notes}
            onChangeNote={(i, text) => setNotes((n) => n.map((v, j) => (j === i ? text : v)) as typeof n)}
            onFieldBlur={(f) => onFieldBlur(f)}
          />
        );
      }
      await renderWithProviders(<Harness />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Stressor 1 of 3'), 'abc', { skipBlur: true });
      expect(screen.getByLabelText('Stressor 1 of 3').props.value).toBe('abc');
      expect(onFieldBlur).not.toHaveBeenCalled();
    });

    it('does not call onFieldBlur when the parent re-renders with a new callback', async () => {
      const onFieldBlur = jest.fn();
      const { rerender } = await renderFields(jest.fn(), onFieldBlur);
      await rerender(
        <NoteFields
          label="x"
          itemName="Stressor"
          notes={['a', '', '']}
          onChangeNote={jest.fn()}
          onFieldBlur={(f) => onFieldBlur(f)}
        />,
      );
      expect(onFieldBlur).not.toHaveBeenCalled();
    });

    it('calls onFieldBlur with the container on a real blur', async () => {
      const onFieldFocus = jest.fn();
      const onFieldBlur = jest.fn();
      await renderFields(onFieldFocus, onFieldBlur);
      const input = screen.getByLabelText('Stressor 1 of 3');
      await fireEvent(input, 'focus');
      await fireEvent(input, 'blur');
      expect(onFieldBlur).toHaveBeenCalledTimes(1);
      expect(onFieldBlur.mock.calls[0][0]).toBe(onFieldFocus.mock.calls[0][0]);
    });

    it('calls onFieldBlur once per field with its stored container on unmount', async () => {
      const onFieldFocus = jest.fn();
      const onFieldBlur = jest.fn();
      const { unmount } = await renderFields(onFieldFocus, onFieldBlur);
      await unmount();
      expect(onFieldBlur).toHaveBeenCalledTimes(3);
      const nodes = onFieldBlur.mock.calls.map(([n]) => n);
      expect(nodes.every((n) => n !== null)).toBe(true);
      expect(new Set(nodes).size).toBe(3);
    });
  });
});
