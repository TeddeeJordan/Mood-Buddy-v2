import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { FONT_SCALE_RELAYOUT_DELAY_MS } from '@/constants/textScaling';

/**
 * Live font-scale changes (system text size changed while the app runs).
 *
 * Why: React Native 0.86 re-measures text natively when the scale changes (iOS: `RCTFabricSurface`
 * on `UIContentSizeCategoryDidChangeNotification` → `SurfaceHandler::constraintLayout` →
 * `dirtyMeasurableNodes`; Android: `ReactHostImpl.onConfigurationChanged` → `requestLayout`, behind
 * the `enableFontScaleChangesUpdatingLayout` feature flag). That pass is a native-only commit, though: React keeps its own shadow nodes, which still hold the layout
 * measured at the old scale, and the next React commit (e.g. the re-render the dimensions event
 * itself causes) reuses them. Boxes then keep their old size while the glyphs use the new one:
 * clipped titles and labels when the text grows, oversized boxes when it shrinks.
 *
 * The fix is a JS re-layout pass: React must re-render every text node with a changed prop, which
 * makes the new shadow nodes re-measure (a Paragraph/TextInput clone with new props is dirtied).
 * `withTextRelayoutPass` (src/themes/paperTheme.ts) turns this hook's pass number into such a
 * prop on every Paper font, so nothing is remounted and drafts, focus and scroll positions stay.
 *
 * Returns a number that changes once when the font scale reaches JS (`useWindowDimensions`, i.e.
 * `Dimensions` 'change': iOS RCTDeviceInfo on the content-size multiplier change; Android
 * DeviceInfoModule.onHostResume, when the app comes back from Settings) and once more after
 * `FONT_SCALE_RELAYOUT_DELAY_MS`. It is 0 until the first change. Each change is a separate
 * render, so consecutive passes alternate parity.
 */
export function useFontScaleRelayoutPass(): number {
  const { fontScale } = useWindowDimensions();
  const [seenFontScale, setSeenFontScale] = useState(fontScale);
  const [changes, setChanges] = useState(0);
  const [latePasses, setLatePasses] = useState(0);

  // Adjusting state while rendering (React's documented pattern for reacting to a changed value):
  // the pass starts in the same render that sees the new scale.
  if (seenFontScale !== fontScale) {
    setSeenFontScale(fontScale);
    setChanges((count) => count + 1);
  }

  useEffect(() => {
    if (changes === 0) return undefined;
    const timer = setTimeout(() => setLatePasses((count) => count + 1), FONT_SCALE_RELAYOUT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [changes]);

  return changes + latePasses;
}
