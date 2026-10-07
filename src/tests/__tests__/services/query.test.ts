import { QueryClient } from '@tanstack/react-query';

import { createQueryClient } from '@/services/query/queryClient';
import { queryKeys } from '@/services/query/queryKeys';
import type { LocalDateKey } from '@/types/dates';

const a = '2026-10-01' as LocalDateKey;
const b = '2026-10-07' as LocalDateKey;

describe('queryKeys', () => {
  it('builds stable, prefix-matchable keys', () => {
    expect(queryKeys.entries.range(a, b)).toEqual(['entries', 'range', a, b]);
    expect(queryKeys.entries.localDates()).toEqual(['entries', 'localDates']);
    expect(queryKeys.prompts.range(a, b)).toEqual(['prompts', 'range', a, b]);
    expect(queryKeys.profile()).toEqual(['profile']);
    expect(queryKeys.quote(b)).toEqual(['quote', b]);
    expect(queryKeys.entries.range(a, b).slice(0, 1)).toEqual(queryKeys.entries.all);
    expect(queryKeys.prompts.range(a, b).slice(0, 1)).toEqual(queryKeys.prompts.all);
  });

  it('invalidating a family marks every member stale', async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.entries.range(a, b), []);
    client.setQueryData(queryKeys.entries.localDates(), []);
    client.setQueryData(queryKeys.profile(), { bio: '' });
    await client.invalidateQueries({ queryKey: queryKeys.entries.all });
    expect(client.getQueryState(queryKeys.entries.range(a, b))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.entries.localDates())?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.profile())?.isInvalidated).toBe(false);
    client.clear();
  });
});

describe('createQueryClient', () => {
  it('returns a new QueryClient with the app defaults', () => {
    const client = createQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
    expect(client.getDefaultOptions().queries?.retry).toBe(1);
    expect(client.getDefaultOptions().mutations?.retry).toBe(0);
    expect(createQueryClient()).not.toBe(client);
  });
});
