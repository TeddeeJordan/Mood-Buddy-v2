import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useProfileRepository } from '@/hooks/useRepositories';
import type { ProfileRepository } from '@/services/db/profileRepository';
import { queryKeys } from '@/services/query/queryKeys';
import {
  deletePickedPhotoCache,
  deletePhoto,
  deletePhotosExcept,
  persistPickedPhoto,
  PickedPhotoUnavailableError,
  sweepPickerCache,
} from '@/services/storage/profilePhotoStorage';
import { clampBio } from '@/utils/profile';

/** True when Save failed because the picked photo's cache file is gone (pick it again). */
export function isPickedPhotoUnavailable(error: unknown): boolean {
  return error instanceof PickedPhotoUnavailableError;
}

/** What Save does with the photo. `replace` carries the picker's (cache) URI. */
export type PhotoChange = { kind: 'keep' } | { kind: 'replace'; pickerUri: string } | { kind: 'remove' };

export interface SaveProfileVariables {
  bio: string;
  photo: PhotoChange;
}

/**
 * Saves the profile:
 * 1. a newly picked photo is copied into the document directory under a new name (B11); if the
 *    picker's cache file is gone this throws `PickedPhotoUnavailableError` before anything is written;
 * 2. bio and the photo file name are written to SQLite;
 * 3. if (2) fails, the new copy is deleted and the error rethrown;
 * 4. on success every other photo file is swept (the replaced or removed one, any orphans), and
 *    the picker's cache folder is swept (`sweepPickerCache(null)`); on failure the picked file is
 *    kept so Save can be retried.
 * Errors are never logged or rethrown with user data; the sweep is best-effort.
 */
export async function saveProfile(repository: ProfileRepository, { bio, photo }: SaveProfileVariables): Promise<void> {
  const current = await repository.getProfile();
  let fileName = current.photo_uri;
  let copied: string | null = null;
  if (photo.kind === 'replace') {
    copied = await persistPickedPhoto(photo.pickerUri);
    fileName = copied;
  } else if (photo.kind === 'remove') {
    fileName = null;
  }
  try {
    await repository.saveProfile({ bio: clampBio(bio), photo_uri: fileName });
  } catch (error) {
    if (copied !== null) {
      try {
        deletePhoto(copied);
      } catch {
        // Left for the next successful save's sweep.
      }
    }
    throw error;
  }
  try {
    deletePhotosExcept(fileName);
  } catch {
    // Best-effort: the next successful save sweeps again.
  }
  // No picked draft remains: drop the picker's cache copy and any other picker leftovers, e.g.
  // Android's pre-crop source copies (best-effort, never throws).
  if (photo.kind === 'replace') deletePickedPhotoCache(photo.pickerUri);
  sweepPickerCache(null);
}

/**
 * The profile save mutation. Cache invalidation lives in the hook-level `onSuccess`, never in
 * per-call `mutate()` callbacks, which TanStack Query skips if the caller has unmounted.
 */
export function useSaveProfileMutation() {
  const repository = useProfileRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: SaveProfileVariables) => saveProfile(repository, variables),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}
