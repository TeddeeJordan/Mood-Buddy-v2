import { SECURE_KEYS } from '@/constants/storageKeys';
import { runFirstInstallCleanup } from '@/services/storage/firstRun';
import { storage } from '@/services/storage/mmkv';
import { readInstallInitialized, writeInstallInitialized } from '@/services/storage/settingsStorage';
import { hasApiKey } from '@/services/storage/secureKeyStore';
import { secureStoreMock } from '@/tests/helpers/secureStoreMock';

const mock = secureStoreMock();

beforeEach(() => {
  storage.clearAll();
  mock.__resetSecureStore();
});

describe('runFirstInstallCleanup', () => {
  it('deletes an orphaned key, then sets the flag, when the flag is absent', async () => {
    await mock.setItemAsync(SECURE_KEYS.anthropicApiKey, 'sk-ant-orphan');
    const setSpy = jest.spyOn(storage, 'set');
    await expect(runFirstInstallCleanup()).resolves.toBe(true);
    expect(mock.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(mock.deleteItemAsync.mock.calls[0][0]).toBe(SECURE_KEYS.anthropicApiKey);
    // Delete happens before the flag is written.
    expect(mock.deleteItemAsync.mock.invocationCallOrder[0]).toBeLessThan(setSpy.mock.invocationCallOrder[0]);
    expect(readInstallInitialized()).toBe(true);
    await expect(hasApiKey()).resolves.toBe(false);
    setSpy.mockRestore();
  });

  it('does nothing when the flag is present', async () => {
    writeInstallInitialized(true);
    await mock.setItemAsync(SECURE_KEYS.anthropicApiKey, 'sk-ant-kept');
    await expect(runFirstInstallCleanup()).resolves.toBe(false);
    expect(mock.deleteItemAsync).not.toHaveBeenCalled();
    await expect(hasApiKey()).resolves.toBe(true);
  });

  it('leaves the flag unset when the delete fails, so it retries next launch', async () => {
    mock.deleteItemAsync.mockImplementationOnce(() => Promise.reject(new Error('keychain locked')));
    await expect(runFirstInstallCleanup()).rejects.toThrow();
    expect(readInstallInitialized()).toBe(false);
  });
});
