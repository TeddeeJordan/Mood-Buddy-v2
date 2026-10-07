import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { DEFAULT_SETTINGS, isThemeName, isValidHour, isValidMinute } from '@/services/storage/settingsStorage';
import type { PersistedSettings, ThemeName } from '@/types/settings';

/**
 * Cross-screen settings (State Placement level 4): read by the root (theme), Home, Chat and
 * Settings, and must survive restarts. Persisted fields are written to MMKV by
 * persistSettings.ts. `hasApiKey` is memory-only, derived from SecureStore at startup.
 */
export interface SettingsState extends PersistedSettings {
  hasApiKey: boolean;
}

export const initialSettingsState: SettingsState = { ...DEFAULT_SETTINGS, hasApiKey: false };

const settingsSlice = createSlice({
  name: 'settings',
  initialState: initialSettingsState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeName>) {
      if (!isThemeName(action.payload)) return;
      state.theme = action.payload;
    },
    setAiIntegrationEnabled(state, action: PayloadAction<boolean>) {
      state.aiIntegrationEnabled = action.payload;
    },
    setAiChatPromptShown(state, action: PayloadAction<boolean>) {
      state.aiChatPromptShown = action.payload;
    },
    setReminderEnabled(state, action: PayloadAction<boolean>) {
      state.reminderEnabled = action.payload;
    },
    setReminderTime(state, action: PayloadAction<{ hour: number; minute: number }>) {
      const { hour, minute } = action.payload;
      if (!isValidHour(hour) || !isValidMinute(minute)) return;
      state.reminderHour = hour;
      state.reminderMinute = minute;
    },
    /** Memory only; never persisted. */
    setHasApiKey(state, action: PayloadAction<boolean>) {
      state.hasApiKey = action.payload;
    },
  },
  selectors: {
    selectThemeName: (state) => state.theme,
    selectHasApiKey: (state) => state.hasApiKey,
    selectAiIntegrationEnabled: (state) => state.aiIntegrationEnabled,
    selectAiChatPromptShown: (state) => state.aiChatPromptShown,
    selectReminderEnabled: (state) => state.reminderEnabled,
    selectReminderHour: (state) => state.reminderHour,
    selectReminderMinute: (state) => state.reminderMinute,
  },
});

export const {
  setTheme,
  setAiIntegrationEnabled,
  setAiChatPromptShown,
  setReminderEnabled,
  setReminderTime,
  setHasApiKey,
} = settingsSlice.actions;

export const {
  selectThemeName,
  selectHasApiKey,
  selectAiIntegrationEnabled,
  selectAiChatPromptShown,
  selectReminderEnabled,
  selectReminderHour,
  selectReminderMinute,
} = settingsSlice.selectors;

export const settingsReducer = settingsSlice.reducer;
export default settingsSlice;
