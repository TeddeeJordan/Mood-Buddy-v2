import { requiresNotes, SCALES, type Metric, type ScaleValue } from '@/constants/scales';
import type { NewMoodEntry } from '@/types/db';
import { currentTzOffsetMin } from '@/utils/dates';

/** Metrics that have note fields. */
export type NoteMetric = 'stress' | 'anxiety';

/** One string per note field: three per section (SPEC §1.3). */
export type NoteTriple = readonly [string, string, string];

/** Check-in form state: nothing selected means `null` (no tile is pre-selected). */
export interface CheckInForm {
  values: Readonly<Record<Metric, ScaleValue | null>>;
  notes: Readonly<Record<NoteMetric, NoteTriple>>;
}

export const EMPTY_NOTES: NoteTriple = ['', '', ''];

export const METRIC_ORDER: readonly Metric[] = ['mood', 'stress', 'anxiety'];

export type BuildEntryResult = { ok: true; entry: NewMoodEntry } | { ok: false; missing: Metric[] };

/** Trimmed note, or null when blank or when the section isn't visible (§3.3). */
function noteValue(visible: boolean, raw: string): string | null {
  if (!visible) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

type NoteValues = readonly [string | null, string | null, string | null];

function sectionNotes(metric: NoteMetric, value: ScaleValue, raw: NoteTriple): NoteValues {
  const visible = requiresNotes(SCALES[metric], value);
  return [noteValue(visible, raw[0]), noteValue(visible, raw[1]), noteValue(visible, raw[2])];
}

/**
 * Turns the form into a row to insert. `timestamp` and `tz_offset_min` come from the same `now`
 * (D20). Notes are kept only when their section is visible (stored value ≥ 4).
 */
export function buildNewEntry(form: CheckInForm, now: Date): BuildEntryResult {
  const { mood, stress, anxiety } = form.values;
  if (mood === null || stress === null || anxiety === null) {
    return { ok: false, missing: METRIC_ORDER.filter((m) => form.values[m] === null) };
  }
  const [s1, s2, s3] = sectionNotes('stress', stress, form.notes.stress);
  const [a1, a2, a3] = sectionNotes('anxiety', anxiety, form.notes.anxiety);
  return {
    ok: true,
    entry: {
      timestamp: now.toISOString(),
      tz_offset_min: currentTzOffsetMin(now),
      mood,
      stress,
      stress_note_1: s1,
      stress_note_2: s2,
      stress_note_3: s3,
      anxiety,
      anxiety_note_1: a1,
      anxiety_note_2: a2,
      anxiety_note_3: a3,
    },
  };
}
