import { createListenerMiddleware } from '@reduxjs/toolkit';

import { writePersistedSettings } from '@/services/storage/settingsStorage';
import type { PersistedSettings } from '@/types/settings';

import type { SettingsState } from './settingsSlice';

/** The only fields written to MMKV. `hasApiKey` is deliberately not listed (SPEC §2.8). */
export const PERSISTED_FIELDS = [
  'theme',
  'aiIntegrationEnabled',
  'aiChatPromptShown',
  'reminderEnabled',
  'reminderHour',
  'reminderMinute',
] as const satisfies readonly (keyof PersistedSettings)[];

type StateWithSettings = { settings: SettingsState };

/** Fields of the persisted subset that differ between two settings states. */
export function changedPersistedFields(prev: SettingsState, next: SettingsState): Partial<PersistedSettings> {
  const patch: Partial<PersistedSettings> = {};
  for (const field of PERSISTED_FIELDS) {
    if (prev[field] !== next[field]) {
      Object.assign(patch, { [field]: next[field] });
    }
  }
  return patch;
}

/** Listener middleware that mirrors persisted settings to MMKV after every change. */
export function createPersistSettingsMiddleware() {
  const listener = createListenerMiddleware();
  listener.startListening({
    predicate: (_action, current, previous) =>
      (current as StateWithSettings).settings !== (previous as StateWithSettings).settings,
    effect: (_action, api) => {
      const prev = (api.getOriginalState() as StateWithSettings).settings;
      const next = (api.getState() as StateWithSettings).settings;
      const patch = changedPersistedFields(prev, next);
      if (Object.keys(patch).length > 0) {
        writePersistedSettings(patch);
      }
    },
  });
  return listener;
}
