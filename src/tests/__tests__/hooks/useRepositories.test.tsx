import { renderHook } from '@testing-library/react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { useEntriesRepository, useProfileRepository } from '@/hooks/useRepositories';

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }));

describe('useEntriesRepository', () => {
  it('binds a repository to the SQLite connection and keeps it stable across renders', async () => {
    const runAsync = jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 }));
    jest.mocked(useSQLiteContext).mockReturnValue({ runAsync } as never);
    const { result, rerender } = await renderHook(() => useEntriesRepository());
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
    await result.current.deleteEntry(5);
    expect(runAsync).toHaveBeenCalledWith('DELETE FROM mood_entries WHERE id = ?', 5);
  });
});

describe('useProfileRepository', () => {
  it('binds a repository to the SQLite connection and keeps it stable across renders', async () => {
    const getFirstAsync = jest.fn(async () => ({ bio: 'b', photo_uri: null }));
    jest.mocked(useSQLiteContext).mockReturnValue({ getFirstAsync } as never);
    const { result, rerender } = await renderHook(() => useProfileRepository());
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
    await expect(result.current.getProfile()).resolves.toEqual({ id: 1, bio: 'b', photo_uri: null });
    expect(getFirstAsync).toHaveBeenCalledWith('SELECT bio, photo_uri FROM profile WHERE id = ?', 1);
  });

  it('creates a new repository when the connection changes', async () => {
    const dbA = { getFirstAsync: jest.fn() };
    const dbB = { getFirstAsync: jest.fn() };
    const mock = jest.mocked(useSQLiteContext).mockReturnValue(dbA as never);
    const { result, rerender } = await renderHook(() => useProfileRepository());
    const first = result.current;
    mock.mockReturnValue(dbB as never);
    await rerender({});
    expect(result.current).not.toBe(first);
  });
});
