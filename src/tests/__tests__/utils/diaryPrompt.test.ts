import { buildDiaryPrompt, formatList } from '@/utils/diaryPrompt';

type Input = Parameters<typeof buildDiaryPrompt>[0];

function input(overrides: Partial<Input> = {}): Input {
  return {
    mood: 3,
    stress: 2,
    anxiety: 2,
    stress_note_1: null,
    stress_note_2: null,
    stress_note_3: null,
    anxiety_note_1: null,
    anxiety_note_2: null,
    anxiety_note_3: null,
    ...overrides,
  };
}

describe('formatList', () => {
  it('returns an empty string for no items', () => {
    expect(formatList([])).toBe('');
  });
  it('returns the single item', () => {
    expect(formatList(['a'])).toBe('a');
  });
  it('joins two items with "and"', () => {
    expect(formatList(['a', 'b'])).toBe('a and b');
  });
  it('uses the Oxford comma for three items', () => {
    expect(formatList(['a', 'b', 'c'])).toBe('a, b, and c');
  });
  it('drops blank items and trims the rest', () => {
    expect(formatList(['a', '  ', ' b '])).toBe('a and b');
    expect(formatList(['', '  '])).toBe('');
  });
});

describe('buildDiaryPrompt', () => {
  it('builds the exact SPEC 3.4 text without notes', () => {
    expect(buildDiaryPrompt(input({ mood: 5, stress: 2, anxiety: 1 }))).toBe(
      'Right now I feel Happy. My stress level is Chill. My anxiety level is Calm. ' +
        'I would like to talk about my feelings and get insight.',
    );
  });

  it('adds the stressor sentence at stress 4 with notes', () => {
    expect(
      buildDiaryPrompt(input({ stress: 4, stress_note_1: 'work', stress_note_2: 'money', stress_note_3: 'sleep' })),
    ).toBe(
      'Right now I feel Neutral. My stress level is Stressed. ' +
        'My main stressors right now are work, money, and sleep. My anxiety level is Relaxed. ' +
        'I would like to talk about my feelings and get insight.',
    );
  });

  it('adds the trigger sentence at anxiety 4 with notes', () => {
    expect(buildDiaryPrompt(input({ anxiety: 4, anxiety_note_1: 'crowds', anxiety_note_3: 'exams' }))).toBe(
      'Right now I feel Neutral. My stress level is Chill. My anxiety level is Anxious. ' +
        'My anxiety triggers are crowds and exams. ' +
        'I would like to talk about my feelings and get insight.',
    );
  });

  it('omits the stressor sentence at stress 4 when there are no notes', () => {
    expect(buildDiaryPrompt(input({ stress: 4 }))).not.toContain('stressors');
  });

  it('omits the trigger sentence at anxiety 4 when there are no notes', () => {
    expect(buildDiaryPrompt(input({ anxiety: 4 }))).not.toContain('triggers');
  });

  it('omits note sentences below value 4 even if notes are present', () => {
    const text = buildDiaryPrompt(
      input({ stress: 3, anxiety: 3, stress_note_1: 'work', anxiety_note_1: 'crowds' }),
    );
    expect(text).not.toContain('stressors');
    expect(text).not.toContain('triggers');
  });

  it('labels stress 5 as Crushed', () => {
    expect(buildDiaryPrompt(input({ stress: 5 }))).toContain('My stress level is Crushed.');
  });

  it('uses labels only, never digits', () => {
    for (const v of [1, 2, 3, 4, 5] as const) {
      expect(buildDiaryPrompt(input({ mood: v, stress: v, anxiety: v }))).not.toMatch(/\d/);
    }
  });

  it('falls back to empty labels for an unknown stored value', () => {
    expect(buildDiaryPrompt(input({ mood: 9 as never }))).toContain('Right now I feel .');
  });
});
