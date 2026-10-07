import { MMKV_KEYS } from '@/constants/storageKeys';
import { storage } from '@/services/storage/mmkv';
import {
  DEFAULT_SETTINGS,
  isThemeName,
  readInstallInitialized,
  readPersistedSettings,
  readQuoteCache,
  readReminderTz,
  readTzChangeDetectedAt,
  writeInstallInitialized,
  writePersistedSettings,
  writeQuoteCache,
  writeReminderTz,
  writeTzChangeDetectedAt,
} from '@/services/storage/settingsStorage';

beforeEach(() => storage.clearAll());

describe('persisted settings', () => {
  it('defaults to lavender, 18:00, everything off', () => {
    expect(readPersistedSettings()).toEqual({
      theme: 'lavender',
      aiIntegrationEnabled: false,
      aiChatPromptShown: false,
      reminderEnabled: false,
      reminderHour: 18,
      reminderMinute: 0,
    });
    expect(DEFAULT_SETTINGS.reminderHour).toBe(18);
  });

  it('round-trips every field', () => {
    const all = {
      theme: 'water' as const,
      aiIntegrationEnabled: true,
      aiChatPromptShown: true,
      reminderEnabled: true,
      reminderHour: 7,
      reminderMinute: 45,
    };
    writePersistedSettings(all);
    expect(readPersistedSettings()).toEqual(all);
  });

  it('writes only the provided fields', () => {
    writePersistedSettings({ theme: 'sage' });
    expect(storage.getAllKeys()).toEqual([MMKV_KEYS.theme]);
  });

  it('falls back to lavender for an invalid stored theme', () => {
    storage.set(MMKV_KEYS.theme, 'midnight');
    expect(readPersistedSettings().theme).toBe('lavender');
  });

  it('falls back to defaults for out-of-range stored times', () => {
    storage.set(MMKV_KEYS.reminderHour, 24);
    storage.set(MMKV_KEYS.reminderMinute, 7.5);
    expect(readPersistedSettings()).toMatchObject({ reminderHour: 18, reminderMinute: 0 });
  });

  it('rejects invalid writes without storing them', () => {
    expect(() => writePersistedSettings({ reminderHour: 24 })).toThrow(RangeError);
    expect(() => writePersistedSettings({ reminderHour: -1 })).toThrow(RangeError);
    expect(() => writePersistedSettings({ reminderMinute: 60 })).toThrow(RangeError);
    // @ts-expect-error invalid theme on purpose
    expect(() => writePersistedSettings({ theme: 'dark' })).toThrow(RangeError);
    expect(storage.getAllKeys()).toEqual([]);
  });

  it('recognises theme names', () => {
    expect(isThemeName('sage')).toBe(true);
    expect(isThemeName('Sage')).toBe(false);
    expect(isThemeName(undefined)).toBe(false);
  });
});

describe('non-Redux keys', () => {
  it('round-trips reminder_tz and clears it', () => {
    expect(readReminderTz()).toBeNull();
    writeReminderTz('Asia/Tokyo');
    expect(readReminderTz()).toBe('Asia/Tokyo');
    writeReminderTz(null);
    expect(readReminderTz()).toBeNull();
  });

  it('round-trips tz_change_detected_at and clears it', () => {
    expect(readTzChangeDetectedAt()).toBeNull();
    writeTzChangeDetectedAt(1_790_000_000_000);
    expect(readTzChangeDetectedAt()).toBe(1_790_000_000_000);
    writeTzChangeDetectedAt(null);
    expect(readTzChangeDetectedAt()).toBeNull();
  });

  it('round-trips quote_cache and rejects corrupt values', () => {
    expect(readQuoteCache()).toBeNull();
    const quote = { q: 'Be here now.', a: 'Ram Dass', localDate: '2026-10-07' };
    writeQuoteCache(quote);
    expect(readQuoteCache()).toEqual(quote);
    storage.set(MMKV_KEYS.quoteCache, '{not json');
    expect(readQuoteCache()).toBeNull();
    storage.set(MMKV_KEYS.quoteCache, JSON.stringify({ q: 1 }));
    expect(readQuoteCache()).toBeNull();
    storage.set(MMKV_KEYS.quoteCache, 'null');
    expect(readQuoteCache()).toBeNull();
  });

  it('round-trips install_initialized', () => {
    expect(readInstallInitialized()).toBe(false);
    writeInstallInitialized(true);
    expect(readInstallInitialized()).toBe(true);
  });
});
