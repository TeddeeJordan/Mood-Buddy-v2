# Architecture Decision Records

Short records of significant decisions. The full product decisions (D1–D50) live in [../SPEC.md](../SPEC.md); an ADR explains one decision's reasoning and trade-offs and links back to the spec numbers. Conventions that follow from these decisions are in [../../CLAUDE.md](../../CLAUDE.md).

| ADR | Title | Status | Spec |
|---|---|---|---|
| [001](001-navigation-drawer-js-tabs.md) | Drawer around JS Tabs with hidden tabs; Chat above the drawer | Accepted | D7, D17, D35 |
| [002](002-state-and-storage-stack.md) | MMKV + Redux Toolkit + TanStack Query + SQLite + SecureStore | Accepted | D2, D23, §6.3 |
| [003](003-scale-model.md) | Stored 1→5 meaning vs. display order | Accepted | D4, D39, D48 |
| [004](004-time-model.md) | UTC timestamp + stored offset defines an entry's day | Accepted | D20, D46 |
| [005](005-theme-contrast-option-c.md) | Theme contrast: identity colours as containers, deeper shades for text | Accepted | D6, §5.6 |
| [006](006-no-backup.md) | App data is excluded from OS backups (Android `allowBackup=false`; iOS local module flags the data directories) | Accepted | D49 |
| [007](007-dependency-audit-exceptions.md) | Known `yarn audit` exceptions (all under `expo`, no patch available) | Accepted | - |

## Writing a new ADR

1. Copy the layout of an existing record: Status, Context, Decision, Consequences.
2. Number it next in sequence (`NNN-short-title.md`) and add a row above.
3. Never rewrite an Accepted ADR. Supersede it with a new one and change the old Status to `Superseded by NNN`.
4. New owner decisions also go in [../SPEC.md](../SPEC.md).
