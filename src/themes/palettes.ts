import type { ThemeName } from '@/types/settings';

/**
 * Colour tokens for the three light themes (D6), contrast option C (owner-approved):
 * - `identity` colours are the owner's originals. Use them for large fills and containers,
 *   always with `ON_IDENTITY` (dark) text on top.
 * - `text` variants (same hue, lower HSL lightness) are ≥ 4.5:1 on white and on the theme
 *   background. Use them for coloured text and thin UI (text buttons, outlines, switches, tab tint).
 * - `ui` variants are ≥ 3:1. Use them for graphics and non-text UI only.
 * Ratios are asserted in src/tests/__tests__/themes/contrast.test.ts.
 */

export interface ThemePalette {
  /** Body text. */
  text: string;
  background: string;
  surface: string;
  /**
   * Flat TextInput fill, chips etc. Mixed from white toward `background`, so it is never darker
   * than `background` and every text/UI token that passes on `background` passes here too.
   */
  surfaceVariant: string;
  /** Paper MD3 elevation tints (Dialog = level3, Menu = level2 …), same rule as `surfaceVariant`. */
  elevation: { level1: string; level2: string; level3: string; level4: string; level5: string };
  primary: { identity: string; ui: string; text: string };
  secondary: { identity: string; ui: string; text: string };
  /** Pale accent (old `tertiary`), container use only. */
  tertiaryIdentity: string;
}

/** Dark text for use on identity-coloured fills. */
export const ON_IDENTITY = '#1C1B1F';
export const ON_TEXT_VARIANT = '#FFFFFF';

export const PALETTES: Readonly<Record<ThemeName, ThemePalette>> = {
  lavender: {
    text: '#4D4952',
    background: '#EEEEF8',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F3FA',
    elevation: { level1: '#FBFBFD', level2: '#F7F7FC', level3: '#F5F5FB', level4: '#F2F2FA', level5: '#F0F0F9' },
    primary: { identity: '#C47ED0', ui: '#BB6BC9', text: '#A442B5' },
    secondary: { identity: '#A882CB', ui: '#A077C7', text: '#8753B8' },
    tertiaryIdentity: '#DFBFEC',
  },
  sage: {
    text: '#4D4952',
    background: '#EEEEF5',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F3F8',
    elevation: { level1: '#FBFBFD', level2: '#F7F7FB', level3: '#F5F5F9', level4: '#F2F2F8', level5: '#F0F0F6' },
    primary: { identity: '#8DC48D', ui: '#4F994F', text: '#3F793F' },
    secondary: { identity: '#D4DF8A', ui: '#828F27', text: '#67711F' },
    tertiaryIdentity: '#C4E8C8',
  },
  water: {
    text: '#4D4952',
    background: '#EAEAF5',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F8',
    elevation: { level1: '#FAFAFD', level2: '#F6F6FB', level3: '#F2F2F9', level4: '#EFEFF8', level5: '#ECECF6' },
    primary: { identity: '#4AA8C8', ui: '#3590AF', text: '#2A718A' },
    secondary: { identity: '#5CD4E8', ui: '#1893A8', text: '#137484' },
    tertiaryIdentity: '#8CE0EC',
  },
};

/** Metric colours shared by all themes (they describe the metric, not a direction). */
export const METRIC_COLORS = {
  stress: { identity: '#E07B7B', ui: '#DA6060', text: '#C82F2F' },
  anxiety: { identity: '#7BA8D4', ui: '#4F8BC6', text: '#356DA4' },
} as const;

/** Sampled from frame 0 of the clouds GIF (median sky pixel). Must match app.json's splash colour. */
export const SPLASH_BACKGROUND = '#2885C8';
