# Mood Buddy v2

A rewrite of Mood Buddy, a private mood journal for iPhone and Android phones. You log mood,
stress and anxiety; the data stays on the device in SQLite.

**Status:** foundation only. The app shell (navigation, theme, storage, database schema and
startup) is built; the screens are placeholders. Feature work follows [docs/SPEC.md](docs/SPEC.md).

## Requirements

- Node.js 22.13 or later (tests use the built-in `node:sqlite`)
- Yarn 1 (the repo uses `yarn.lock`)
- A **development build** on a simulator, emulator or device. Expo Go is not supported, because
  the app uses native modules Expo Go doesn't include (MMKV / Nitro).

## Getting started

```bash
yarn                       # install dependencies
npx expo run:ios           # or: npx expo run:android — builds and installs a development build
npx expo start             # start the dev server for an installed development build
```

Cloud development builds: `npx eas-cli@latest build --profile development` (profiles in `eas.json`).

Add dependencies only with `npx expo install <package>`.

## Scripts

| Script | What it does |
|---|---|
| `yarn lint` | ESLint (`expo lint`) |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn test` | Jest |
| `yarn test:coverage` | Jest with coverage thresholds |
| `yarn test:tz` | The whole suite in `Asia/Kolkata` and `America/Los_Angeles` |
| `yarn run check` | lint + typecheck + coverage + time-zone runs (the done-gate). Use `run`: bare `yarn check` is Yarn's built-in lockfile check. |

## Docs

- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md): getting started, done-gate and how decisions are recorded
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): folder map, startup sequence, state placement, adding a screen
- [docs/adr/](docs/adr/README.md): architecture decision records
- [docs/SPEC.md](docs/SPEC.md): product spec and decisions (D1 to D50)
- [CHANGELOG.md](CHANGELOG.md): release notes
- [CLAUDE.md](CLAUDE.md): project conventions
- [AGENTS.md](AGENTS.md): Expo version rules and commands

## Privacy

There are no accounts, no analytics and no backend. Your data stays on the device.

- **No backups.** The app's data is excluded from OS backups on both platforms. On Android, app
  backup is turned off. On iOS, the app marks its data folders as excluded from iCloud and computer
  backups each time it starts. The API key is stored in the device's secure storage and never moves
  to another device.
- **What that means for you:** your entries are lost if you change phones, restore a phone from a
  backup, or delete and reinstall the app. Use **Export my data** (CSV of your entries) to keep a
  copy, and **Delete all my data** to erase everything. Both are planned features (SPEC D14, D30).
- **Network:** today the app makes no network calls of its own. Planned (not built yet): an
  optional AI chat that calls the Anthropic API with a key you supply, and a daily quote from
  ZenQuotes. Once those ship, they will be the only network calls.

Details: [ADR 006](docs/adr/006-no-backup.md).
