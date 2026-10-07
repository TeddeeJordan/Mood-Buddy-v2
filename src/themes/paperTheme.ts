import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

import type { ThemeName } from '@/types/settings';

import { METRIC_COLORS, ON_IDENTITY, ON_TEXT_VARIANT, PALETTES } from './palettes';

/** App-specific colour tokens added to Paper's MD3 colours. */
export interface AppColorTokens {
  /** ≥ 3:1 accents for graphics and non-text UI. */
  primaryUi: string;
  secondaryUi: string;
  /** Chart bars (≥ 3:1) and metric text (≥ 4.5:1). */
  stressBar: string;
  anxietyBar: string;
  stressText: string;
  anxietyText: string;
}

export type AppTheme = MD3Theme & { colors: MD3Theme['colors'] & AppColorTokens };

/** Builds the Paper MD3 light theme for a palette using contrast option C. */
export function buildPaperTheme(name: ThemeName): AppTheme {
  const p = PALETTES[name];
  return {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      // Paper uses `primary` for text buttons, focused outlines, switches and the active tab tint.
      primary: p.primary.text,
      onPrimary: ON_TEXT_VARIANT,
      primaryContainer: p.primary.identity,
      onPrimaryContainer: ON_IDENTITY,
      secondary: p.secondary.text,
      onSecondary: ON_TEXT_VARIANT,
      secondaryContainer: p.secondary.identity,
      onSecondaryContainer: ON_IDENTITY,
      tertiary: p.secondary.text,
      onTertiary: ON_TEXT_VARIANT,
      tertiaryContainer: p.tertiaryIdentity,
      onTertiaryContainer: ON_IDENTITY,
      background: p.background,
      onBackground: p.text,
      surface: p.surface,
      surfaceVariant: p.surfaceVariant,
      // level0 stays transparent (Paper's default): it shows whatever is underneath.
      elevation: { level0: 'transparent', ...p.elevation },
      onSurface: p.text,
      onSurfaceVariant: p.text,
      outline: p.primary.ui,
      primaryUi: p.primary.ui,
      secondaryUi: p.secondary.ui,
      stressBar: METRIC_COLORS.stress.ui,
      anxietyBar: METRIC_COLORS.anxiety.ui,
      stressText: METRIC_COLORS.stress.text,
      anxietyText: METRIC_COLORS.anxiety.text,
    },
  };
}
