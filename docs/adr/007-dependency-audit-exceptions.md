# 007. Known `yarn audit` exceptions (2026-10-07)

**Status:** Accepted. Spec: none (release hygiene required by [CLAUDE.md](../../CLAUDE.md): "Run `yarn audit` before release; fix moderate+ or record why not").

## Context

`yarn audit --groups dependencies --level moderate` on 2026-10-07 reports 15 instances of 4 advisories. None can be fixed by us: no patched version is reachable within the ranges the parent packages allow, and every instance sits under `expo` or `expo-router`. Owner-pinned libraries and the Expo SDK are not swapped to work around this.

## Decision

Accept these advisories for now and re-check at each release and on each Expo SDK or `expo-router` update.

| Package | Severity | Issue | Path | Exposure |
|---|---|---|---|---|
| `decode-uri-component` | moderate | Denial of service on malformed percent-encoding | `expo-router` > `query-string` | **Only runtime-bundled one.** Reachable through deep-link and URL parsing. A crafted link can at worst cause a failure in the app's own process. |
| `node-forge` | high | RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements | `@expo/cli` | Build-time tooling only; not in the app bundle. |
| `braces` | high | Stack-exhaustion DoS via deeply nested patterns | `metro` | Build-time only; not in the app bundle. |
| `uuid` | moderate | Missing buffer bounds check in v3/v5/v6 when `buf` is provided | `@expo/config-plugins`, `@expo/cli` | Build-time only; not in the app bundle. |

Rationale: no patched version is reachable within the ranges the parent packages allow. For `node-forge` and `braces` no patch exists at all (patched range `<0.0.0`). Patches exist for `decode-uri-component` (>=0.5.0) and `uuid` (>=11.1.1), but `query-string` requires `^0.2.2` and `xcode` requires `^7.0.3`, so they cannot be installed without overriding. We are waiting on the Expo SDK and `expo-router`. We add no `resolutions` overrides without owner sign-off. Build-time packages run on developer and CI machines against our own trusted inputs, not on user devices.

Mitigation for the runtime one: route params and deep links are already treated as untrusted (see CLAUDE.md, Navigation). Chat accepts no text from a URL.

## Consequences

- Release checks will keep showing these advisories; compare against this table and investigate anything new.
- Re-check `decode-uri-component` first when a newer `expo-router` patch ships. If fixed, or if the exposure changes, supersede this ADR with a new one.
- Do not use `resolutions` overrides without owner sign-off, since they can break Expo's pinned tooling.
