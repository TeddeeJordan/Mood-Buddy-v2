# Getting started and contributing

## Install and run

Requirements: Node.js 22.13 or later, Yarn 1, and a simulator, emulator or device. The app needs a **development build**; Expo Go does not work (MMKV / Nitro modules).

```bash
yarn                      # install dependencies
npx expo run:ios          # or: npx expo run:android (builds and installs a development build)
npx expo start            # dev server for an installed development build
```

Cloud builds use EAS profiles from `eas.json`: `npx eas-cli@latest build --profile development`.

Add dependencies only with `npx expo install <package>` (never npm, pnpm or bun lockfiles).

## Before you call a task done

```bash
yarn run check
```

This runs lint, type-check, tests with coverage thresholds, and the suite in two time zones. Use `yarn run check`: bare `yarn check` is Yarn 1's lockfile check and does something else.

## Conventions

Read [../CLAUDE.md](../CLAUDE.md) (folder layout, navigation rules, state placement, storage and security, dates, scales, theme and accessibility, tests) and [../AGENTS.md](../AGENTS.md) (Expo version rules). The [architecture map](ARCHITECTURE.md) shows where code goes and how to add a screen.

## How decisions are recorded

- [SPEC.md](SPEC.md) holds the product spec and the owner's decisions (D1 to D50). Settled decisions are not reopened in code.
- [adr/](adr/README.md) holds short architecture decision records that explain the reasoning behind significant decisions and link back to spec numbers. Supersede an ADR with a new one instead of rewriting it.
- User-visible changes go in [../CHANGELOG.md](../CHANGELOG.md) under `[Unreleased]`.
