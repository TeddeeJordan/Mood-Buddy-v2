# ADR 009: Environment files policy

**Status:** Accepted

## Context

The Axios feature will introduce the first environment variables. Expo bundles every `EXPO_PUBLIC_*` value into the app, so these values are public. We need a rule for what is committed and how builds get values.

## Decision

- Only `.env.example` is committed. It holds placeholders or documented public defaults.
- `.env` is git-ignored. Each developer copies `.env.example` to `.env`.
- EAS builds use EAS environment variables, not a committed `.env`.
- Only public `EXPO_PUBLIC_*` values; no secrets. They are read once in `src/constants/env.ts`.

## Consequences

- No secret can leak through a committed env file, and the example file documents every variable.
- A new developer must copy the file before the first run, and every new variable must be added to `.env.example` and to the EAS environments.
- `.env.example` does not exist yet; it is added with the Axios feature.
