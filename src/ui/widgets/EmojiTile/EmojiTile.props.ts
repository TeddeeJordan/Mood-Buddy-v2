import { StyleSheet } from 'react-native';

import type { Metric, ScaleOption, ScaleValue } from '@/constants/scales';
import { MIN_TOUCH_TARGET } from '@/constants/touchTarget';
import type { AppTheme } from '@/themes/paperTheme';

export interface EmojiTileProps {
  /** The row's metric; makes the test ID unique across rows (`emoji-tile-{metric}-{value}`). */
  metric: Metric;
  option: ScaleOption;
  selected: boolean;
  /** Receives the option's stored value, never the tile's position. */
  onSelect: (value: ScaleValue) => void;
}

/**
 * Labels are single words on one line that shrink to fit (never a mid-word break); cap growth so
 * 5 tiles still fit a phone row (R2).
 */
export const TILE_LABEL_MAX_FONT_SCALE = 1.5;
/**
 * Smallest shrink for a label that doesn't fit, as a fraction of the (text-size-scaled) font size.
 * At the default text size the labels are labelSmall (11) without tracking, and every label fits
 * a 390–402pt phone (~62–65pt of label width); the longest is "Stressfree" (~56pt at 11). At the
 * 1.5 cap (16.5) it needs about 0.75 (about 0.7 on a 375pt phone), so the floor no longer binds on
 * supported phones; it stays as a safety margin against an ellipsis on narrower layouts. On iOS
 * this is `minimumScaleFactor`. On Android,
 * `adjustsFontSizeToFit` also shrinks to fit under the New Architecture, but it ignores
 * `minimumFontScale` and stops at a 4dp floor.
 */
export const TILE_LABEL_MIN_FONT_SCALE = 0.55;
/** The emoji is the tile's main visual; cap growth so it never clips in a narrow tile. */
export const TILE_EMOJI_MAX_FONT_SCALE = 1.2;
/** Decorative check badge; small and tucked in the corner so it clears the (round) emoji glyph. */
export const TILE_BADGE_SIZE = 12;

const SELECTED_BORDER = 2;
const UNSELECTED_BORDER = 1;
const BORDER_DELTA = SELECTED_BORDER - UNSELECTED_BORDER;
const PADDING_VERTICAL = 4;
// Kept small so the longest label ("Stressfree") has as much width as possible.
const PADDING_HORIZONTAL = 2;

export const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      minWidth: MIN_TOUCH_TARGET,
      minHeight: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.roundness * 3,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: UNSELECTED_BORDER,
      borderColor: theme.colors.outline,
      // Keeps content in place when the border thickens on selection.
      paddingVertical: PADDING_VERTICAL + BORDER_DELTA,
      paddingHorizontal: PADDING_HORIZONTAL + BORDER_DELTA,
    },
    tileSelected: {
      backgroundColor: theme.colors.primaryContainer,
      borderWidth: SELECTED_BORDER,
      borderColor: theme.colors.primaryUi,
      paddingVertical: PADDING_VERTICAL,
      paddingHorizontal: PADDING_HORIZONTAL,
    },
    emoji: { fontSize: 28, lineHeight: 36 },
    // Same weight in both states and no tracking (labelSmall adds 0.5, ~5pt over "Stressfree"),
    // so labels keep their full size at the default text size. Selection is shown by the fill,
    // border and check badge.
    label: { alignSelf: 'stretch', color: theme.colors.onSurface, textAlign: 'center', letterSpacing: 0 },
    labelSelected: { color: theme.colors.onPrimaryContainer },
    badge: { position: 'absolute', top: 1, right: 1 },
  });
