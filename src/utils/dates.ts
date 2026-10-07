import { PROMPT_RETENTION_DAYS } from '@/constants/limits';
import type { LocalDateKey } from '@/types/dates';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
/** UTC offsets span −12:00 … +14:00, so ±14 h covers every zone an entry can have been written in. */
const SEARCH_WINDOW_PAD_MS = 14 * 60 * MS_PER_MINUTE;

const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
/**
 * ISO 8601 date-time with an explicit `Z` or `±HH:MM`. Without one, Date.parse would read the
 * string as device-local time and silently break D20.
 */
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
/** Real UTC offsets in minutes east of UTC; matches the `tz_offset_min` CHECK in schema v1. */
const MIN_TZ_OFFSET_MIN = -720;
const MAX_TZ_OFFSET_MIN = 840;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatKey(year: number, month: number, day: number): LocalDateKey {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}` as LocalDateKey;
}

function parseKey(key: LocalDateKey): { year: number; month: number; day: number } {
  const match = KEY_PATTERN.exec(key);
  if (!match) {
    throw new RangeError(`Invalid local date key: ${key}`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** True for a real calendar date in `YYYY-MM-DD` form. */
export function isLocalDateKey(value: string): value is LocalDateKey {
  const match = KEY_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Validates and brands a string. Throws for anything that isn't a real calendar date. */
export function toLocalDateKey(value: string): LocalDateKey {
  if (!isLocalDateKey(value)) {
    throw new RangeError(`Invalid local date key: ${value}`);
  }
  return value;
}

/**
 * The write-time local date of a row: its UTC timestamp shifted by its own stored offset (D20).
 * Independent of the device's current zone.
 */
export function localDateKeyFromUtc(utcIso: string, tzOffsetMin: number): LocalDateKey {
  const ms = UTC_ISO_PATTERN.test(utcIso) ? Date.parse(utcIso) : Number.NaN;
  if (Number.isNaN(ms)) {
    throw new RangeError(`Invalid UTC timestamp (needs Z or an explicit offset): ${utcIso}`);
  }
  if (!Number.isInteger(tzOffsetMin) || tzOffsetMin < MIN_TZ_OFFSET_MIN || tzOffsetMin > MAX_TZ_OFFSET_MIN) {
    throw new RangeError(`Invalid tz_offset_min: ${tzOffsetMin}`);
  }
  const shifted = new Date(ms + tzOffsetMin * MS_PER_MINUTE);
  return formatKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** The device-local calendar date of `date` (defaults to now). */
export function localDateKeyFromDate(date: Date = new Date()): LocalDateKey {
  return formatKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Calendar arithmetic on a date key. Pure date maths in UTC, so DST can never shift it. */
export function addDaysToKey(key: LocalDateKey, days: number): LocalDateKey {
  const { year, month, day } = parseKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return formatKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** D46 (1): an entry dated after device today counts as today for buckets and the streak. */
export function clampToToday(key: LocalDateKey, today: LocalDateKey): LocalDateKey {
  return key > today ? today : key;
}

/** D46 (3): Diary and export upper bound = max(device today, latest entry local date). */
export function upperBoundKey(today: LocalDateKey, latestEntryKey: LocalDateKey | null): LocalDateKey {
  return latestEntryKey !== null && latestEntryKey > today ? latestEntryKey : today;
}

/**
 * A UTC window guaranteed to contain every row whose write-time local date is in
 * [startKey, endKey], whatever offset it was written with. Widened by ±14 h, so callers must
 * still filter exactly by local date. `toIsoExclusive` is an exclusive upper bound.
 */
export function utcSearchWindowForLocalRange(
  startKey: LocalDateKey,
  endKey: LocalDateKey,
): { fromIso: string; toIsoExclusive: string } {
  const [lo, hi] = startKey <= endKey ? [startKey, endKey] : [endKey, startKey];
  const start = parseKey(lo);
  const endPlusOne = parseKey(addDaysToKey(hi, 1));
  const fromMs = Date.UTC(start.year, start.month - 1, start.day) - SEARCH_WINDOW_PAD_MS;
  const toMs = Date.UTC(endPlusOne.year, endPlusOne.month - 1, endPlusOne.day) + SEARCH_WINDOW_PAD_MS;
  return { fromIso: new Date(fromMs).toISOString(), toIsoExclusive: new Date(toMs).toISOString() };
}

/** Prompts with a timestamp before this instant are purged (D3). */
export function purgeCutoffIso(now: Date = new Date(), days: number = PROMPT_RETENTION_DAYS): string {
  return new Date(now.getTime() - days * MS_PER_DAY).toISOString();
}

/** Next local midnight in the device's current zone (DST-correct via setHours). */
export function startOfNextLocalDay(now: Date = new Date()): Date {
  const next = new Date(now.getTime());
  next.setHours(24, 0, 0, 0);
  return next;
}

/** Minutes east of UTC right now, as stored in `tz_offset_min`. Never returns −0. */
export function currentTzOffsetMin(now: Date = new Date()): number {
  const offset = -now.getTimezoneOffset();
  return offset === 0 ? 0 : offset;
}
