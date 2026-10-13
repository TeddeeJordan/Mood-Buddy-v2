import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { useEntriesRepository } from '@/hooks/useRepositories';
import { makeProviders } from '@/tests/helpers/renderWithProviders';
import {
  homeFormReducer,
  initialHomeFormState,
  missingAnnouncement,
  RESUBMIT_GUARD_MS,
  ROW_REQUIRED_MESSAGE,
  SAVE_ERROR_MESSAGE,
  SAVED_MESSAGE,
  useHomeScreen,
  type HomeFormState,
} from '@/ui/screens/HomeScreen/useHomeScreen';

jest.mock('@/hooks/useRepositories');

const insertEntryWithPrompt = jest.fn();
let announce: jest.SpyInstance;
let announceWithOptions: jest.SpyInstance;
const originalOS = Platform.OS;

beforeEach(() => {
  insertEntryWithPrompt.mockReset();
  insertEntryWithPrompt.mockResolvedValue({ entryId: 1, promptId: 1 });
  jest.mocked(useEntriesRepository).mockReturnValue({ insertEntryWithPrompt } as never);
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  announceWithOptions = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  announce.mockRestore();
  announceWithOptions.mockRestore();
  Platform.OS = originalOS;
});

describe('homeFormReducer', () => {
  const select = (state: HomeFormState, metric: 'mood' | 'stress' | 'anxiety', value: 1 | 2 | 3 | 4 | 5) =>
    homeFormReducer(state, { type: 'select', metric, value });
  const withNotes = (value: 4 | 5) => {
    let state = select(initialHomeFormState, 'stress', value);
    state = homeFormReducer(state, { type: 'setNote', metric: 'stress', index: 0, text: 'work' });
    return state;
  };

  it('starts with nothing selected', () => {
    expect(initialHomeFormState.values).toEqual({ mood: null, stress: null, anxiety: null });
    expect(initialHomeFormState.showMissing).toBe(false);
  });

  it('clears that section notes when stress drops below 4', () => {
    const state = select(withNotes(4), 'stress', 3);
    expect(state.values.stress).toBe(3);
    expect(state.notes.stress).toEqual(['', '', '']);
  });

  it('keeps notes when moving from 4 to 5', () => {
    expect(select(withNotes(4), 'stress', 5).notes.stress[0]).toBe('work');
  });

  it('clears only the changed metric notes', () => {
    let state = select(initialHomeFormState, 'anxiety', 4);
    state = homeFormReducer(state, { type: 'setNote', metric: 'anxiety', index: 1, text: 'crowds' });
    state = select(state, 'stress', 2);
    expect(state.notes.anxiety[1]).toBe('crowds');
  });

  it('selecting mood never touches notes', () => {
    const before = withNotes(4);
    expect(select(before, 'mood', 1).notes).toBe(before.notes);
  });

  it('sets the note at the given index only', () => {
    const state = homeFormReducer(initialHomeFormState, { type: 'setNote', metric: 'anxiety', index: 2, text: 'x' });
    expect(state.notes.anxiety).toEqual(['', '', 'x']);
    expect(state.notes.stress).toEqual(['', '', '']);
  });

  it.each([-1, 3])('returns the same state object for an out-of-range note index %i', (index) => {
    const state = homeFormReducer(initialHomeFormState, { type: 'setNote', metric: 'stress', index, text: 'x' });
    expect(state).toBe(initialHomeFormState);
  });

  it('flags missing rows', () => {
    expect(homeFormReducer(initialHomeFormState, { type: 'showMissing' }).showMissing).toBe(true);
  });

  it('resets to the initial state', () => {
    const dirty = homeFormReducer(withNotes(5), { type: 'showMissing' });
    expect(homeFormReducer(dirty, { type: 'reset' })).toBe(initialHomeFormState);
  });
});

describe('missingAnnouncement', () => {
  it('names a single missing metric', () => {
    expect(missingAnnouncement(['mood'])).toBe('Please select your mood before submitting.');
  });
  it('joins two with "and"', () => {
    expect(missingAnnouncement(['mood', 'anxiety'])).toBe(
      'Please select your mood and anxiety level before submitting.',
    );
  });
  it('uses the Oxford comma for all three', () => {
    expect(missingAnnouncement(['mood', 'stress', 'anxiety'])).toBe(
      'Please select your mood, stress level, and anxiety level before submitting.',
    );
  });
});

async function setupHook() {
  const { Wrapper, store } = makeProviders();
  const hook = await renderHook(() => useHomeScreen(), { wrapper: Wrapper });
  return { ...hook, store };
}

type Hook = Awaited<ReturnType<typeof setupHook>>['result'];

async function fillForm(result: Hook, stress: 1 | 2 | 3 | 4 | 5 = 2) {
  await act(async () => {
    result.current.selectValue('mood')(3);
    result.current.selectValue('stress')(stress);
    result.current.selectValue('anxiety')(2);
  });
}

describe('useHomeScreen', () => {
  it('shows note sections only for stored values of 4 and above', async () => {
    const { result } = await setupHook();
    await fillForm(result, 4);
    expect(result.current.showStressNotes).toBe(true);
    expect(result.current.showAnxietyNotes).toBe(false);
    await act(async () => result.current.selectValue('stress')(3));
    expect(result.current.showStressNotes).toBe(false);
  });

  it('blocks a submit with unset rows: row errors, announcement, no insert', async () => {
    const { result } = await setupHook();
    await act(async () => {
      result.current.selectValue('stress')(2);
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(insertEntryWithPrompt).not.toHaveBeenCalled();
    expect(result.current.rowError('mood')).toBe(ROW_REQUIRED_MESSAGE);
    expect(result.current.rowError('anxiety')).toBe(ROW_REQUIRED_MESSAGE);
    expect(result.current.rowError('stress')).toBeUndefined();
    expect(announce).toHaveBeenCalledWith('Please select your mood and anxiety level before submitting.');
  });

  it('shows no row errors before the first submit attempt', async () => {
    const { result } = await setupHook();
    expect(result.current.rowError('mood')).toBeUndefined();
  });

  it('saves a valid form, resets it and shows the snackbar', async () => {
    const { result } = await setupHook();
    await fillForm(result, 5);
    await act(async () => result.current.changeNote('stress')(0, ' work '));
    await act(async () => {
      await result.current.submit();
    });
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(1);
    const [entry, prompt] = insertEntryWithPrompt.mock.calls[0];
    expect(entry).toMatchObject({ mood: 3, stress: 5, anxiety: 2, stress_note_1: 'work' });
    expect(prompt).toContain('My main stressors right now are work.');
    expect(result.current.values).toEqual({ mood: null, stress: null, anxiety: null });
    expect(result.current.notes.stress).toEqual(['', '', '']);
    expect(result.current.snackbarVisible).toBe(true);
    await act(async () => result.current.dismissSnackbar());
    expect(result.current.snackbarVisible).toBe(false);
  });

  it.each(['ios', 'android'] as const)('shows the error message and announces it on %s when saving fails', async (os) => {
    Platform.OS = os;
    insertEntryWithPrompt.mockRejectedValue(new Error('disk full'));
    const { result } = await setupHook();
    await fillForm(result);
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.saveError).toBe(SAVE_ERROR_MESSAGE);
    expect(announce).toHaveBeenCalledWith(SAVE_ERROR_MESSAGE);
    expect(result.current.snackbarVisible).toBe(false);
    // The form is kept so the user can retry.
    expect(result.current.values.mood).toBe(3);
  });

  it('runs the insert once when submit is called twice without awaiting', async () => {
    let resolveInsert: (v: { entryId: number; promptId: number }) => void = () => undefined;
    const pending = new Promise<{ entryId: number; promptId: number }>((resolve) => {
      resolveInsert = resolve;
    });
    insertEntryWithPrompt.mockReturnValue(pending);
    const { result } = await setupHook();
    await fillForm(result);
    await act(async () => {
      const first = result.current.submit();
      const second = result.current.submit();
      resolveInsert({ entryId: 1, promptId: 1 });
      await Promise.all([first, second]);
    });
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(1);
  });

  it('clears the in-flight guard after a successful save', async () => {
    const { result } = await setupHook();
    await fillForm(result);
    await act(async () => {
      await result.current.submit();
    });
    await fillForm(result);
    await act(async () => {
      await result.current.submit();
    });
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(2);
  });

  it('clears the in-flight guard after a rejected save so a retry works', async () => {
    insertEntryWithPrompt.mockRejectedValueOnce(new Error('disk full'));
    const { result } = await setupHook();
    await fillForm(result);
    await act(async () => {
      await result.current.submit();
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(2);
    expect(result.current.snackbarVisible).toBe(true);
  });

  it('announces "Saved!" on iOS', async () => {
    Platform.OS = 'ios';
    const { result } = await setupHook();
    await fillForm(result);
    await act(async () => {
      await result.current.submit();
    });
    expect(announceWithOptions).toHaveBeenCalledWith(SAVED_MESSAGE, { queue: true });
    expect(announce).not.toHaveBeenCalledWith(SAVED_MESSAGE);
    expect(result.current.snackbarVisible).toBe(true);
  });

  it('does not announce on Android (the Snackbar live region does) but still shows the Snackbar', async () => {
    Platform.OS = 'android';
    const { result } = await setupHook();
    await fillForm(result);
    await act(async () => {
      await result.current.submit();
    });
    expect(announce).not.toHaveBeenCalled();
    expect(announceWithOptions).not.toHaveBeenCalled();
    expect(result.current.snackbarVisible).toBe(true);
  });
});

describe('useHomeScreen resubmit guard', () => {
  let now: number;
  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });
  afterEach(() => jest.spyOn(Date, 'now').mockRestore());

  const submit = (result: Hook) =>
    act(async () => {
      await result.current.submit();
    });

  async function savedForm() {
    const hook = await setupHook();
    await fillForm(hook.result);
    await submit(hook.result);
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(1);
    announce.mockClear();
    return hook;
  }

  it('ignores a submit on the untouched form right after a save: no errors, no announcement, no insert', async () => {
    const { result } = await savedForm();
    now += RESUBMIT_GUARD_MS - 1;
    await submit(result);
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(1);
    expect(result.current.rowError('mood')).toBeUndefined();
    expect(announce).not.toHaveBeenCalled();
    // The ignored attempt does not touch the "Saved!" snackbar.
    expect(result.current.snackbarVisible).toBe(true);
  });

  it('treats a submit after the guard window as a real attempt (blocked with errors)', async () => {
    const { result } = await savedForm();
    now += RESUBMIT_GUARD_MS;
    await submit(result);
    expect(result.current.rowError('mood')).toBe(ROW_REQUIRED_MESSAGE);
    expect(announce).toHaveBeenCalledWith('Please select your mood, stress level, and anxiety level before submitting.');
  });

  it('allows saving again inside the window once a tile was picked', async () => {
    const { result } = await savedForm();
    now += 10;
    await fillForm(result);
    await submit(result);
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(2);
  });

  it('lets a note edit clear the guard', async () => {
    const { result } = await savedForm();
    now += 10;
    await act(async () => result.current.changeNote('stress')(0, 'x'));
    await submit(result);
    expect(result.current.rowError('mood')).toBe(ROW_REQUIRED_MESSAGE);
  });

  it('clears showMissing with the reset after a successful save', async () => {
    const { result } = await setupHook();
    await submit(result);
    expect(result.current.rowError('mood')).toBe(ROW_REQUIRED_MESSAGE);
    await fillForm(result);
    await submit(result);
    expect(result.current.values.mood).toBeNull();
    expect(result.current.rowError('mood')).toBeUndefined();
  });
});

describe('useHomeScreen snackbar', () => {
  const submit = (result: Hook) =>
    act(async () => {
      await result.current.submit();
    });

  it('hides "Saved!" when the next attempt is blocked by missing rows', async () => {
    const { result } = await setupHook();
    await fillForm(result);
    await submit(result);
    expect(result.current.snackbarVisible).toBe(true);
    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + RESUBMIT_GUARD_MS + 1);
    await submit(result);
    spy.mockRestore();
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(1);
    expect(result.current.rowError('mood')).toBe(ROW_REQUIRED_MESSAGE);
    expect(result.current.snackbarVisible).toBe(false);
  });

  it('hides "Saved!" when the next attempt fails to save', async () => {
    const { result } = await setupHook();
    await fillForm(result);
    await submit(result);
    expect(result.current.snackbarVisible).toBe(true);
    insertEntryWithPrompt.mockRejectedValueOnce(new Error('disk full'));
    await fillForm(result);
    await submit(result);
    expect(result.current.saveError).toBe(SAVE_ERROR_MESSAGE);
    expect(result.current.snackbarVisible).toBe(false);
  });
});

describe('useHomeScreen scroll to first missing row', () => {
  type Layout = { y: number; height: number };
  const layoutEvent = ({ y, height }: Layout) =>
    ({ nativeEvent: { layout: { x: 0, y, width: 300, height } } }) as never;

  async function setupScroll(layouts: Partial<Record<'mood' | 'stress' | 'anxiety', Layout>>, offset = 0) {
    const hook = await setupHook();
    const scrollTo = jest.fn();
    (hook.result.current.scrollRef as { current: unknown }).current = { scrollTo };
    await act(async () => {
      hook.result.current.onScrollLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 300 } } } as never);
      hook.result.current.onScroll({ nativeEvent: { contentOffset: { x: 0, y: offset } } } as never);
      for (const [metric, layout] of Object.entries(layouts)) {
        hook.result.current.rowLayout(metric as 'mood')(layoutEvent(layout));
      }
    });
    return { ...hook, scrollTo };
  }

  const submit = (result: Hook) =>
    act(async () => {
      await result.current.submit();
    });

  const relayout = (result: Hook, metric: 'mood' | 'stress' | 'anxiety', layout: Layout) =>
    act(async () => result.current.rowLayout(metric)(layoutEvent(layout)));

  it('scrolls to the topmost missing row once its taller layout (with the error) arrives', async () => {
    const { result, scrollTo } = await setupScroll(
      { mood: { y: 50, height: 100 }, stress: { y: 200, height: 100 }, anxiety: { y: 400, height: 100 } },
      500,
    );
    await act(async () => result.current.selectValue('mood')(3)); // mood no longer missing
    await submit(result);
    // The error is not showing yet at submit time, so nothing scrolls until the row re-lays out.
    expect(scrollTo).not.toHaveBeenCalled();
    await relayout(result, 'stress', { y: 200, height: 140 });
    // First missing is stress (top 200), above the viewport at offset 500: scroll to 200 - 16.
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 184, animated: true });
  });

  it('scrolls only once per blocked submit: a later layout of the same row does not scroll again', async () => {
    const { result, scrollTo } = await setupScroll({ stress: { y: 200, height: 100 } }, 500);
    await act(async () => result.current.selectValue('mood')(3));
    await submit(result);
    await relayout(result, 'stress', { y: 200, height: 140 });
    await relayout(result, 'stress', { y: 200, height: 150 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('scrolls immediately on a second submit because the row error is already showing', async () => {
    const { result, scrollTo } = await setupScroll({ mood: { y: 50, height: 100 } }, 500);
    await submit(result);
    await relayout(result, 'mood', { y: 50, height: 140 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockClear();
    await submit(result);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 34, animated: true });
  });

  it('does not scroll on a layout when no error scroll is pending', async () => {
    const { result, scrollTo } = await setupScroll({ mood: { y: 50, height: 100 } }, 500);
    expect(scrollTo).not.toHaveBeenCalled();
    await relayout(result, 'mood', { y: 50, height: 120 });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll for the layout of a row other than the pending one', async () => {
    const { result, scrollTo } = await setupScroll({ mood: { y: 50, height: 100 }, anxiety: { y: 60, height: 100 } }, 500);
    await submit(result);
    await relayout(result, 'anxiety', { y: 60, height: 140 });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll when the first missing row is already visible', async () => {
    const { result, scrollTo } = await setupScroll({ mood: { y: 50, height: 100 }, anxiety: { y: 900, height: 100 } });
    await submit(result);
    await relayout(result, 'mood', { y: 50, height: 140 });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(result.current.rowError('anxiety')).toBe(ROW_REQUIRED_MESSAGE);
  });

  it('does not scroll on a second submit when the first missing row is visible', async () => {
    const { result, scrollTo } = await setupScroll({ mood: { y: 50, height: 100 } });
    await submit(result);
    await submit(result);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls once the row is laid out when it had no layout at submit time', async () => {
    const { result, scrollTo } = await setupScroll({}, 500);
    await submit(result);
    expect(scrollTo).not.toHaveBeenCalled();
    await relayout(result, 'mood', { y: 50, height: 140 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 34, animated: true });
  });

  it('drops the pending error scroll when the user selects that metric before its layout', async () => {
    const { result, scrollTo } = await setupScroll({}, 500);
    await submit(result); // mood is the first missing row; its error scroll is pending
    await act(async () => result.current.selectValue('mood')(3));
    await relayout(result, 'mood', { y: 50, height: 140 });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('keeps the pending error scroll when a different metric is selected', async () => {
    const { result, scrollTo } = await setupScroll({}, 500);
    await submit(result);
    await act(async () => result.current.selectValue('anxiety')(2));
    await relayout(result, 'mood', { y: 50, height: 140 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does not scroll on a row layout after a successful save', async () => {
    const { result, scrollTo } = await setupScroll({}, 500);
    await submit(result); // pending error scroll for mood
    await fillForm(result);
    await submit(result);
    expect(insertEntryWithPrompt).toHaveBeenCalledTimes(1);
    await relayout(result, 'mood', { y: 50, height: 140 });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('still announces the missing rows when scrolling', async () => {
    const { result } = await setupScroll({ mood: { y: 50, height: 100 } }, 500);
    await submit(result);
    expect(announce).toHaveBeenCalledWith(
      'Please select your mood, stress level, and anxiety level before submitting.',
    );
  });
});
