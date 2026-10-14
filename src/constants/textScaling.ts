/**
 * Text scaling (WCAG 1.4.4). See CLAUDE.md → Theme and accessibility.
 */

/**
 * `maxFontSizeMultiplier` value that removes any cap, so text follows the system size fully.
 * Must be 0 (or null), never `undefined`: react-native-paper 5.15.3 `HelperText` and `TextInput`
 * default it with `const { maxFontSizeMultiplier = 1.5 } = rest`, and `undefined` triggers that
 * default. Re-check those defaults whenever react-native-paper is upgraded.
 */
export const UNCAPPED_FONT_SCALE = 0;

/**
 * After a live font-scale change, the text re-layout pass runs once when the change reaches JS
 * and once more after this delay, so at least one pass lands after the native side has applied
 * the new scale to the surface (Android re-measures it on the next frame after the config
 * change, which can arrive before or after the JS event). See `useFontScaleRelayoutPass`.
 */
export const FONT_SCALE_RELAYOUT_DELAY_MS = 500;
