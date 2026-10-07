# Architecture

A short map of the code as it is today (foundation only; screens are placeholders). Rules live in [../CLAUDE.md](../CLAUDE.md); decisions in [SPEC.md](SPEC.md) and [adr/](adr/README.md).

## Folder map

| Path | Purpose |
|---|---|
| `src/app/` | Expo Router routes (D38). Thin: re-export a screen plus route options. `_layout.tsx` (root Stack), `(drawer)/_layout.tsx`, `(drawer)/(tabs)/_layout.tsx` and screens `index`, `dashboard`, `diary`, `profile`, `settings`; `chat.tsx` |
| `src/ui/screens/` | One folder per screen (`HomeScreen`, `DashboardScreen`, `DiaryScreen`, `ProfileScreen`, `SettingsScreen`, `ChatScreen`) |
| `src/ui/components/` | Shared components: `AppProviders`, `ThemedPaperProvider`, `AppReadyGate`, `AppErrorBoundary`, `AppDrawerContent`, `ScreenHeader` |
| `src/ui/widgets/` | Small reusable widgets: `HapticTabButton` |
| `src/hooks/` | Cross-screen hooks: `useAppBootstrap`, `useQueryFocusManager` |
| `src/services/db/` | SQLite: `migrations.ts`, `schema.v1.ts`, repository interfaces (`entriesRepository`, `promptsRepository`, `profileRepository`; interfaces only, not implemented yet) |
| `src/services/storage/` | `mmkv.ts` (single instance), `settingsStorage.ts` (typed MMKV access), `secureKeyStore.ts` (API key in SecureStore), `firstRun.ts`, `backupExclusion.ts` (JS wrapper for the `NoBackup` module, verification only) |
| `src/services/query/` | `queryClient.ts`, `queryKeys.ts` |
| `src/state/` | Redux: `store.ts`, `settingsSlice.ts`, `persistSettings.ts` (MMKV middleware), `hooks.ts` |
| `src/themes/` | `palettes.ts`, `paperTheme.ts`, `useAppTheme.ts`, `contrast.ts` |
| `src/constants/` | `database.ts`, `limits.ts`, `scales.ts`, `storageKeys.ts`, `dataLocations.ts` (where data lives; no-backup rule) |
| `src/utils/` | `dates.ts`, `tabAccessibility.ts` |
| `src/types/` | `dates.ts`, `db.ts`, `settings.ts` |
| `src/tests/` | `__tests__/`, `__mocks__/`, `helpers/`, `setup.ts` |
| `modules/no-backup/` | Local Expo module, iOS only, autolinked from `./modules`: an AppDelegate subscriber marks `Documents/` and `Library/Application Support/` excluded from backup at every launch (D49, [ADR 006](adr/006-no-backup.md)) |

Not built yet (planned in the spec): `src/services/anthropic/`, `src/services/notifications/`, a `chat` Redux slice, `src/constants/env.ts`, Axios and FlashList.

Each component, screen or widget has its own PascalCase folder: `Name.tsx` (view), `Name.props.ts` (prop types and styles) and `useName.ts` (logic, when there is any).

## Navigation

Root Stack → Drawer → JS Tabs; Chat is a root Stack screen. See [ADR 001](adr/001-navigation-drawer-js-tabs.md).

## Startup sequence

On iOS, before any JS runs, `NoBackupAppDelegateSubscriber` (`modules/no-backup`) flags the data directories excluded from backup (D49). Then:

1. `src/app/_layout.tsx` calls `SplashScreen.preventAutoHideAsync()` at module scope, so the native splash stays up.
2. The root layout renders `AppProviders` (`src/ui/components/AppProviders/AppProviders.tsx`): GestureHandlerRootView → Redux → QueryClientProvider → PaperProvider (`ThemedPaperProvider`, `src/ui/components/ThemedPaperProvider/`) → `SQLiteProvider` → `AppReadyGate`.
3. The Redux store is created with settings read synchronously from MMKV, so the first frame has the right theme (`hasApiKey` starts `false`).
4. `SQLiteProvider` runs `onInit = migrateDbIfNeeded` (`src/services/db/migrations.ts`): connection setup (`PRAGMA foreign_keys = ON`, WAL), then pending migrations by `user_version`, each in a transaction. It renders nothing until this finishes.
5. `AppReadyGate` runs `useAppBootstrap`: first-install cleanup, then derives `hasApiKey` from SecureStore. A SecureStore failure does not block startup. A timeout (`BOOTSTRAP_TIMEOUT_MS`, 4 s, in `src/constants/limits.ts`) also covers a call that never settles: the app becomes ready with `hasApiKey = false`, and if bootstrap finishes later its real result still updates `hasApiKey`.
6. When bootstrap settles (or times out), `AppReadyGate` renders the app; its first layout calls `SplashScreen.hide()` once.
7. `AppErrorBoundary` (exported as `ErrorBoundary` from the root layout) also hides the splash, so a startup failure such as a throwing migration shows an error instead of a stuck splash.

## State placement

| Kind of state | Where | Example today |
|---|---|---|
| Used by one component | `useState` in the component hook | `useAppBootstrap` readiness |
| Shared inside a screen | Screen hook | (none yet) |
| Rarely changing subtree value | React Context | Paper theme, SQLite context (library-provided) |
| Cross-screen, persisted or navigation-surviving | Redux slice | `settings` (persisted to MMKV) |
| Local database data | TanStack Query over SQLite repositories | keys in `queryKeys.ts` (entries, prompts, profile, quote) |
| Non-secret persisted values | MMKV via `settingsStorage.ts` | theme, reminder, flags |
| Secrets | SecureStore via `secureKeyStore.ts` | Anthropic API key |

Details and rationale: [ADR 002](adr/002-state-and-storage-stack.md). Scales: [ADR 003](adr/003-scale-model.md). Dates: [ADR 004](adr/004-time-model.md). Theme: [ADR 005](adr/005-theme-contrast-option-c.md). Backups: [ADR 006](adr/006-no-backup.md).

## Adding a screen or feature

1. **Route:** add a file under `src/app/` (inside `(drawer)/(tabs)/` for a tab screen) that only re-exports the screen, e.g. `export { HomeScreen as default } from '@/ui/screens/HomeScreen/HomeScreen';`. Hidden tabs also need a `Tabs.Screen` with `options={{ href: null }}` in `(drawer)/(tabs)/_layout.tsx`.
2. **Screen:** create `src/ui/screens/NameScreen/` with `NameScreen.tsx`, `NameScreen.props.ts` (styles through `makeStyles(theme)`; no inline styles) and `useNameScreen.ts` for logic.
3. **Data:** put SQL in a repository under `src/services/db/`, add keys to `src/services/query/queryKeys.ts`, and read through a TanStack Query hook; invalidate the key family after writes. Do not put database data in Redux.
4. **State:** pick the lowest level that works (see the table). Add a Redux slice only for cross-screen or persisted state, and register it in `rootReducer` in `src/state/store.ts`.
5. **Accessibility:** icon buttons get an `accessibilityLabel`, selectable items expose `accessibilityState.selected`, selected state is never colour-only. Add any new colour tokens to the contrast test.
6. **Tests:** add tests in `src/tests/__tests__/`; run `yarn run check`.
7. **Docs:** record new decisions in SPEC and, if significant, an ADR; add a feature doc and in-app help text once the feature is user-facing.
