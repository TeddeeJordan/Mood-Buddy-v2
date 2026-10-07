type SecureStoreMock = typeof import('../__mocks__/expo-secure-store');

/**
 * The manual mock instance that app code receives for `expo-secure-store`.
 * Uses plain `require` on purpose: under jest-expo 57, `jest.requireMock` returns a
 * separate instance from the one app modules import.
 */
export function secureStoreMock(): SecureStoreMock {
  return require('expo-secure-store') as SecureStoreMock;
}
