const plugin = require('../../../../plugins/withAndroidFontScaleConfigChange');
const appJson = require('../../../../app.json') as { expo: { plugins: unknown[] } };

type Manifest = { manifest: { application: { activity: { $: Record<string, string>; 'intent-filter'?: unknown[] }[] }[] } };

function manifestWith(configChanges?: string): Manifest {
  const attrs: Record<string, string> = { 'android:name': '.MainActivity' };
  if (configChanges !== undefined) attrs['android:configChanges'] = configChanges;
  return {
    manifest: {
      application: [
        {
          activity: [
            {
              $: attrs,
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

const configChangesOf = (m: Manifest) => m.manifest.application[0].activity[0].$['android:configChanges'];

describe('withAndroidFontScaleConfigChange', () => {
  it('adds fontScale to an existing list, preserving order', () => {
    const m = plugin.addMainActivityConfigChanges(manifestWith('keyboard|keyboardHidden|orientation'), ['fontScale']);
    expect(configChangesOf(m)).toBe('keyboard|keyboardHidden|orientation|fontScale');
  });

  it('does not duplicate a value that is already present', () => {
    const m = plugin.addMainActivityConfigChanges(manifestWith('keyboard|fontScale|orientation'), ['fontScale']);
    expect(configChangesOf(m)).toBe('keyboard|fontScale|orientation');
  });

  it('creates the attribute when absent', () => {
    const m = plugin.addMainActivityConfigChanges(manifestWith(), ['fontScale']);
    expect(configChangesOf(m)).toBe('fontScale');
  });

  it('throws when there is no main activity', () => {
    const empty = { manifest: { application: [{ activity: [] }] } };
    expect(() => plugin.addMainActivityConfigChanges(empty, ['fontScale'])).toThrow();
  });

  it('exports FONT_SCALE_CONFIG_CHANGES as fontScale only', () => {
    expect(plugin.FONT_SCALE_CONFIG_CHANGES).toEqual(['fontScale']);
  });

  it('exports the plugin as a function and registers it in app.json', () => {
    expect(typeof plugin).toBe('function');
    expect(appJson.expo.plugins).toContain('./plugins/withAndroidFontScaleConfigChange');
  });

  describe('exported plugin', () => {
    type ModConfig = { mods: { android: { manifest: (c: { modResults: Manifest }) => Promise<{ modResults: Manifest }> } } };

    const registeredMod = () => {
      const config = plugin({ name: 'test', slug: 'test' }) as unknown as ModConfig;
      return config.mods.android.manifest;
    };

    it('adds fontScale to MainActivity through its withAndroidManifest mod', async () => {
      const modResults = manifestWith('keyboard|orientation');
      const mod = registeredMod();
      const result = await mod({ modResults, modRequest: {}, ...{} } as never);
      expect(configChangesOf(result.modResults)).toBe('keyboard|orientation|fontScale');
    });

    it('is idempotent when applied twice', async () => {
      const modResults = manifestWith('keyboard');
      await registeredMod()({ modResults } as never);
      const second = await registeredMod()({ modResults } as never);
      expect(configChangesOf(second.modResults)).toBe('keyboard|fontScale');
    });
  });
});
