// Jest stub for react-native-nitro-modules.
// The real package looks up its TurboModule at import time, which fails under Jest.
// react-native-mmkv 4 returns its own in-memory mock when it detects Jest, so Nitro is
// never actually called; any call here means a test is reaching real native code.
export const NitroModules = {
  createHybridObject: (name: string): never => {
    throw new Error(`NitroModules.createHybridObject('${name}') called in Jest; add a mock for it.`);
  },
};
