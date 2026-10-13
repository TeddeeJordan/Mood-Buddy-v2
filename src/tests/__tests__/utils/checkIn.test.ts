import type { Metric, ScaleValue } from '@/constants/scales';
import { buildNewEntry, EMPTY_NOTES, METRIC_ORDER, type CheckInForm, type NoteTriple } from '@/utils/checkIn';

const NOW = new Date('2026-10-07T15:30:00.000Z');

function form(
  values: Partial<Record<Metric, ScaleValue | null>> = {},
  notes: Partial<Record<'stress' | 'anxiety', NoteTriple>> = {},
): CheckInForm {
  return {
    values: { mood: 3, stress: 2, anxiety: 2, ...values },
    notes: { stress: EMPTY_NOTES, anxiety: EMPTY_NOTES, ...notes },
  };
}

function entryOf(f: CheckInForm, now = NOW) {
  const result = buildNewEntry(f, now);
  if (!result.ok) throw new Error('expected a valid entry');
  return result.entry;
}

describe('buildNewEntry', () => {
  it('reports every missing metric in METRIC_ORDER', () => {
    const result = buildNewEntry(form({ mood: null, stress: null, anxiety: null }), NOW);
    expect(result).toEqual({ ok: false, missing: ['mood', 'stress', 'anxiety'] });
    expect(METRIC_ORDER).toEqual(['mood', 'stress', 'anxiety']);
  });

  it('reports only the unset metrics, still in order', () => {
    expect(buildNewEntry(form({ stress: null }), NOW)).toEqual({ ok: false, missing: ['stress'] });
    expect(buildNewEntry(form({ mood: null, anxiety: null }), NOW)).toEqual({
      ok: false,
      missing: ['mood', 'anxiety'],
    });
  });

  it('trims notes and turns blank notes into null', () => {
    const entry = entryOf(form({ stress: 4 }, { stress: ['  tired  ', '   ', ''] }));
    expect(entry.stress_note_1).toBe('tired');
    expect(entry.stress_note_2).toBeNull();
    expect(entry.stress_note_3).toBeNull();
  });

  it('nulls notes whose section is hidden, even if the form still holds text', () => {
    const entry = entryOf(
      form({ stress: 3, anxiety: 1 }, { stress: ['a', 'b', 'c'], anxiety: ['x', 'y', 'z'] }),
    );
    expect([entry.stress_note_1, entry.stress_note_2, entry.stress_note_3]).toEqual([null, null, null]);
    expect([entry.anxiety_note_1, entry.anxiety_note_2, entry.anxiety_note_3]).toEqual([null, null, null]);
  });

  it('keeps stress notes at value 4 but not at 3 (stored-value boundary)', () => {
    const notes: NoteTriple = ['a', 'b', 'c'];
    expect(entryOf(form({ stress: 4 }, { stress: notes })).stress_note_2).toBe('b');
    expect(entryOf(form({ stress: 3 }, { stress: notes })).stress_note_2).toBeNull();
  });

  it('keeps anxiety notes at value 4 but not at 3, independently of stress', () => {
    const notes: NoteTriple = ['a', 'b', 'c'];
    const high = entryOf(form({ stress: 1, anxiety: 4 }, { anxiety: notes }));
    const low = entryOf(form({ stress: 1, anxiety: 3 }, { anxiety: notes }));
    expect(high.anxiety_note_3).toBe('c');
    expect(low.anxiety_note_3).toBeNull();
  });

  it('keeps notes at value 5', () => {
    expect(entryOf(form({ stress: 5 }, { stress: ['a', '', ''] })).stress_note_1).toBe('a');
  });

  it('derives timestamp and tz_offset_min from the same now', () => {
    const entry = entryOf(form(), NOW);
    expect(entry.timestamp).toBe(NOW.toISOString());
    expect(entry.tz_offset_min).toBe(-NOW.getTimezoneOffset() || 0);
  });

  it('copies the three values', () => {
    const entry = entryOf(form({ mood: 5, stress: 1, anxiety: 4 }));
    expect([entry.mood, entry.stress, entry.anxiety]).toEqual([5, 1, 4]);
  });

  it('stores an offset of 0 as 0, never -0', () => {
    const spy = jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
    const entry = entryOf(form());
    spy.mockRestore();
    expect(Object.is(entry.tz_offset_min, 0)).toBe(true);
  });

  it('stores the offset east of UTC for a zone ahead of UTC', () => {
    const spy = jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-840);
    const entry = entryOf(form());
    spy.mockRestore();
    expect(entry.tz_offset_min).toBe(840);
  });
});
