import { runInTimeZone } from '@/tests/helpers/runInTimeZone';

/**
 * Real DST transitions, independent of the host TZ (see runInTimeZone). 2026 transitions used:
 *  - America/Los_Angeles: spring forward Sun 8 Mar (23 h day), fall back Sun 1 Nov (25 h day).
 *  - America/Santiago: clocks change AT MIDNIGHT. Sun 6 Sep 00:00 → 01:00 (00:00 does not exist);
 *    Sun 5 Apr 00:00 → Sat 4 Apr 23:00 (23:00–23:59 happens twice, Saturday is 25 h).
 *  - Australia/Lord_Howe: a 30-minute DST shift (UTC+10:30 ↔ +11:00).
 */

interface NextDay {
  from: string;
  next: string;
  nextKey: string;
  fromKey: string;
  justBeforeKey: string;
  hoursUntil: number;
}

/** Runs startOfNextLocalDay for each instant and reports facts about the result. */
function nextDayFacts(zone: string, instants: string[]): NextDay[] {
  return runInTimeZone<NextDay[]>(
    zone,
    `return ${JSON.stringify(instants)}.map((iso) => {
      const from = new Date(iso);
      const next = D.startOfNextLocalDay(from);
      return {
        from: iso,
        next: next.toISOString(),
        nextKey: D.localDateKeyFromDate(next),
        fromKey: D.localDateKeyFromDate(from),
        justBeforeKey: D.localDateKeyFromDate(new Date(next.getTime() - 1)),
        hoursUntil: (next.getTime() - from.getTime()) / 3600000,
      };
    });`,
  );
}

/** Every 30 minutes from `startIso` for `count` steps. */
function halfHours(startIso: string, count: number): string[] {
  const start = Date.parse(startIso);
  return Array.from({ length: count }, (_, i) => new Date(start + i * 30 * 60_000).toISOString());
}

function addDay(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe('startOfNextLocalDay across real DST changes', () => {
  it('America/Los_Angeles spring-forward: the 23 h day ends at the next local midnight', () => {
    const [f] = nextDayFacts('America/Los_Angeles', ['2026-03-08T08:00:00.000Z']); // Sun 8 Mar 00:00 PST
    expect(f.next).toBe('2026-03-09T07:00:00.000Z'); // Mon 9 Mar 00:00 PDT
    expect(f.hoursUntil).toBe(23);
  });

  it('America/Los_Angeles fall-back: the 25 h day ends at the next local midnight', () => {
    const [f] = nextDayFacts('America/Los_Angeles', ['2026-11-01T07:00:00.000Z']); // Sun 1 Nov 00:00 PDT
    expect(f.next).toBe('2026-11-02T08:00:00.000Z'); // Mon 2 Nov 00:00 PST
    expect(f.hoursUntil).toBe(25);
  });

  it('America/Los_Angeles fall-back: both 1 am hours finish on the same midnight', () => {
    const [first, second] = nextDayFacts('America/Los_Angeles', [
      '2026-11-01T08:30:00.000Z', // 01:30 PDT (first)
      '2026-11-01T09:30:00.000Z', // 01:30 PST (second)
    ]);
    expect(first.next).toBe('2026-11-02T08:00:00.000Z');
    expect(second.next).toBe('2026-11-02T08:00:00.000Z');
  });

  it('America/Santiago spring-forward: the skipped midnight resolves to 01:00, the first instant of the new day', () => {
    const [f] = nextDayFacts('America/Santiago', ['2026-09-05T22:00:00.000Z']);
    expect(f.fromKey).toBe('2026-09-05');
    expect(f.next).toBe('2026-09-06T04:00:00.000Z'); // 01:00 -03, since 00:00 does not exist
    expect(f.nextKey).toBe('2026-09-06');
    expect(f.justBeforeKey).toBe('2026-09-05');
  });

  it('America/Santiago fall-back: from the repeated 23:xx hour the next midnight is still one hour away', () => {
    const [f] = nextDayFacts('America/Santiago', ['2026-04-05T03:30:00.000Z']); // 23:30 -04 (second pass)
    expect(f.next).toBe('2026-04-05T04:00:00.000Z');
    expect(f.hoursUntil).toBe(0.5);
    expect(f.justBeforeKey).toBe('2026-04-04');
    expect(f.nextKey).toBe('2026-04-05');
  });

  it('Australia/Lord_Howe (30-minute shift): lands on local midnight and the right date', () => {
    const [f] = nextDayFacts('Australia/Lord_Howe', ['2026-04-05T02:00:00.000Z']); // 12:30 Sun 5 Apr, day after the change
    expect(f.next).toBe('2026-04-05T13:30:00.000Z'); // 00:00 +10:30 on Mon 6 Apr
    expect(f.nextKey).toBe('2026-04-06');
  });

  it.each([
    ['America/Los_Angeles', '2026-03-07T12:00:00.000Z', 96], // 6–10 Mar
    ['America/Los_Angeles', '2026-10-31T12:00:00.000Z', 96], // 31 Oct – 4 Nov
    ['America/Santiago', '2026-09-04T12:00:00.000Z', 96],
    ['America/Santiago', '2026-04-03T12:00:00.000Z', 96],
    ['Australia/Lord_Howe', '2026-04-04T12:00:00.000Z', 96],
    ['Australia/Lord_Howe', '2026-10-03T12:00:00.000Z', 96],
  ])('%s from %s: the result is always the first instant of the following calendar day', (zone, start, count) => {
    for (const f of nextDayFacts(zone, halfHours(start, count))) {
      expect(f.nextKey).toBe(addDay(f.fromKey));
      expect(f.justBeforeKey).toBe(f.fromKey);
      expect(f.hoursUntil).toBeGreaterThan(0);
      expect(f.hoursUntil).toBeLessThanOrEqual(25);
    }
  });
});

describe('local-day helpers under a DST zone', () => {
  it('addDaysToKey and localDateKeyFromUtc never move across a 23 h / 25 h day', () => {
    const result = runInTimeZone<{ add: string[]; utc: string[] }>(
      'America/Los_Angeles',
      `return {
        add: [D.addDaysToKey('2026-03-08', 1), D.addDaysToKey('2026-11-01', 1), D.addDaysToKey('2026-03-07', 2)],
        // Stored offset wins over the device zone: PST (-480) and PDT (-420) rows around the change.
        utc: [
          D.localDateKeyFromUtc('2026-03-08T07:59:59.999Z', -480), // 23:59:59 on 7 Mar (PST)
          D.localDateKeyFromUtc('2026-03-08T08:00:00.000Z', -480), // 00:00 on 8 Mar (PST)
          D.localDateKeyFromUtc('2026-11-02T07:59:59.999Z', -480), // 23:59:59 on 1 Nov (PST)
          D.localDateKeyFromUtc('2026-11-01T06:59:59.999Z', -420), // 23:59:59 on 31 Oct (PDT)
          D.localDateKeyFromUtc('2026-11-01T07:00:00.000Z', -420), // 00:00 on 1 Nov (PDT)
        ],
      };`,
    );
    expect(result.add).toEqual(['2026-03-09', '2026-11-02', '2026-03-09']);
    expect(result.utc).toEqual(['2026-03-07', '2026-03-08', '2026-11-01', '2026-10-31', '2026-11-01']);
  });

  it('a row stored with one offset keeps its date when the device is in another zone', () => {
    // Written in Tokyo (+540) at 00:30 local on 8 Mar; read on a Los Angeles device.
    const key = runInTimeZone<string>('America/Los_Angeles', `return D.localDateKeyFromUtc('2026-03-07T15:30:00.000Z', 540);`);
    expect(key).toBe('2026-03-08');
  });

  it('currentTzOffsetMin follows the DST offset in effect at that instant', () => {
    const offsets = runInTimeZone<Record<string, number[]>>(
      'America/Los_Angeles',
      `const at = (iso) => D.currentTzOffsetMin(new Date(iso));
       return { la: [at('2026-03-08T09:59:59.999Z'), at('2026-03-08T10:00:00.000Z'), at('2026-11-01T08:59:59.999Z'), at('2026-11-01T09:00:00.000Z')] };`,
    );
    // PST −480 until 10:00Z on 8 Mar, PDT −420 until 09:00Z on 1 Nov, then PST again.
    expect(offsets.la).toEqual([-480, -420, -420, -480]);
  });

  it('currentTzOffsetMin handles half-hour DST and never returns -0 in a UTC zone', () => {
    expect(
      runInTimeZone<number[]>(
        'Australia/Lord_Howe',
        `return [D.currentTzOffsetMin(new Date('2026-01-15T00:00:00Z')), D.currentTzOffsetMin(new Date('2026-07-15T00:00:00Z'))];`,
      ),
    ).toEqual([660, 630]);
    const utc = runInTimeZone<{ value: number; negZero: boolean }>(
      'UTC',
      `const v = D.currentTzOffsetMin(new Date('2026-07-15T00:00:00Z')); return { value: v, negZero: Object.is(v, -0) };`,
    );
    expect(utc).toEqual({ value: 0, negZero: false });
  });

  it('localDateKeyFromDate uses the device zone (not UTC) at the instant of a DST change', () => {
    const keys = runInTimeZone<string[]>(
      'America/Los_Angeles',
      `return [D.localDateKeyFromDate(new Date('2026-03-08T07:59:59.999Z')), D.localDateKeyFromDate(new Date('2026-03-08T08:00:00.000Z'))];`,
    );
    expect(keys).toEqual(['2026-03-07', '2026-03-08']);
  });
});
