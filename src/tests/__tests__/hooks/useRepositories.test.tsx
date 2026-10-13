import { renderHook } from '@testing-library/react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { useEntriesRepository } from '@/hooks/useRepositories';

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
