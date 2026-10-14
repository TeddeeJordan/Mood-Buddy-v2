# Getting started and contributing

## Install and run

Requirements: Node.js 22.13 or later, Yarn 1, and a simulator, emulator or device. The app needs a **development build**; Expo Go does not work (MMKV / Nitro modules).

```bash
yarn                      # install dependencies
npx expo run:ios          # or: npx expo run:android (builds and installs a development build)
npx expo start            # dev server for an installed development build
```

When the Axios feature lands, also copy the example env file (no env vars exist yet, so there is no `.env.example` today):

```bash
cp .env.example .env
```

`.env` is git-ignored; only `.env.example` is committed. Values are public `EXPO_PUBLIC_*` only (never secrets) and are read once in `src/constants/env.ts`. EAS builds use EAS environment variables instead of a committed `.env` ([ADR 009](adr/009-env-files-policy.md)).

Local config plugins live in `plugins/` (registered in `app.json`). Changing a plugin or native config in `app.json` needs a rebuild: `npx expo prebuild --clean -p android` then `npx expo run:android` (or `-p ios` / `run:ios`), or a new EAS development build.

**After pulling the Profile feature:** it adds native code (`expo-image-picker`, `expo-file-system`) and an `expo-image-picker` plugin entry plus a blocked `CAMERA` permission in `app.json`. Run `yarn`, then `npx expo prebuild --clean` and rebuild (`npx expo run:ios` / `run:android`) or make a new EAS development build. An old development build will not have the module.

**Text size rule.** ESLint requires `maxFontSizeMultiplier={UNCAPPED_FONT_SCALE}` (from `src/constants/textScaling.ts`, value `0`, never `undefined`) on Paper `TextInput` and `HelperText`, and `labelMaxFontSizeMultiplier` / `titleMaxFontSizeMultiplier` on `Checkbox.Item` / `Menu.Item`, because Paper silently caps them at 1.5. A real cap needs an ADR ([ADR 010](adr/010-font-scale-caps.md)). Also: no floating labels on text inputs (put a visible `Text` label above the field and give the input the same `accessibilityLabel`), and keep `ScreenHeader` a plain-view header rather than `Appbar.Header` ([ADR 014](adr/014-screen-header-not-appbar.md)); both rules are in [../CLAUDE.md](../CLAUDE.md).

Cloud builds use EAS profiles from `eas.json`: `npx eas-cli@latest build --profile development`.

Add dependencies only with `npx expo install <package>` (never npm, pnpm or bun lockfiles).

## Before you call a task done

```bash
yarn run check
```

This runs lint, type-check, tests with coverage thresholds, and the suite in two time zones. Use `yarn run check`: bare `yarn check` is Yarn 1's lockfile check and does something else.

## Saved QA flows (Argent)

`.argent/flows/` holds recorded Argent flows for Profile: `profile-edit-bio-save.yaml` (iOS), `profile-discard-dialog.yaml` (iOS) and `profile-edit-bio-save-android.yaml` (Android). They tap fixed screen coordinates, so they are brittle: a layout, device or text-size change can break them. The folder is currently untracked (not committed, not ignored); the owner decides whether to commit or ignore it. <!-- TODO: owner decision on committing .argent/flows/ -->

## Conventions

Read [../CLAUDE.md](../CLAUDE.md) (folder layout, navigation rules, state placement, storage and security, dates, scales, theme and accessibility, tests) and [../AGENTS.md](../AGENTS.md) (Expo version rules). The [architecture map](ARCHITECTURE.md) shows where code goes and how to add a screen.

## How decisions are recorded

- [SPEC.md](SPEC.md) holds the product spec and the owner's decisions (D1 to D50). Settled decisions are not reopened in code.
- [adr/](adr/README.md) holds short architecture decision records that explain the reasoning behind significant decisions and link back to spec numbers. Supersede an ADR with a new one instead of rewriting it.
- User-visible changes go in [../CHANGELOG.md](../CHANGELOG.md) under `[Unreleased]`.
