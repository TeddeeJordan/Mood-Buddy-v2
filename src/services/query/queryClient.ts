import { QueryClient } from '@tanstack/react-query';

/**
 * Creates the app's QueryClient. Call once (AppProviders keeps it at module scope).
 * Local SQLite reads go through Query too, so inserts/deletes refresh Diary, Dashboard
 * and the streak by invalidating keys (B4). Per-query overrides belong with each feature.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1 },
      mutations: { retry: 0 },
    },
  });
}
