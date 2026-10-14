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
| [008](008-repositories-over-structural-db-type.md) | Repositories are factories over a structural `SqlDatabase` type | Accepted | §2.7, §3.7, D3, D20 |
| [009](009-env-files-policy.md) | Only `.env.example` is committed; `.env` is git-ignored; EAS uses EAS environment variables | Accepted | - |
| [010](010-font-scale-caps.md) | Font-scale caps on emoji tiles only (accepted WCAG 1.4.4 exception); implicit library caps count as caps. Amended: header cap removed | Accepted | D48 |
| [011](011-profile-photo-storage.md) | Profile photo: system picker with no permission; copied on Save, file name stored | Accepted | §1.7, D49 |
| [012](012-leave-guard-registry.md) | Leave-guard registry confirms before leaving a screen with unsaved edits | Accepted | §1.7 |
| [013](013-live-text-size-relayout.md) | Live system text-size changes use a JS re-layout pass | Accepted | D48 |
| [014](014-screen-header-not-appbar.md) | ScreenHeader is a plain-view header copying Paper's layout, not `Appbar.Header` (iOS `Surface` stops the bar growing) | Accepted | D48 |

## Writing a new ADR

1. Copy the layout of an existing record: Status, Context, Decision, Consequences.
2. Number it next in sequence (`NNN-short-title.md`) and add a row above.
3. Never rewrite an Accepted ADR. Supersede it with a new one and change the old Status to `Superseded by NNN`.
4. New owner decisions also go in [../SPEC.md](../SPEC.md).
