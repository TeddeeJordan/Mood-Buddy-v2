import {
  ANXIETY_SCALE,
  displayOptions,
  emojiForValue,
  FALLBACK_EMOJI,
  isScaleValue,
  MOOD_SCALE,
  optionForValue,
  requiresNotes,
  SCALES,
  STRESS_SCALE,
  tileAccessibilityLabel,
} from '@/constants/scales';

const ALL = [MOOD_SCALE, STRESS_SCALE, ANXIETY_SCALE];

describe('scale constants (D39 value meaning)', () => {
  it.each(ALL)('$metric options are stored in value order 1 → 5', (scale) => {
    expect(scale.options.map((o) => o.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it('maps values to labels per SPEC §3.1', () => {
    expect(MOOD_SCALE.options.map((o) => o.label)).toEqual(['Upset', 'Unhappy', 'Neutral', 'Content', 'Happy']);
    expect(STRESS_SCALE.options.map((o) => o.label)).toEqual(['Stressfree', 'Chill', 'Okay', 'Stressed', 'Overwhelmed']);
    expect(ANXIETY_SCALE.options.map((o) => o.label)).toEqual(['Calm', 'Relaxed', 'Neutral', 'Anxious', 'Panicked']);
    expect(STRESS_SCALE.options[4].emoji).toBe('😱');
    expect(ANXIETY_SCALE.options[0].emoji).toBe('😌');
  });

  it('exposes every scale by metric', () => {
    expect(SCALES.mood).toBe(MOOD_SCALE);
    expect(SCALES.stress).toBe(STRESS_SCALE);
    expect(SCALES.anxiety).toBe(ANXIETY_SCALE);
  });
});

describe('display order (D48)', () => {
  it('renders mood 1 → 5', () => {
    expect(displayOptions(MOOD_SCALE).map((o) => o.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it.each([STRESS_SCALE, ANXIETY_SCALE])('renders $metric 5 → 1 without mutating the constants', (scale) => {
    expect(displayOptions(scale).map((o) => o.value)).toEqual([5, 4, 3, 2, 1]);
    expect(scale.options.map((o) => o.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it('puts the worst state on the left in every row', () => {
    expect(displayOptions(MOOD_SCALE)[0].label).toBe('Upset');
    expect(displayOptions(STRESS_SCALE)[0].label).toBe('Overwhelmed');
    expect(displayOptions(ANXIETY_SCALE)[0].label).toBe('Panicked');
    expect(MOOD_SCALE.endLabels).toEqual(['Worst', 'Best']);
    expect(STRESS_SCALE.endLabels).toEqual(['Most stress', 'Least stress']);
    expect(ANXIETY_SCALE.endLabels).toEqual(['Most anxiety', 'Least anxiety']);
  });
});

describe('requiresNotes', () => {
  it.each([STRESS_SCALE, ANXIETY_SCALE])('$metric needs notes only at stored value ≥ 4', (scale) => {
    expect([1, 2, 3, 4, 5].map((v) => requiresNotes(scale, v))).toEqual([false, false, false, true, true]);
    expect(requiresNotes(scale, null)).toBe(false);
    expect(requiresNotes(scale, undefined)).toBe(false);
  });

  it('never applies to mood', () => {
    expect(requiresNotes(MOOD_SCALE, 5)).toBe(false);
  });

  it('the two leftmost stress/anxiety tiles are the note tiles', () => {
    for (const scale of [STRESS_SCALE, ANXIETY_SCALE]) {
      const shown = displayOptions(scale).map((o) => requiresNotes(scale, o.value));
      expect(shown).toEqual([true, true, false, false, false]);
    }
  });
});

describe('emojiForValue / optionForValue / isScaleValue', () => {
  it('looks up by stored value', () => {
    expect(emojiForValue(MOOD_SCALE, 5)).toBe('😄');
    expect(emojiForValue(STRESS_SCALE, 5)).toBe('😱');
    expect(optionForValue(ANXIETY_SCALE, 4)?.label).toBe('Anxious');
    expect(optionForValue(ANXIETY_SCALE, 9)).toBeUndefined();
  });

  it.each([0, 6, 2.5, NaN, null, undefined])('falls back to 😐 for %p', (v) => {
    expect(emojiForValue(MOOD_SCALE, v)).toBe(FALLBACK_EMOJI);
  });

  it('validates scale values', () => {
    expect(isScaleValue(3)).toBe(true);
    expect(isScaleValue(0)).toBe(false);
    expect(isScaleValue(6)).toBe(false);
    expect(isScaleValue(2.5)).toBe(false);
    expect(isScaleValue('3')).toBe(false);
  });
});

describe('accessibility labels (word-only ladder)', () => {
  it.each(ALL)('$metric labels contain no digits', (scale) => {
    for (const o of scale.options) {
      expect(tileAccessibilityLabel(o)).not.toMatch(/\d/);
    }
  });

  it('follows the per-metric ladders in value order', () => {
    expect(MOOD_SCALE.options.map((o) => o.direction)).toEqual([
      'worst mood', 'low mood', 'middle mood', 'good mood', 'best mood',
    ]);
    expect(STRESS_SCALE.options.map((o) => o.direction)).toEqual([
      'least stress', 'low stress', 'some stress', 'high stress', 'most stress',
    ]);
    expect(ANXIETY_SCALE.options.map((o) => o.direction)).toEqual([
      'least anxiety', 'low anxiety', 'some anxiety', 'high anxiety', 'most anxiety',
    ]);
  });

  it('matches the spec examples', () => {
    expect(tileAccessibilityLabel(STRESS_SCALE.options[4])).toBe('Overwhelmed, most stress');
    expect(tileAccessibilityLabel(STRESS_SCALE.options[2])).toBe('Okay, some stress');
    expect(tileAccessibilityLabel(MOOD_SCALE.options[4])).toBe('Happy, best mood');
  });
});
