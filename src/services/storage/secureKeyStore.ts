import * as SecureStore from 'expo-secure-store';

import { SECURE_KEYS } from '@/constants/storageKeys';

/**
 * Wrapper around the user's Anthropic API key (D2, D15). The key lives in SecureStore only:
 * never in Redux, MMKV, logs or error messages.
 */

const KEY = SECURE_KEYS.anthropicApiKey;
/** Owner-approved: readable only while unlocked, never migrated to another device. */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const EXPECTED_PREFIX = 'sk-ant-';

export type ApiKeyValidation =
  | { ok: true; key: string; missingPrefixWarning: boolean }
  | { ok: false; reason: 'empty' };

export type SaveApiKeyResult = { ok: true; missingPrefixWarning: boolean } | { ok: false; reason: 'empty' };

/** Error type whose message never contains the key value. */
export class SecureKeyStoreError extends Error {
  constructor(operation: 'save' | 'read' | 'check' | 'remove') {
    super(`Secure key store ${operation} failed`);
    this.name = 'SecureKeyStoreError';
  }
}

/** Trims; rejects empty; warns (but allows) a key without the `sk-ant-` prefix. */
export function validateApiKey(raw: string): ApiKeyValidation {
  const key = raw.trim();
  if (key.length === 0) return { ok: false, reason: 'empty' };
  return { ok: true, key, missingPrefixWarning: !key.startsWith(EXPECTED_PREFIX) };
}

export async function saveApiKey(raw: string): Promise<SaveApiKeyResult> {
  const result = validateApiKey(raw);
  if (!result.ok) return result;
  try {
    await SecureStore.setItemAsync(KEY, result.key, OPTIONS);
  } catch {
    // Drop the original error: platform messages could echo the value.
    throw new SecureKeyStoreError('save');
  }
  return { ok: true, missingPrefixWarning: result.missingPrefixWarning };
}

export async function hasApiKey(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(KEY, OPTIONS);
    return value !== null && value.length > 0;
  } catch {
    throw new SecureKeyStoreError('check');
  }
}

/** For the Anthropic service only. Do not call from UI code. */
export async function readApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY, OPTIONS);
  } catch {
    throw new SecureKeyStoreError('read');
  }
}

export async function removeApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY, OPTIONS);
  } catch {
    throw new SecureKeyStoreError('remove');
  }
}
