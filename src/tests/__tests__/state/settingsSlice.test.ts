import { MMKV_KEYS } from '@/constants/storageKeys';
import { storage } from '@/services/storage/mmkv';
import { readPersistedSettings, writePersistedSettings } from '@/services/storage/settingsStorage';
import { changedPersistedFields, PERSISTED_FIELDS } from '@/state/persistSettings';
import {
  initialSettingsState,
  selectAiChatPromptShown,
  selectAiIntegrationEnabled,
  selectHasApiKey,
  selectReminderEnabled,
  selectReminderHour,
  selectReminderMinute,
  selectThemeName,
  setAiChatPromptShown,
  setAiIntegrationEnabled,
  setHasApiKey,
  setReminderEnabled,
  setReminderTime,
  setTheme,
  settingsReducer,
} from '@/state/settingsSlice';
import { loadPreloadedState, makeStore } from '@/state/store';

beforeEach(() => storage.clearAll());

describe('settings reducers', () => {
  it('starts from defaults with hasApiKey false', () => {
    expect(settingsReducer(undefined, { type: '@@init' })).toEqual(initialSettingsState);
    expect(initialSettingsState.hasApiKey).toBe(false);
  });

  it('applies each action', () => {
    let s = settingsReducer(initialSettingsState, setTheme('sage'));
    s = settingsReducer(s, setAiIntegrationEnabled(true));
    s = settingsReducer(s, setAiChatPromptShown(true));
    s = settingsReducer(s, setReminderEnabled(true));
    s = settingsReducer(s, setReminderTime({ hour: 9, minute: 30 }));
    s = settingsReducer(s, setHasApiKey(true));
    expect(s).toEqual({
      theme: 'sage',
      aiIntegrationEnabled: true,
      aiChatPromptShown: true,
      reminderEnabled: true,
      reminderHour: 9,
      reminderMinute: 30,
      hasApiKey: true,
    });
  });

  it('ignores an out-of-range reminder time', () => {
    const s = settingsReducer(initialSettingsState, setReminderTime({ hour: 25, minute: 0 }));
    expect(s).toBe(initialSettingsState);
    expect(settingsReducer(initialSettingsState, setReminderTime({ hour: 8, minute: 60 }))).toBe(initialSettingsState);
  });

  it('ignores an invalid theme name', () => {
    expect(settingsReducer(initialSettingsState, setTheme('neon' as never))).toBe(initialSettingsState);
    expect(settingsReducer(initialSettingsState, setTheme('Sage' as never))).toBe(initialSettingsState);
  });

  it('exposes selectors over the root state', () => {
    const root = { settings: { ...initialSettingsState, theme: 'water' as const, hasApiKey: true } };
    expect(selectThemeName(root)).toBe('water');
    expect(selectHasApiKey(root)).toBe(true);
    expect(selectAiIntegrationEnabled(root)).toBe(false);
    expect(selectAiChatPromptShown(root)).toBe(false);
    expect(selectReminderEnabled(root)).toBe(false);
    expect(selectReminderHour(root)).toBe(18);
    expect(selectReminderMinute(root)).toBe(0);
  });
});

describe('store + persistence listener', () => {
  it('reads preloadedState synchronously from MMKV', () => {
    writePersistedSettings({ theme: 'water', reminderHour: 6, aiIntegrationEnabled: true });
    expect(loadPreloadedState()).toEqual({
      settings: { ...initialSettingsState, theme: 'water', reminderHour: 6, aiIntegrationEnabled: true },
    });
    const store = makeStore();
    expect(store.getState().settings.theme).toBe('water');
  });

  it('falls back to lavender for an invalid stored theme', () => {
    storage.set(MMKV_KEYS.theme, 'neon');
    expect(makeStore().getState().settings.theme).toBe('lavender');
  });

  it('writes each persisted field to MMKV when it changes', () => {
    const store = makeStore();
    store.dispatch(setTheme('sage'));
    store.dispatch(setAiIntegrationEnabled(true));
    store.dispatch(setAiChatPromptShown(true));
    store.dispatch(setReminderEnabled(true));
    store.dispatch(setReminderTime({ hour: 21, minute: 15 }));
    expect(readPersistedSettings()).toEqual({
      theme: 'sage',
      aiIntegrationEnabled: true,
      aiChatPromptShown: true,
      reminderEnabled: true,
      reminderHour: 21,
      reminderMinute: 15,
    });
  });

  it('never writes hasApiKey to MMKV', () => {
    const store = makeStore();
    const setSpy = jest.spyOn(storage, 'set');
    store.dispatch(setHasApiKey(true));
    store.dispatch(setHasApiKey(false));
    expect(setSpy).not.toHaveBeenCalled();
    expect(storage.getAllKeys()).toEqual([]);
    expect(PERSISTED_FIELDS).not.toContain('hasApiKey');
    setSpy.mockRestore();
  });

  it('writes only the field that changed', () => {
    const store = makeStore();
    const setSpy = jest.spyOn(storage, 'set');
    store.dispatch(setTheme('water'));
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(MMKV_KEYS.theme, 'water');
    setSpy.mockRestore();
  });

  it('does not crash when the MMKV write throws; the in-memory state still updates', async () => {
    const store = makeStore();
    const setSpy = jest.spyOn(storage, 'set').mockImplementation(() => {
      throw new Error('disk full');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => store.dispatch(setTheme('sage'))).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0)); // let the listener effect settle
    expect(store.getState().settings.theme).toBe('sage');
    expect(errorSpy).toHaveBeenCalled(); // RTK's listener middleware reports the effect error
    setSpy.mockRestore();
    store.dispatch(setTheme('water'));
    expect(readPersistedSettings().theme).toBe('water'); // later writes still work
    errorSpy.mockRestore();
  });

  it('diffs persisted fields only', () => {
    const next = { ...initialSettingsState, hasApiKey: true, reminderMinute: 5 };
    expect(changedPersistedFields(initialSettingsState, next)).toEqual({ reminderMinute: 5 });
  });
});
