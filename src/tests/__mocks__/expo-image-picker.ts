// expo-image-picker for Jest: the library picker resolves to "canceled" unless a test sets a
// result with `launchImageLibraryAsync.mockResolvedValueOnce(...)`.
export const launchImageLibraryAsync = jest.fn(async (_options?: unknown) => ({ canceled: true, assets: null }));
export const launchCameraAsync = jest.fn(async (_options?: unknown) => ({ canceled: true, assets: null }));
export const getPendingResultAsync = jest.fn(async () => null);
export const requestMediaLibraryPermissionsAsync = jest.fn(async () => ({ granted: true, status: 'granted' }));
export const getMediaLibraryPermissionsAsync = jest.fn(async () => ({ granted: true, status: 'granted' }));
