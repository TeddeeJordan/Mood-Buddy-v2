import { SECURE_KEYS } from '@/constants/storageKeys';
import {
  hasApiKey,
  readApiKey,
  removeApiKey,
  saveApiKey,
  SecureKeyStoreError,
  validateApiKey,
} from '@/services/storage/secureKeyStore';
import { secureStoreMock } from '@/tests/helpers/secureStoreMock';

const mock = secureStoreMock();
const SECRET = 'sk-ant-api03-SECRET-VALUE';

beforeEach(() => mock.__resetSecureStore());

describe('validateApiKey', () => {
  it('trims', () => {
    expect(validateApiKey(`  ${SECRET}\n`)).toEqual({ ok: true, key: SECRET, missingPrefixWarning: false });
  });

  it('rejects empty and whitespace-only keys', () => {
    expect(validateApiKey('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateApiKey('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('warns but allows a key without the sk-ant- prefix', () => {
    expect(validateApiKey('abc123')).toEqual({ ok: true, key: 'abc123', missingPrefixWarning: true });
  });
});

describe('save / has / read / remove', () => {
  it('saves the trimmed key with WHEN_UNLOCKED_THIS_DEVICE_ONLY', async () => {
    await expect(saveApiKey(` ${SECRET} `)).resolves.toEqual({ ok: true, missingPrefixWarning: false });
    expect(mock.setItemAsync).toHaveBeenCalledWith(SECURE_KEYS.anthropicApiKey, SECRET, {
      keychainAccessible: mock.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await expect(hasApiKey()).resolves.toBe(true);
    await expect(readApiKey()).resolves.toBe(SECRET);
  });

  it('does not write an empty key', async () => {
    await expect(saveApiKey('  ')).resolves.toEqual({ ok: false, reason: 'empty' });
    expect(mock.setItemAsync).not.toHaveBeenCalled();
    await expect(hasApiKey()).resolves.toBe(false);
  });

  it('reports the prefix warning on save', async () => {
    await expect(saveApiKey('my-key')).resolves.toEqual({ ok: true, missingPrefixWarning: true });
  });

  it('removes the key', async () => {
    await saveApiKey(SECRET);
    await removeApiKey();
    await expect(hasApiKey()).resolves.toBe(false);
    await expect(readApiKey()).resolves.toBeNull();
  });
});

describe('errors never contain the key', () => {
  const leaky = () => Promise.reject(new Error(`native failure for ${SECRET}`));

  it.each([
    ['save', () => {
      mock.setItemAsync.mockImplementationOnce(leaky);
      return saveApiKey(SECRET);
    }],
    ['check', () => {
      mock.getItemAsync.mockImplementationOnce(leaky);
      return hasApiKey();
    }],
    ['read', () => {
      mock.getItemAsync.mockImplementationOnce(leaky);
      return readApiKey();
    }],
    ['remove', () => {
      mock.deleteItemAsync.mockImplementationOnce(leaky);
      return removeApiKey();
    }],
  ])('%s failure', async (op, run) => {
    const error = await run().then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(SecureKeyStoreError);
    expect((error as Error).message).toBe(`Secure key store ${op} failed`);
    expect(String(error)).not.toContain(SECRET);
    expect(JSON.stringify(error)).not.toContain(SECRET);
    expect((error as Error).cause).toBeUndefined();
  });
});
