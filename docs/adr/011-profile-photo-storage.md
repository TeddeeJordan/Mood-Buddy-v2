# ADR 011: Profile photo without a photo-library permission

**Status:** Accepted. Spec: §1.7 (Profile), D14, D30, D49 (related: [ADR 006](006-no-backup.md)). Owner decisions Q1 (no permission), Q2 (Remove photo), Q7 (no `expo-image-manipulator`).

## Context

SPEC §1.7 (the old app) asked for photo-library permission before picking a picture. The v57 `expo-image-picker` docs say no permission is needed to launch the image library:

- iOS: `UIImagePickerController` (used with `allowsEditing`) runs outside the app and needs no access since iOS 11.
- Android: the system Photo Picker (`PickVisualMedia`) needs no permission.

The picker returns a purgeable cache file, and an absolute file path stored in the database breaks after an iOS app update or reinstall (the container path changes).

## Decision

- Do not call `requestMediaLibraryPermissionsAsync`, and drop the old "Permission needed" alert.
- Configure the `expo-image-picker` plugin in `app.json` with `photosPermission`, `cameraPermission` and `microphonePermission` all `false`, so iOS gets no usage strings. On Android, `CAMERA` is added to `blockedPermissions` next to `RECORD_AUDIO`; `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` stay blocked.
- Pick with `mediaTypes: 'images'`, `allowsEditing: true`, `aspect: [1, 1]`, `quality: 0.8`, `exif: false` (`PICKER_OPTIONS` in `useProfileScreen.ts`).
- No `expo-image-manipulator`: full-size square crops at quality 0.8 are accepted.
- On **Save**, copy the picked file into `<document directory>/profile/<unique name>` (`src/services/storage/profilePhotoStorage.ts`) and store **only the file name** in `profile.photo_uri`. A new name per save also avoids a stale `expo-image` cache. If the database write fails, delete the new copy; after a successful write, sweep every other file in the folder.
- The folder is inside `Documents` (iOS) / `files` (Android), so the backup rules apply (D49, ADR 006). Nothing new is added to `modules/no-backup`.
- After Save, Cancel, Discard, replace, remove and leaving, `sweepPickerCache` deletes the files in `<cache>/ImagePicker/` (Android also writes a pre-crop source copy there).

## Consequences

- No permission prompt, and the app cannot read the library beyond what the user picks.
- Revisit if video or camera capture is added.
- If App Store Connect rejects a build with ITMS-90683 "Missing purpose string", the fallback is to re-add short, honest `photosPermission` / `cameraPermission` strings (never shown to the user).
- `exif: false` only controls what is returned to JS (`asset.exif`). It does **not** strip metadata from the saved file, so GPS tags may remain. Risk is low: the copy is local, not backed up (D49) and never exported (D14). Stripping would need `expo-image-manipulator`, which the owner declined.
- Delete-all (D30) can remove the photos with `deleteAllProfilePhotos()`; wiring it up is part of that future feature.
- The plugin and `CAMERA` block need `npx expo prebuild --clean` and a new development build.
