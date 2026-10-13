import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useEntriesRepository } from '@/hooks/useRepositories';
import { queryKeys } from '@/services/query/queryKeys';
import type { NewMoodEntry } from '@/types/db';

export interface CheckInVariables {
  entry: NewMoodEntry;
  prompt: string;
}

/**
 * Saves a check-in (entry + diary prompt, one transaction). Cache invalidation lives in the
 * hook-level `onSuccess`, never in per-call `mutate()` callbacks, which TanStack Query skips if
 * the caller has unmounted. Today's reminder cancel (§3.6) will hook in here (Notifications milestone).
 */
export function useCheckInMutation() {
  const repository = useEntriesRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entry, prompt }: CheckInVariables) => repository.insertEntryWithPrompt(entry, prompt),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.entries.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all }),
      ]);
    },
  });
}
