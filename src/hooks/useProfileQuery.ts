import { useQuery } from '@tanstack/react-query';

import { useProfileRepository } from '@/hooks/useRepositories';
import type { ProfileRepository } from '@/services/db/profileRepository';
import { queryKeys } from '@/services/query/queryKeys';
import { resolvePhotoUri } from '@/services/storage/profilePhotoStorage';

export interface ProfileData {
  bio: string;
  /** Displayable URI of the stored photo, or null (none, or the file is missing). */
  photoUri: string | null;
}

export async function fetchProfile(repository: ProfileRepository): Promise<ProfileData> {
  const row = await repository.getProfile();
  return { bio: row.bio, photoUri: resolvePhotoUri(row.photo_uri) };
}

/**
 * The profile, from SQLite through TanStack Query. Only this app writes it, and every write
 * invalidates `queryKeys.profile()`, so it never goes stale on its own.
 */
export function useProfileQuery() {
  const repository = useProfileRepository();
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => fetchProfile(repository),
    staleTime: Infinity,
  });
}
