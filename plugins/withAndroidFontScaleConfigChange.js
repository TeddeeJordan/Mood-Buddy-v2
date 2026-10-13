// @ts-check
// Expo config plugin (CNG): MainActivity handles a system font-size change itself instead of
// being recreated, so in-memory screen state (e.g. the Home check-in draft) survives it.
// React Native 0.86 applies the new font scale in place: ReactHostImpl.onConfigurationChanged
// re-reads the display metrics and re-lays out every surface with the new fontScale
// (feature flag enableFontScaleChangesUpdatingLayout, on by default), and TextInputs re-apply
// their text attributes.
//
// `density` is deliberately NOT added: a display-size change also changes density-dependent
// pixel values that are converted once when views mount, so it keeps the default recreation.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const FONT_SCALE_CONFIG_CHANGES = ['fontScale'];

/**
 * Pure helper: adds each missing value to MainActivity's `android:configChanges`, keeping the
 * existing values and their order. Returns the same manifest object (mutated).
 *
 * @param {import('expo/config-plugins').AndroidConfig.Manifest.AndroidManifest} androidManifest
 * @param {readonly string[]} changes
 */
function addMainActivityConfigChanges(androidManifest, changes) {
  const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
  const current = (mainActivity.$['android:configChanges'] ?? '')
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);
  const merged = [...current, ...changes.filter((value) => !current.includes(value))];
  mainActivity.$['android:configChanges'] = merged.join('|');
  return androidManifest;
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withAndroidFontScaleConfigChange = (config) =>
  withAndroidManifest(config, (mod) => {
    addMainActivityConfigChanges(mod.modResults, FONT_SCALE_CONFIG_CHANGES);
    return mod;
  });

module.exports = withAndroidFontScaleConfigChange;
module.exports.addMainActivityConfigChanges = addMainActivityConfigChanges;
module.exports.FONT_SCALE_CONFIG_CHANGES = FONT_SCALE_CONFIG_CHANGES;
