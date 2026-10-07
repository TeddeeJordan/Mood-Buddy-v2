import type { LocalDateKey } from '@/types/dates';
import {
  addDaysToKey,
  clampToToday,
  currentTzOffsetMin,
  isLocalDateKey,
  localDateKeyFromDate,
  localDateKeyFromUtc,
  purgeCutoffIso,
  startOfNextLocalDay,
  toLocalDateKey,
  upperBoundKey,
  utcSearchWindowForLocalRange,
} from '@/utils/dates';

const k = (s: string) => s as LocalDateKey;

describe('isLocalDateKey / toLocalDateKey', () => {
  it('accepts real dates only', () => {
    expect(isLocalDateKey('2026-02-28')).toBe(true);
    expect(isLocalDateKey('2028-02-29')).toBe(true);
    expect(isLocalDateKey('2026-02-29')).toBe(false);
    expect(isLocalDateKey('2026-13-01')).toBe(false);
    expect(isLocalDateKey('2026-1-01')).toBe(false);
    expect(isLocalDateKey('not a date')).toBe(false);
  });

  it('brands valid keys and throws on invalid ones', () => {
    expect(toLocalDateKey('2026-10-07')).toBe('2026-10-07');
    expect(() => toLocalDateKey('2026-02-30')).toThrow(RangeError);
  });
});

describe('localDateKeyFromUtc (write-time offset, D20)', () => {
  it.each([
    // [utc, offset, expected]
    ['2026-10-07T14:59:59.999Z', 540, '2026-10-07'], // Tokyo, just before midnight
    ['2026-10-07T15:00:00.000Z', 540, '2026-10-08'], // Tokyo midnight rollover
    ['2026-10-08T04:59:59.999Z', -300, '2026-10-07'], // New York (EST), before midnight
    ['2026-10-08T05:00:00.000Z', -300, '2026-10-08'], // New York rollover
    ['2026-10-07T18:29:59.999Z', 330, '2026-10-07'], // India
    ['2026-10-07T18:30:00.000Z', 330, '2026-10-08'],
    ['2026-10-07T18:14:59.999Z', 345, '2026-10-07'], // Nepal
    ['2026-10-07T18:15:00.000Z', 345, '2026-10-08'],
    ['2026-12-31T23:30:00.000Z', 60, '2027-01-01'], // year rollover
    ['2026-01-01T00:30:00.000Z', -60, '2025-12-31'],
    ['2026-10-07T12:00:00.000Z', 0, '2026-10-07'],
  ])('%s at %d min → %s', (utc, offset, expected) => {
    expect(localDateKeyFromUtc(utc, offset)).toBe(expected);
  });

  it('throws on an invalid timestamp', () => {
    expect(() => localDateKeyFromUtc('garbage', 0)).toThrow(RangeError);
    expect(() => localDateKeyFromUtc('2026-13-45T00:00:00.000Z', 0)).toThrow(RangeError);
  });

  it.each(['2026-10-07T15:30:00.000', '2026-10-07T15:30:00', '2026-10-07', '2026-10-07 15:30:00Z'])(
    'rejects %s (no Z / explicit offset, would be parsed as device-local)',
    (ts) => {
      expect(() => localDateKeyFromUtc(ts, 0)).toThrow(RangeError);
    },
  );

  it('accepts an explicit offset instead of Z', () => {
    expect(localDateKeyFromUtc('2026-10-08T00:30:00+09:00', 540)).toBe('2026-10-08');
    expect(localDateKeyFromUtc('2026-10-07T23:30:00-05:00', -300)).toBe('2026-10-07');
  });

  it.each([Number.NaN, 1.5, -721, 841, Number.POSITIVE_INFINITY])('rejects tzOffsetMin %p', (offset) => {
    expect(() => localDateKeyFromUtc('2026-10-07T12:00:00.000Z', offset)).toThrow(RangeError);
  });
});

describe('localDateKeyFromDate', () => {
  it('uses the device-local calendar date', () => {
    const d = new Date(2026, 9, 7, 23, 59, 0);
    expect(localDateKeyFromDate(d)).toBe('2026-10-07');
    expect(localDateKeyFromDate(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
  });

  it('defaults to now', () => {
    expect(isLocalDateKey(localDateKeyFromDate())).toBe(true);
  });
});

describe('addDaysToKey', () => {
  it.each([
    ['2026-03-07', 1, '2026-03-08'], // US DST start weekend
    ['2026-03-08', 1, '2026-03-09'],
    ['2026-03-29', 1, '2026-03-30'], // EU DST start
    ['2026-11-01', 1, '2026-11-02'], // US DST end
    ['2026-01-31', 1, '2026-02-01'], // month
    ['2026-02-28', 1, '2026-03-01'],
    ['2028-02-28', 1, '2028-02-29'], // leap year
    ['2026-12-31', 1, '2027-01-01'], // year
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-10-07', -90, '2026-07-09'],
    ['2026-10-07', 0, '2026-10-07'],
  ])('%s %+d → %s', (key, n, expected) => {
    expect(addDaysToKey(k(key), n)).toBe(expected);
  });

  it('rejects a malformed key', () => {
    expect(() => addDaysToKey(k('bad'), 1)).toThrow(RangeError);
  });
});

describe('clampToToday / upperBoundKey (D46)', () => {
  it('clamps entries dated after today to today', () => {
    expect(clampToToday(k('2026-10-08'), k('2026-10-07'))).toBe('2026-10-07');
    expect(clampToToday(k('2026-10-06'), k('2026-10-07'))).toBe('2026-10-06');
    expect(clampToToday(k('2026-10-07'), k('2026-10-07'))).toBe('2026-10-07');
  });

  it('extends the upper bound to the latest entry when it is ahead', () => {
    expect(upperBoundKey(k('2026-10-07'), k('2026-10-08'))).toBe('2026-10-08');
    expect(upperBoundKey(k('2026-10-07'), k('2026-10-01'))).toBe('2026-10-07');
    expect(upperBoundKey(k('2026-10-07'), null)).toBe('2026-10-07');
  });
});

describe('utcSearchWindowForLocalRange', () => {
  it('widens the local range by 14 h on both sides', () => {
    expect(utcSearchWindowForLocalRange(k('2026-10-07'), k('2026-10-07'))).toEqual({
      fromIso: '2026-10-06T10:00:00.000Z',
      toIsoExclusive: '2026-10-08T14:00:00.000Z',
    });
  });

  it('accepts a reversed range', () => {
    expect(utcSearchWindowForLocalRange(k('2026-10-09'), k('2026-10-07'))).toEqual(
      utcSearchWindowForLocalRange(k('2026-10-07'), k('2026-10-09')),
    );
  });

  it('contains every instant whose local date (any real offset) is in range', () => {
    const { fromIso, toIsoExclusive } = utcSearchWindowForLocalRange(k('2026-10-07'), k('2026-10-07'));
    const earliest = '2026-10-06T10:00:00.000Z'; // 00:00 on the 7th at +14:00
    const latest = '2026-10-08T11:59:59.999Z'; // 23:59:59.999 on the 7th at −12:00
    expect(localDateKeyFromUtc(earliest, 840)).toBe('2026-10-07');
    expect(localDateKeyFromUtc(latest, -720)).toBe('2026-10-07');
    expect(earliest >= fromIso).toBe(true);
    expect(latest < toIsoExclusive).toBe(true);
  });
});

describe('purgeCutoffIso', () => {
  it('is exactly 90 days before now by default', () => {
    expect(purgeCutoffIso(new Date('2026-10-07T12:00:00.000Z'))).toBe('2026-07-09T12:00:00.000Z');
  });

  it('accepts a custom retention and defaults now', () => {
    expect(purgeCutoffIso(new Date('2026-10-07T00:00:00.000Z'), 1)).toBe('2026-10-06T00:00:00.000Z');
    expect(Date.parse(purgeCutoffIso())).toBeLessThan(Date.now());
  });
});

describe('startOfNextLocalDay', () => {
  it('returns the next local midnight', () => {
    const next = startOfNextLocalDay(new Date(2026, 9, 7, 15, 30));
    expect([next.getFullYear(), next.getMonth(), next.getDate(), next.getHours(), next.getMinutes()]).toEqual([
      2026, 9, 8, 0, 0,
    ]);
  });

  it('rolls over months and years', () => {
    const next = startOfNextLocalDay(new Date(2026, 11, 31, 23, 59));
    expect(localDateKeyFromDate(next)).toBe('2027-01-01');
    expect(next.getHours()).toBe(0);
  });

  it('is in the future when called without arguments', () => {
    expect(startOfNextLocalDay().getTime()).toBeGreaterThan(Date.now());
  });
});

describe('currentTzOffsetMin', () => {
  it('is minutes east of UTC', () => {
    const d = new Date(2026, 9, 7);
    expect(currentTzOffsetMin(d)).toBe(-d.getTimezoneOffset() || 0);
  });

  it('never returns −0', () => {
    const fake = { getTimezoneOffset: () => 0 } as Date;
    expect(Object.is(currentTzOffsetMin(fake), -0)).toBe(false);
    expect(currentTzOffsetMin(fake)).toBe(0);
  });

  it('handles positive and negative offsets', () => {
    expect(currentTzOffsetMin({ getTimezoneOffset: () => -330 } as Date)).toBe(330);
    expect(currentTzOffsetMin({ getTimezoneOffset: () => 300 } as Date)).toBe(-300);
    expect(typeof currentTzOffsetMin()).toBe('number');
  });
});
