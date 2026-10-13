import { useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, type LayoutChangeEvent } from 'react-native';

import { requiresNotes, SCALES, type Metric, type ScaleValue } from '@/constants/scales';
import { useCheckInMutation } from '@/hooks/useCheckInMutation';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';
import { useAppSelector } from '@/state/hooks';
import { selectAiChatPromptShown, selectAiIntegrationEnabled, selectHasApiKey } from '@/state/settingsSlice';
import { buildNewEntry, EMPTY_NOTES, type CheckInForm, type NoteMetric, type NoteTriple } from '@/utils/checkIn';
import { buildDiaryPrompt, formatList } from '@/utils/diaryPrompt';
import { decidePostCheckIn } from '@/utils/postCheckIn';

export const SAVED_MESSAGE = 'Saved! Your mood has been recorded.';
export const SAVE_ERROR_MESSAGE = "Couldn't save your check-in. Try again.";
export const ROW_REQUIRED_MESSAGE = 'Please choose one.';
/**
 * After a successful save, a Submit on the untouched (just reset) form within this window is the
 * tail of a double tap, not a new attempt, so it is ignored instead of flagging every row.
 */
export const RESUBMIT_GUARD_MS = 1000;

const MISSING_NAMES: Readonly<Record<Metric, string>> = {
  mood: 'mood',
  stress: 'stress level',
  anxiety: 'anxiety level',
};

/** Screen-reader announcement for a blocked submit, e.g. "Please select your mood and anxiety level before submitting." */
export function missingAnnouncement(missing: readonly Metric[]): string {
  return `Please select your ${formatList(missing.map((m) => MISSING_NAMES[m]))} before submitting.`;
}

export interface HomeFormState extends CheckInForm {
  /** Set after a submit with unset rows; row errors show only for rows still unset. */
  showMissing: boolean;
}

export type HomeFormAction =
  | { type: 'select'; metric: Metric; value: ScaleValue }
  | { type: 'setNote'; metric: NoteMetric; index: number; text: string }
  | { type: 'showMissing' }
  | { type: 'reset' };

export const initialHomeFormState: HomeFormState = {
  values: { mood: null, stress: null, anxiety: null },
  notes: { stress: EMPTY_NOTES, anxiety: EMPTY_NOTES },
  showMissing: false,
};

export function homeFormReducer(state: HomeFormState, action: HomeFormAction): HomeFormState {
  switch (action.type) {
    case 'select': {
      const values = { ...state.values, [action.metric]: action.value };
      if (action.metric === 'mood' || requiresNotes(SCALES[action.metric], action.value)) {
        return { ...state, values };
      }
      // Notes are hidden below the threshold, so they are cleared (§1.3, §3.2).
      return { ...state, values, notes: { ...state.notes, [action.metric]: EMPTY_NOTES } };
    }
    case 'setNote': {
      const current = state.notes[action.metric];
      if (action.index < 0 || action.index >= current.length) return state;
      const pick = (i: number) => (i === action.index ? action.text : current[i]);
      const next: NoteTriple = [pick(0), pick(1), pick(2)];
      return { ...state, notes: { ...state.notes, [action.metric]: next } };
    }
    case 'showMissing':
      return { ...state, showMissing: true };
    case 'reset':
      return initialHomeFormState;
  }
}

/** Home check-in: local form state, the save mutation, the post-check-in outcome and scrolling. */
export function useHomeScreen() {
  const [form, dispatch] = useReducer(homeFormReducer, initialHomeFormState);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const mutation = useCheckInMutation();
  const scroll = useScrollIntoView();
  // `isPending` is read from the render closure, so two quick taps could both pass it before
  // a re-render; this ref is set synchronously in the handler and blocks the second tap.
  const inFlight = useRef(false);
  // When the last save succeeded, while the form is still untouched since its reset; cleared by
  // any edit. A local save takes milliseconds, so the second tap of a double tap usually lands
  // after the reset has rendered, where `inFlight` no longer catches it.
  const savedAt = useRef<number | null>(null);
  // Content-relative layout of each row, for scrolling to the first row with an error.
  const rowLayouts = useRef<Partial<Record<Metric, { y: number; height: number }>>>({});
  // Row to scroll to on its next layout: a newly shown "Please choose one." makes the row taller
  // than the height measured before the submit, so scrolling then could cut the message off.
  const pendingErrorScroll = useRef<Metric | null>(null);
  const hasApiKey = useAppSelector(selectHasApiKey);
  const aiChatPromptShown = useAppSelector(selectAiChatPromptShown);
  const aiIntegrationEnabled = useAppSelector(selectAiIntegrationEnabled);

  const selectValue = (metric: Metric) => (value: ScaleValue) => {
    savedAt.current = null;
    // Picking the row clears its error, so a scroll still waiting for that error's layout is
    // dropped; otherwise a later unrelated re-layout of the row would scroll unexpectedly.
    if (pendingErrorScroll.current === metric) pendingErrorScroll.current = null;
    dispatch({ type: 'select', metric, value });
  };
  const changeNote = (metric: NoteMetric) => (index: number, text: string) => {
    savedAt.current = null;
    dispatch({ type: 'setNote', metric, index, text });
  };

  const rowError = (metric: Metric) =>
    form.showMissing && form.values[metric] === null ? ROW_REQUIRED_MESSAGE : undefined;

  const rowLayout = (metric: Metric) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    rowLayouts.current[metric] = { y, height };
    if (pendingErrorScroll.current === metric) {
      pendingErrorScroll.current = null;
      scroll.scrollIntoView(y, height);
    }
  };

  const isDoubleTapAfterSave = () =>
    savedAt.current !== null && Date.now() - savedAt.current < RESUBMIT_GUARD_MS;

  const submit = async () => {
    if (inFlight.current || isDoubleTapAfterSave()) return;
    savedAt.current = null;
    // A new attempt replaces the previous outcome: never leave "Saved!" up next to new errors.
    setSnackbarVisible(false);
    const result = buildNewEntry(form, new Date());
    if (!result.ok) {
      dispatch({ type: 'showMissing' });
      // `missing` is in visual (top-to-bottom) order, so the first one is the topmost error.
      const firstMetric = result.missing[0];
      const first = rowLayouts.current[firstMetric];
      if (rowError(firstMetric) !== undefined) {
        // Its error is already showing, so the measured height includes it: scroll now.
        if (first) scroll.scrollIntoView(first.y, first.height);
      } else {
        // The error appears on this render and re-lays out the row; scroll once it has.
        pendingErrorScroll.current = firstMetric;
      }
      AccessibilityInfo.announceForAccessibility(missingAnnouncement(result.missing));
      return;
    }
    inFlight.current = true;
    try {
      await mutation.mutateAsync({ entry: result.entry, prompt: buildDiaryPrompt(result.entry) });
    } catch {
      // The error itself is never logged or shown: it could echo user notes.
      AccessibilityInfo.announceForAccessibility(SAVE_ERROR_MESSAGE);
      return;
    } finally {
      inFlight.current = false;
    }
    // The reset also clears the row errors (`showMissing`), so no error scroll is pending.
    pendingErrorScroll.current = null;
    dispatch({ type: 'reset' });
    savedAt.current = Date.now();
    switch (decidePostCheckIn({ hasApiKey, aiChatPromptShown, aiIntegrationEnabled })) {
      // Slice 2 replaces these two with the AI dialogs (§3.10). Until then, and while hasApiKey
      // is always false (D19), every outcome confirms with "Saved!".
      case 'firstTimeDialog':
      case 'talkDialog':
      case 'saved':
        setSnackbarVisible(true);
        // Paper's Snackbar live region is Android-only; announcing there too would double up.
        // Queued so VoiceOver finishes it instead of cutting it off when it re-reads Submit.
        if (Platform.OS === 'ios') {
          AccessibilityInfo.announceForAccessibilityWithOptions(SAVED_MESSAGE, { queue: true });
        }
        break;
    }
  };

  return {
    values: form.values,
    notes: form.notes,
    showStressNotes: requiresNotes(SCALES.stress, form.values.stress),
    showAnxietyNotes: requiresNotes(SCALES.anxiety, form.values.anxiety),
    rowError,
    rowLayout,
    selectValue,
    changeNote,
    submit,
    isSaving: mutation.isPending,
    saveError: mutation.isError ? SAVE_ERROR_MESSAGE : undefined,
    snackbarVisible,
    dismissSnackbar: () => setSnackbarVisible(false),
    scrollRef: scroll.scrollRef,
    scrollContentRef: scroll.contentRef,
    onScroll: scroll.onScroll,
    onScrollLayout: scroll.onLayout,
    revealField: scroll.revealField,
    forgetField: scroll.forgetField,
  };
}
