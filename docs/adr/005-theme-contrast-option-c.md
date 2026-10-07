# 005. Theme contrast: option C

**Status:** Accepted (owner-approved). Spec: D6 (three themes, light only), SPEC §5.6 (contrast problems), Rev 6 verification-log row "theme surfaces".

## Context

The owner's identity colours fail WCAG on white (SPEC §5.6). Contrast ratios on white:

| Token | Colour | Ratio |
|---|---|---|
| Primary lavender | `#C47ED0` | 2.90:1 |
| Primary sage | `#8DC48D` | 2.02:1 |
| Primary water | `#4AA8C8` | 2.72:1 |
| Secondary lavender | `#A882CB` | 3.12:1 |
| Secondary sage | `#D4DF8A` | 1.43:1 |
| Secondary water | `#5CD4E8` | 1.74:1 |
| Chart bar stress | `#E07B7B` | 2.88:1 |
| Chart bar anxiety | `#7BA8D4` | 2.50:1 |

Text needs 4.5:1 (WCAG 1.4.3) and UI components and graphics need 3:1 (WCAG 1.4.11). Four options were considered during planning; the owner chose option C (the label used in the code and CLAUDE.md).

### Options considered

- **A. Keep the colours as they are.** Fails WCAG 1.4.3 (text) and 1.4.11 (UI components). Rejected.
- **B. Darken the primaries everywhere**, with white text on the 4.5:1 variants. Passes, but visibly changes the palette identity, most of all for sage (`#8DC48D` becomes `#3F793F`). Rejected.
- **C. Identity colours become containers; deeper same-hue shades carry text and thin UI.** Chosen (see Decision).
- **D. Like C, but keep white text on identity colours for large or bold text only** (the 3:1 rule). Lavender fails even that (2.90:1), so the rules would differ per theme. Rejected.

## Decision

- Identity colours are used as **containers and fills** (`primaryContainer`, `secondaryContainer`, `tertiaryContainer`) with dark `ON_IDENTITY` text on top.
- Deeper, same-hue shades carry **text and thin UI**: Paper's `primary`, `secondary` and `tertiary` are the >= 4.5:1 text variants.
- **Graphics and chart bars** use >= 3:1 `*Ui` tokens (`primaryUi`, `secondaryUi`, `stressBar`, `anxietyBar`).
- `surfaceVariant` and `elevation.level1-5` are per-palette tints never darker than `background` (`level0` stays transparent).
- **Review fix:** Paper's default `surfaceVariant` and `elevation.*` are purple-tinted. They made `primary` text fail on Dialog and TextInput surfaces (4.04-4.35:1). Each palette therefore defines its own `surfaceVariant` and `elevation.level1-5`, mixed from white toward `background`.
- Tokens live in `src/themes/palettes.ts`, are assembled in `src/themes/paperTheme.ts` (`buildPaperTheme`) and read with `useAppTheme()`.
- `src/tests/__tests__/themes/contrast.test.ts` asserts every text token >= 4.5:1 and every UI token >= 3:1 on `background`, `surface`, `surfaceVariant` and each opaque elevation level, plus each `on*`/container pair. Add new tokens there.

## Consequences

- Text on identity-coloured fills is dark (`#1C1B1F`, at least 5.9:1 on all three primaries) instead of white.
- All tokens are assembled in one place (`buildPaperTheme`), so the approach can be revisited there. There is no runtime flag.
- Identity colours appear as large soft shapes, not as text or icon colour, so some screens look less saturated than the old app.
- Selected state also needs a non-colour cue (WCAG 1.4.1): filled icons and a bordered active drawer item, because the `secondaryContainer` pill is below 3:1 on white.
- Disabled colours, `outlineVariant`, `backdrop`, `shadow` and `scrim` are not asserted.
