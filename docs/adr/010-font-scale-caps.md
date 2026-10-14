# ADR 010: Font-scale caps on emoji tiles

**Status:** Accepted (owner-approved exception to WCAG 1.4.4). **Amended** with the Profile feature: the screen-header cap was removed, and implicit library caps are now covered. The history is in the Amendment section below.

## Context

WCAG 1.4.4 (Resize Text) expects text to scale to 200% without loss of content. One place cannot grow that far on a phone:

- **Emoji tiles.** Each check-in row shows 5 tiles side by side (D48, SPEC §3.1), so each tile gets about a fifth of the screen width. Unbounded system text sizes make the single-word labels (longest: "Stressfree") and the emoji clip or wrap mid-word.

## Decision

Cap `maxFontSizeMultiplier` below 2.0 in these places only:

- Tile labels: `TILE_LABEL_MAX_FONT_SCALE = 1.5` (`src/ui/widgets/EmojiTile/EmojiTile.props.ts`). Labels also shrink to fit on one line (`TILE_LABEL_MIN_FONT_SCALE`).
- Tile emoji: `TILE_EMOJI_MAX_FONT_SCALE = 1.2` (same file).

The owner accepted this as an exception to WCAG 1.4.4.

**Implicit library caps count as caps.** react-native-paper 5.15.3 defaults `maxFontSizeMultiplier` to 1.5 on `HelperText` and `TextInput`, `labelMaxFontSizeMultiplier` to 1.5 on `Checkbox.Item`, `titleMaxFontSizeMultiplier` to 1.5 on `Menu.Item`, and `BottomNavigation` to 1. Components that can show such text must pass `UNCAPPED_FONT_SCALE` (`0`, `src/constants/textScaling.ts`). Pass `0`, never `undefined`: `undefined` triggers the library default. ESLint enforces this (`eslint.config.js`: missing prop on `HelperText`, `TextInput`, `Checkbox.Item`, `Menu.Item`, and `undefined` as a value). It matches plain JSX names only, so a props spread still needs the explicit attribute. Re-check the list on every Paper upgrade.

Every other text follows the system size with no cap.

## Consequences

- At the largest system text sizes, tile labels and emoji stop growing at 150% / 120%. They never clip or break mid-word.
- Each tile's meaning is still available at any size through its word-only accessibility label (screen readers) and the row's end labels, which are not capped.
- Any new cap below 2.0 needs its own ADR (or an update to this one while it is current), per the CLAUDE.md accessibility conventions. Re-check the caps if the tile layout changes.
- Live text-size changes: [ADR 013](013-live-text-size-relayout.md).

## Amendment (Profile feature)

- The header title cap (`HEADER_TITLE_MAX_FONT_SCALE = 1.5`) was **removed**. The title is a wrapping, uncapped `Text` and the bar grows with it (`minHeight: 64`, no `height`). `height: 'auto'` on Paper's `Appbar.Header` was not enough: on iOS, Paper's `Surface` moves any `height` to an outer view and sets `flex: 1` on the inner row, so the bar never grew and large titles clipped. `ScreenHeader` is therefore a plain-view header that copies Paper's layout; see [ADR 014](014-screen-header-not-appbar.md). This ADR originally recorded the header cap as a second exception.
- Profile's Bio input no longer uses Paper's floating label (Paper sizes it with fixed constants, so it clipped at the largest sizes once the 1.5 cap was gone). A visible "Bio" `Text` sits above the input instead, with the same text as the input's `accessibilityLabel`. Convention in [CLAUDE.md](../../CLAUDE.md): no floating labels on text inputs.
- The original statement "every other text keeps the platform default" was inaccurate: Paper's implicit 1.5 caps on `HelperText` and `TextInput` (and the others listed above) applied silently. They are now removed explicitly and checked by ESLint.
