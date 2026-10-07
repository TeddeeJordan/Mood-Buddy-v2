import { NOTE_THRESHOLD } from './limits';

export type Metric = 'mood' | 'stress' | 'anxiety';
export type ScaleValue = 1 | 2 | 3 | 4 | 5;
/** `ascending` renders values 1 → 5 left to right; `descending` renders 5 → 1 (D48). */
export type DisplayDirection = 'ascending' | 'descending';

export interface ScaleOption {
  value: ScaleValue;
  label: string;
  emoji: string;
  /** Word-only direction from the metric's ladder, e.g. "most stress". Never a number. */
  direction: string;
}

export interface Scale {
  metric: Metric;
  /** Row question, also the radiogroup's accessibility label. */
  question: string;
  /** Options in VALUE order (1 → 5). Never reorder this array; use displayOptions(). */
  options: readonly ScaleOption[];
  displayDirection: DisplayDirection;
  /** Visible end labels in display order: [left, right]. */
  endLabels: readonly [string, string];
  /** Whether the metric has note fields at all (stress and anxiety only). */
  hasNotes: boolean;
}

export const FALLBACK_EMOJI = '😐';

/** Mood: 1 = worst … 5 = best (D39). */
export const MOOD_SCALE: Scale = {
  metric: 'mood',
  question: 'How are you feeling today?',
  options: [
    { value: 1, label: 'Upset', emoji: '😭', direction: 'worst mood' },
    { value: 2, label: 'Unhappy', emoji: '😟', direction: 'low mood' },
    { value: 3, label: 'Neutral', emoji: '😐', direction: 'middle mood' },
    { value: 4, label: 'Content', emoji: '😊', direction: 'good mood' },
    { value: 5, label: 'Happy', emoji: '😄', direction: 'best mood' },
  ],
  displayDirection: 'ascending',
  endLabels: ['Worst', 'Best'],
  hasNotes: false,
};

/** Stress: 1 = least … 5 = most (D39), rendered 5 → 1 (D48). */
export const STRESS_SCALE: Scale = {
  metric: 'stress',
  question: 'How is your stress level?',
  options: [
    { value: 1, label: 'Stressfree', emoji: '🤩', direction: 'least stress' },
    { value: 2, label: 'Chill', emoji: '😌', direction: 'low stress' },
    { value: 3, label: 'Okay', emoji: '😐', direction: 'some stress' },
    { value: 4, label: 'Stressed', emoji: '😤', direction: 'high stress' },
    { value: 5, label: 'Overwhelmed', emoji: '😱', direction: 'most stress' },
  ],
  displayDirection: 'descending',
  endLabels: ['Most stress', 'Least stress'],
  hasNotes: true,
};

/** Anxiety: 1 = least … 5 = most (D39), rendered 5 → 1 (D48). */
export const ANXIETY_SCALE: Scale = {
  metric: 'anxiety',
  question: 'How is your anxiety level?',
  options: [
    { value: 1, label: 'Calm', emoji: '😌', direction: 'least anxiety' },
    { value: 2, label: 'Relaxed', emoji: '🙂', direction: 'low anxiety' },
    { value: 3, label: 'Neutral', emoji: '😐', direction: 'some anxiety' },
    { value: 4, label: 'Anxious', emoji: '😰', direction: 'high anxiety' },
    { value: 5, label: 'Panicked', emoji: '😨', direction: 'most anxiety' },
  ],
  displayDirection: 'descending',
  endLabels: ['Most anxiety', 'Least anxiety'],
  hasNotes: true,
};

export const SCALES: Readonly<Record<Metric, Scale>> = {
  mood: MOOD_SCALE,
  stress: STRESS_SCALE,
  anxiety: ANXIETY_SCALE,
};

/** Options in on-screen (and screen-reader) order. Rendering rule only; values are untouched. */
export function displayOptions(scale: Scale): readonly ScaleOption[] {
  return scale.displayDirection === 'ascending' ? scale.options : [...scale.options].reverse();
}

export function isScaleValue(value: unknown): value is ScaleValue {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Notes show for high stress/anxiety, evaluated on the STORED value, never on tile position. */
export function requiresNotes(scale: Scale, value: number | null | undefined): boolean {
  return scale.hasNotes && value != null && value >= NOTE_THRESHOLD;
}

/** Emoji for a (rounded) stored value; falls back to 😐 when the value isn't on the scale. */
export function emojiForValue(scale: Scale, value: number | null | undefined): string {
  return scale.options.find((o) => o.value === value)?.emoji ?? FALLBACK_EMOJI;
}

export function optionForValue(scale: Scale, value: number): ScaleOption | undefined {
  return scale.options.find((o) => o.value === value);
}

/** Tile accessibility label: "{Label}, {direction}", word-only (SPEC §3.2, corrected Rev 5). */
export function tileAccessibilityLabel(option: ScaleOption): string {
  return `${option.label}, ${option.direction}`;
}
