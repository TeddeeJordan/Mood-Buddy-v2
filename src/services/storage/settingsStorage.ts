import { REMINDER_DEFAULT } from '@/constants/limits';
import { MMKV_KEYS } from '@/constants/storageKeys';
import { THEME_NAMES, type PersistedSettings, type QuoteCache, type ThemeName } from '@/types/settings';

import { storage } from './mmkv';

export const DEFAULT_THEME: ThemeName = 'lavender';

export const DEFAULT_SETTINGS: PersistedSettings = {
  theme: DEFAULT_THEME,
  aiIntegrationEnabled: false,
  aiChatPromptShown: false,
  reminderEnabled: false,
  reminderHour: REMINDER_DEFAULT.hour,
  reminderMinute: REMINDER_DEFAULT.minute,
};

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value);
}

export function isValidHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;
}

export function isValidMinute(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 59;
}

/** Synchronous read used for the Redux preloadedState, so the first frame has the right theme. */
export function readPersistedSettings(): PersistedSettings {
  const theme = storage.getString(MMKV_KEYS.theme);
  const hour = storage.getNumber(MMKV_KEYS.reminderHour);
  const minute = storage.getNumber(MMKV_KEYS.reminderMinute);
  return {
    // Anything other than a known theme falls back to lavender (SPEC §3.3).
    theme: isThemeName(theme) ? theme : DEFAULT_SETTINGS.theme,
    aiIntegrationEnabled: storage.getBoolean(MMKV_KEYS.aiIntegrationEnabled) ?? DEFAULT_SETTINGS.aiIntegrationEnabled,
    aiChatPromptShown: storage.getBoolean(MMKV_KEYS.aiChatPromptShown) ?? DEFAULT_SETTINGS.aiChatPromptShown,
    reminderEnabled: storage.getBoolean(MMKV_KEYS.reminderEnabled) ?? DEFAULT_SETTINGS.reminderEnabled,
    reminderHour: isValidHour(hour) ? hour : DEFAULT_SETTINGS.reminderHour,
    reminderMinute: isValidMinute(minute) ? minute : DEFAULT_SETTINGS.reminderMinute,
  };
}

/** Writes only the provided fields. Rejects out-of-range values instead of storing them. */
export function writePersistedSettings(patch: Partial<PersistedSettings>): void {
  if (patch.theme !== undefined && !isThemeName(patch.theme)) {
    throw new RangeError(`Unknown theme: ${String(patch.theme)}`);
  }
  if (patch.reminderHour !== undefined && !isValidHour(patch.reminderHour)) {
    throw new RangeError(`Reminder hour out of range: ${patch.reminderHour}`);
  }
  if (patch.reminderMinute !== undefined && !isValidMinute(patch.reminderMinute)) {
    throw new RangeError(`Reminder minute out of range: ${patch.reminderMinute}`);
  }
  if (patch.theme !== undefined) storage.set(MMKV_KEYS.theme, patch.theme);
  if (patch.aiIntegrationEnabled !== undefined) storage.set(MMKV_KEYS.aiIntegrationEnabled, patch.aiIntegrationEnabled);
  if (patch.aiChatPromptShown !== undefined) storage.set(MMKV_KEYS.aiChatPromptShown, patch.aiChatPromptShown);
  if (patch.reminderEnabled !== undefined) storage.set(MMKV_KEYS.reminderEnabled, patch.reminderEnabled);
  if (patch.reminderHour !== undefined) storage.set(MMKV_KEYS.reminderHour, patch.reminderHour);
  if (patch.reminderMinute !== undefined) storage.set(MMKV_KEYS.reminderMinute, patch.reminderMinute);
}

// ---- Non-Redux keys (single consumers) ----

/** IANA zone the current reminder window was built for (D20). */
export function readReminderTz(): string | null {
  return storage.getString(MMKV_KEYS.reminderTz) ?? null;
}

export function writeReminderTz(zone: string | null): void {
  if (zone === null) storage.remove(MMKV_KEYS.reminderTz);
  else storage.set(MMKV_KEYS.reminderTz, zone);
}

/** Epoch ms when a different zone was first seen; null when no grace period is running. */
export function readTzChangeDetectedAt(): number | null {
  const value = storage.getNumber(MMKV_KEYS.tzChangeDetectedAt);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function writeTzChangeDetectedAt(epochMs: number | null): void {
  if (epochMs === null) storage.remove(MMKV_KEYS.tzChangeDetectedAt);
  else storage.set(MMKV_KEYS.tzChangeDetectedAt, epochMs);
}

function isQuoteCache(value: unknown): value is QuoteCache {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.q === 'string' && typeof v.a === 'string' && typeof v.localDate === 'string';
}

/** Last good quote (D21). Corrupt JSON reads as null. */
export function readQuoteCache(): QuoteCache | null {
  const raw = storage.getString(MMKV_KEYS.quoteCache);
  if (raw === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isQuoteCache(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeQuoteCache(quote: QuoteCache): void {
  storage.set(MMKV_KEYS.quoteCache, JSON.stringify(quote));
}

/** Set once the first-run keychain cleanup has run (SPEC §2.8). */
export function readInstallInitialized(): boolean {
  return storage.getBoolean(MMKV_KEYS.installInitialized) ?? false;
}

export function writeInstallInitialized(value: boolean): void {
  storage.set(MMKV_KEYS.installInitialized, value);
}
