import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { readPersistedSettings } from '@/services/storage/settingsStorage';

import { createPersistSettingsMiddleware } from './persistSettings';
import { settingsReducer } from './settingsSlice';

/** combineReducers so the deferred `chat` slice can be added later without restructuring. */
export const rootReducer = combineReducers({
  settings: settingsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/** Synchronous MMKV read so the first frame already has the right theme. `hasApiKey` starts false. */
export function loadPreloadedState(): RootState {
  return { settings: { ...readPersistedSettings(), hasApiKey: false } };
}

export function makeStore(preloadedState: RootState = loadPreloadedState()) {
  const persistSettings = createPersistSettingsMiddleware();
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault().prepend(persistSettings.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
