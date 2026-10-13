import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCheckInMutation } from '@/hooks/useCheckInMutation';
import { useEntriesRepository } from '@/hooks/useRepositories';
import { queryKeys } from '@/services/query/queryKeys';
import { makeProviders } from '@/tests/helpers/renderWithProviders';
import type { NewMoodEntry } from '@/types/db';

jest.mock('@/hooks/useRepositories');

const entry: NewMoodEntry = {
  timestamp: '2026-10-07T15:30:00.000Z',
  tz_offset_min: 0,
  mood: 3,
  stress: 1,
  stress_note_1: null,
  stress_note_2: null,
  stress_note_3: null,
  anxiety: 1,
  anxiety_note_1: null,
  anxiety_note_2: null,
  anxiety_note_3: null,
};

const insertEntryWithPrompt = jest.fn();

beforeEach(() => {
  insertEntryWithPrompt.mockReset();
  jest.mocked(useEntriesRepository).mockReturnValue({ insertEntryWithPrompt } as never);
});

async function setup() {
  const { queryClient, Wrapper } = makeProviders();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const hook = await renderHook(() => useCheckInMutation(), { wrapper: Wrapper });
  return { ...hook, invalidate };
}

describe('useCheckInMutation', () => {
  it('saves the entry and prompt through the repository', async () => {
    insertEntryWithPrompt.mockResolvedValue({ entryId: 1, promptId: 1 });
    const { result } = await setup();
    await act(async () => {
      await result.current.mutateAsync({ entry, prompt: 'hello' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertEntryWithPrompt).toHaveBeenCalledWith(entry, 'hello');
  });

  it('invalidates the entries and prompts families after a successful save', async () => {
    insertEntryWithPrompt.mockResolvedValue({ entryId: 1, promptId: 1 });
    const { result, invalidate } = await setup();
    await act(async () => {
      await result.current.mutateAsync({ entry, prompt: 'hello' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.entries.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.prompts.all });
  });

  it('does not invalidate anything when the save fails', async () => {
    insertEntryWithPrompt.mockRejectedValue(new Error('disk full'));
    const { result, invalidate } = await setup();
    await act(async () => {
      await expect(result.current.mutateAsync({ entry, prompt: 'hello' })).rejects.toThrow('disk full');
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
