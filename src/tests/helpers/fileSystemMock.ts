type FileSystemMock = typeof import('../__mocks__/expo-file-system');

/**
 * The in-memory `expo-file-system` mock instance that app code receives (with `__resetFileSystem`,
 * `__addFile`, `__listFiles`). Plain `require`, not `jest.requireMock`: under jest-expo 57 the
 * latter returns a separate instance (same as `secureStoreMock`).
 */
export function fileSystemMock(): FileSystemMock {
  return require('expo-file-system') as FileSystemMock;
}
