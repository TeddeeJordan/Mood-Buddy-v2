// In-memory expo-secure-store for Jest.
const store = new Map<string, string>();

export const AFTER_FIRST_UNLOCK = 0;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const ALWAYS = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS_THIS_DEVICE_ONLY = 4;
export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;

export type SecureStoreOptions = { keychainAccessible?: number; keychainService?: string };

export const isAvailableAsync = jest.fn(async () => true);
export const getItemAsync = jest.fn(async (key: string, _options?: SecureStoreOptions) => store.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string, _options?: SecureStoreOptions) => {
  store.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string, _options?: SecureStoreOptions) => {
  store.delete(key);
});
export const getItem = jest.fn((key: string) => store.get(key) ?? null);
export const setItem = jest.fn((key: string, value: string) => {
  store.set(key, value);
});

/** Test helper: empty the store and reset call history. */
export function __resetSecureStore(): void {
  store.clear();
  [isAvailableAsync, getItemAsync, setItemAsync, deleteItemAsync, getItem, setItem].forEach((fn) => fn.mockClear());
}
