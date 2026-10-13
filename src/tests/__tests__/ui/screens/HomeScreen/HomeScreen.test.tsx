import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from 'expo-router';
import { AccessibilityInfo, ScrollView, View } from 'react-native';

import { useEntriesRepository } from '@/hooks/useRepositories';
import { renderWithProviders } from '@/tests/helpers/renderWithProviders';
import { HomeScreen } from '@/ui/screens/HomeScreen/HomeScreen';

jest.mock('@/hooks/useRepositories');
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useNavigation: jest.fn(),
  router: { navigate: jest.fn(), back: jest.fn() },
}));

// RNTL 14 only queries host elements, and KeyboardAvoidingView has no role, label or testID, so
// its props are captured by wrapping the component (it still renders the real one).
const mockKavProps = jest.fn();
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const actual = jest.requireActual('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView');
  const Actual = actual.default ?? actual;
  const React = jest.requireActual('react');
  const Wrapper = (props: { behavior?: string }) => {
    mockKavProps(props);
    return React.createElement(Actual, props);
  };
  return { __esModule: true, default: Wrapper };
});

const insertEntryWithPrompt = jest.fn();

beforeEach(() => {
  mockKavProps.mockClear();
  insertEntryWithPrompt.mockReset();
  insertEntryWithPrompt.mockResolvedValue({ entryId: 1, promptId: 1 });
  jest.mocked(useEntriesRepository).mockReturnValue({ insertEntryWithPrompt } as never);
  jest.mocked(useNavigation).mockReturnValue({ dispatch: jest.fn() } as unknown as ReturnType<typeof useNavigation>);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => undefined);
});

// Clear each client so no query/mutation timers outlive the test (see also gcTime in makeProviders).
const queryClients: { clear: () => void }[] = [];
async function renderHome() {
  const result = await renderWithProviders(<HomeScreen />);
  queryClients.push(result.queryClient);
  return result;
}

afterEach(() => {
  queryClients.splice(0).forEach((client) => client.clear());
  jest.restoreAllMocks();
});

const METRICS = ['mood', 'stress', 'anxiety'] as const;
const tile = (testID: string) => screen.getAllByRole('radio').find((t) => t.props.testID === testID)!;
// Test ids carry the metric and the stored value: emoji-tile-{metric}-{value}.
const row = (index: 0 | 1 | 2, value: number) => tile(`emoji-tile-${METRICS[index]}-${value}`);

describe('HomeScreen', () => {
  it('renders the three questions with no tile selected', async () => {
    await renderHome();
    expect(screen.getByText('How are you feeling today?')).toBeTruthy();
    expect(screen.getByText('How is your stress level?')).toBeTruthy();
    expect(screen.getByText('How is your anxiety level?')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(15);
    expect(screen.getAllByRole('radio').every((t) => t.props.accessibilityState.checked === false)).toBe(true);
    expect(tile('emoji-tile-mood-1')).toBeTruthy();
    expect(screen.queryByLabelText('Stressor 1 of 3')).toBeNull();
  });

  it('shows stress notes for stress 4 and hides and clears them for 3', async () => {
    await renderHome();
    const user = userEvent.setup();
    await user.press(row(1, 4));
    expect(screen.getByText('What do you think is stressing you out?')).toBeTruthy();
    await user.type(screen.getByLabelText('Stressor 1 of 3'), 'work');
    expect(screen.getByLabelText('Stressor 1 of 3').props.value).toBe('work');

    await user.press(row(1, 3));
    expect(screen.queryByLabelText('Stressor 1 of 3')).toBeNull();

    await user.press(row(1, 4));
    expect(screen.getByLabelText('Stressor 1 of 3').props.value).toBe('');
  });

  it('shows anxiety notes for anxiety 5', async () => {
    await renderHome();
    const user = userEvent.setup();
    await user.press(row(2, 5));
    expect(screen.getByLabelText('Trigger 1 of 3')).toBeTruthy();
    expect(screen.queryByLabelText('Stressor 1 of 3')).toBeNull();
  });

  it('blocks submitting with nothing selected and shows three row errors', async () => {
    await renderHome();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findAllByText('Please choose one.')).toHaveLength(3);
    expect(insertEntryWithPrompt).not.toHaveBeenCalled();
  });

  it('removes the error from a row once it is chosen', async () => {
    await renderHome();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Submit' }));
    await user.press(row(0, 3));
    expect(screen.getAllByText('Please choose one.')).toHaveLength(2);
  });

  it('saves a complete check-in, shows "Saved!" and clears the form', async () => {
    await renderHome();
    const user = userEvent.setup();
    await user.press(row(0, 4)); // mood 4
    await user.press(row(1, 5)); // stress 5 (leftmost)
    await user.press(row(2, 2)); // anxiety 2
    await user.type(screen.getByLabelText('Stressor 1 of 3'), '  deadline ');
    await user.press(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(insertEntryWithPrompt).toHaveBeenCalledTimes(1));
    const [entry, prompt] = insertEntryWithPrompt.mock.calls[0];
    expect(entry).toMatchObject({ mood: 4, stress: 5, anxiety: 2, stress_note_1: 'deadline', anxiety_note_1: null });
    expect(prompt).toContain('My stress level is Crushed.');
    expect(await screen.findByText(/Saved! Your mood has been recorded\./)).toBeTruthy();
    expect(screen.getAllByRole('radio').every((t) => t.props.accessibilityState.checked === false)).toBe(true);
    expect(screen.queryByLabelText('Stressor 1 of 3')).toBeNull();
  });

  it('shows the save error and keeps the selections when the insert fails', async () => {
    insertEntryWithPrompt.mockRejectedValue(new Error('disk full'));
    await renderHome();
    const user = userEvent.setup();
    await user.press(row(0, 4));
    await user.press(row(1, 1));
    await user.press(row(2, 1));
    await user.press(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText("Couldn't save your check-in. Try again.")).toBeTruthy();
    expect(row(0, 4).props.accessibilityState.checked).toBe(true);
    expect(screen.queryByText(/Saved!/)).toBeNull();
  });

  // Regression guard for the Android keyboard (edge-to-edge does not resize the window). It is
  // coupled to React Native's private KeyboardAvoidingView path mocked above.
  it('pads for the keyboard with behavior="padding"', async () => {
    await renderHome();
    expect(mockKavProps).toHaveBeenCalled();
    expect(mockKavProps.mock.calls.every(([props]) => props.behavior === 'padding')).toBe(true);
  });

  describe('keeping the focused note field visible', () => {
    // RNTL queries hosts only. The ScrollView host is reached through the input's ancestors (to
    // fire its onLayout); measuring and scrolling are stubbed on React Native's jest mocks.
    async function setupFocusedField() {
      await renderHome();
      const user = userEvent.setup();
      await user.press(row(1, 4));
      const input = screen.getByLabelText('Stressor 1 of 3');
      const measureLayout = jest
        .spyOn(View.prototype as unknown as { measureLayout: (...a: unknown[]) => void }, 'measureLayout')
        .mockImplementation((_content, onSuccess) => (onSuccess as (...a: number[]) => void)(0, 800, 300, 80));
      const scrollTo = jest
        .spyOn(ScrollView.prototype as unknown as { scrollTo: (...a: unknown[]) => void }, 'scrollTo')
        .mockImplementation(() => undefined);
      let scrollHost = input.parent;
      while (scrollHost && scrollHost.type !== 'RCTScrollView') scrollHost = scrollHost.parent;
      const layoutEvent = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } });
      return { user, input, measureLayout, scrollTo, scrollHost: scrollHost!, layoutEvent };
    }

    it('reveals the focused note field after a keystroke and a viewport resize (keyboard opening)', async () => {
      const { user, input, measureLayout, scrollTo, scrollHost, layoutEvent } = await setupFocusedField();
      await fireEvent(scrollHost, 'layout', layoutEvent(700));
      await fireEvent(input, 'focus');
      await user.type(input, 'a', { skipBlur: true });
      measureLayout.mockClear();
      scrollTo.mockClear();
      // The keyboard shrinks the scroll viewport; the field is far below the new bottom edge.
      await fireEvent(scrollHost, 'layout', layoutEvent(300));
      expect(measureLayout).toHaveBeenCalled();
      expect(scrollTo).toHaveBeenCalled();
    });
  });
});
