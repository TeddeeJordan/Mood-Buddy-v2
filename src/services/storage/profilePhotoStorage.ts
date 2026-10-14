import { Directory, File, Paths } from 'expo-file-system';

import { PROFILE_PHOTO_DIR } from '@/constants/dataLocations';

/**
 * Profile photo files (B11, D49). The picker returns a purgeable cache file, so Save copies it
 * into `<document directory>/profile/` under a new unique name (a new name per save also keeps
 * expo-image from showing a stale cached image). The database stores only that file name: the
 * absolute container path changes across iOS app updates. Nothing here runs at import time.
 *
 * Paths and errors are never logged: file names are harmless, but callers treat the photo as
 * user data and discard errors.
 */

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic', 'webp']);
/** Only names this module generates are accepted (no separators, no `..`). */
const SAFE_FILE_NAME = /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;

function photoDirectory(): Directory {
  return new Directory(Paths.document, PROFILE_PHOTO_DIR);
}

export function isSafePhotoFileName(fileName: string): boolean {
  return SAFE_FILE_NAME.test(fileName);
}

/** Extension of the picked file if it is a known image type, otherwise `jpg`. */
export function photoExtension(pickerUri: string): string {
  const match = /\.([A-Za-z0-9]+)(?:[?#].*)?$/.exec(pickerUri);
  const ext = match?.[1]?.toLowerCase();
  return ext !== undefined && IMAGE_EXTENSIONS.has(ext) ? ext : 'jpg';
}

/** A new, unique photo file name, e.g. `photo-lx3k2a-8f3k1q.jpg`. */
export function newPhotoFileName(pickerUri: string, now: number = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `photo-${now.toString(36)}-${random}.${photoExtension(pickerUri)}`;
}

/**
 * The picked (cache) file is gone, e.g. the OS purged the cache between Pick and Save.
 * Carries no path or other user data, so callers can tell it apart and ask for a new pick.
 */
export class PickedPhotoUnavailableError extends Error {
  constructor() {
    super('Picked photo is no longer available');
    this.name = 'PickedPhotoUnavailableError';
  }
}

/**
 * Copies the picked image into the photo directory and returns the new file name.
 * Throws `PickedPhotoUnavailableError` if the picked file no longer exists.
 */
export async function persistPickedPhoto(pickerUri: string): Promise<string> {
  if (!new File(pickerUri).exists) throw new PickedPhotoUnavailableError();
  const directory = photoDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const fileName = newPhotoFileName(pickerUri);
  await new File(pickerUri).copy(new File(directory, fileName));
  return fileName;
}

/** The displayable URI of a stored photo, or null if there is none or the file is missing. */
export function resolvePhotoUri(fileName: string | null): string | null {
  if (fileName === null || !isSafePhotoFileName(fileName)) return null;
  const file = new File(photoDirectory(), fileName);
  return file.exists ? file.uri : null;
}

/** Deletes one photo file if it exists (e.g. a fresh copy whose database write failed). */
export function deletePhoto(fileName: string): void {
  if (!isSafePhotoFileName(fileName)) return;
  const file = new File(photoDirectory(), fileName);
  if (file.exists) file.delete();
}

/** Sweep: deletes every file in the photo directory except `keep` (the current photo, if any). */
export function deletePhotosExcept(keep: string | null): void {
  const directory = photoDirectory();
  if (!directory.exists) return;
  for (const entry of directory.list()) {
    if (entry instanceof File && entry.name !== keep) entry.delete();
  }
}

/** expo-image-picker writes its results to `<cache directory>/ImagePicker/<uuid>.<ext>` (iOS and Android). */
const PICKER_CACHE_DIR = 'ImagePicker';
/** A picker result's file name: no separators, no `..`, no query or fragment. */
const PICKER_FILE_NAME = /^[A-Za-z0-9-]+\.[A-Za-z0-9]+$/;

/**
 * True only for a file directly inside the picker's cache folder. Anything else (another folder,
 * a stored photo, a `content://` or remote URI, a path with `..`) is rejected.
 */
export function isPickerCacheUri(uri: string): boolean {
  const base = pickerCacheBaseUri();
  return uri.startsWith(base) && PICKER_FILE_NAME.test(uri.slice(base.length));
}

function pickerCacheBaseUri(): string {
  return `${Paths.cache.uri.replace(/\/+$/, '')}/${PICKER_CACHE_DIR}/`;
}

/**
 * The file name a sweep must keep for `keepUri`: its last path segment (percent-decoded when
 * possible) if the segment before it is the picker's cache folder and the name is picker-style.
 * Matching by name rather than by the full prefix means a `/private/var` vs `/var` or encoding
 * difference in the URI can't make the sweep delete the draft still in use. Keeping a file is the
 * safe direction, so this is deliberately looser than `isPickerCacheUri`, which guards deletion.
 */
export function pickerCacheKeepName(keepUri: string | null): string | null {
  if (keepUri === null) return null;
  const segments = keepUri.replace(/[?#].*$/, '').split('/');
  const rawName = segments.at(-1);
  const folder = segments.at(-2);
  if (rawName === undefined || folder !== PICKER_CACHE_DIR) return null;
  let name = rawName;
  try {
    name = decodeURIComponent(rawName);
  } catch {
    // Malformed escape: compare the raw segment.
  }
  return PICKER_FILE_NAME.test(name) ? name : null;
}

/**
 * Best-effort privacy sweep of the picker's cache folder. Besides the cropped result (the asset
 * URI), expo-image-picker on Android also leaves a pre-crop source copy there for every pick,
 * and a crop that is cancelled leaves its source copy too; nothing returns those URIs to JS.
 * So after Save, Cancel, Discard, leaving, a replace or a remove, every file directly inside
 * `<cache>/ImagePicker/` is deleted except `keepUri` (the picked draft still in use, if any;
 * pass null when no picked draft remains). Harmless on iOS, which writes only the result there.
 * `keepUri` is matched by file name (`pickerCacheKeepName`), not by its full path.
 *
 * This owns the whole `<cache>/ImagePicker/` folder app-wide: any future picker feature (e.g. chat
 * attachments) must coordinate with it, or its files are swept too.
 *
 * Only regular files directly in that folder with a picker-style name are touched: subfolders,
 * other cache folders and the document `profile/` folder never are. Never throws and never logs
 * (file paths are user data). Don't call it while the picker is open: it may still be writing.
 */
export function sweepPickerCache(keepUri: string | null): void {
  try {
    const directory = new Directory(Paths.cache, PICKER_CACHE_DIR);
    if (!directory.exists) return;
    const keepName = pickerCacheKeepName(keepUri);
    for (const entry of directory.list()) {
      if (!(entry instanceof File) || !PICKER_FILE_NAME.test(entry.name) || entry.name === keepName) continue;
      try {
        entry.delete();
      } catch {
        // Keep sweeping the rest; the OS purges the cache folder eventually anyway.
      }
    }
  } catch {
    // Best-effort, like deletePickedPhotoCache.
  }
}

/**
 * Best-effort privacy cleanup: deletes the picker's cache copy of a picked photo once the app no
 * longer needs it (saved, replaced, removed or discarded). Only a file `isPickerCacheUri` accepts
 * is touched. Never throws and never logs (the URI is a user file path).
 */
export function deletePickedPhotoCache(pickerUri: string): void {
  try {
    if (!isPickerCacheUri(pickerUri)) return;
    const file = new File(pickerUri);
    if (file.exists) file.delete();
  } catch {
    // The OS purges the cache folder eventually anyway.
  }
}

/** Delete-all (D30): removes every profile photo file. */
export function deleteAllProfilePhotos(): void {
  deletePhotosExcept(null);
}
