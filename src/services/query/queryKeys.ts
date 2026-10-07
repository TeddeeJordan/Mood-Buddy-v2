import type { LocalDateKey } from '@/types/dates';

/**
 * Every TanStack Query key in one place. Invalidate a whole family with its `all` key,
 * e.g. `queryClient.invalidateQueries({ queryKey: queryKeys.entries.all })`.
 */
export const queryKeys = {
  entries: {
    all: ['entries'] as const,
    range: (start: LocalDateKey, end: LocalDateKey) => ['entries', 'range', start, end] as const,
    localDates: () => ['entries', 'localDates'] as const,
  },
  prompts: {
    all: ['prompts'] as const,
    range: (start: LocalDateKey, end: LocalDateKey) => ['prompts', 'range', start, end] as const,
  },
  profile: () => ['profile'] as const,
  quote: (localDate: LocalDateKey) => ['quote', localDate] as const,
} as const;
