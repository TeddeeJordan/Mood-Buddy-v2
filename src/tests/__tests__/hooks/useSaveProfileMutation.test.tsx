import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Directory, File } from 'expo-file-system';

import { BIO_LIMIT } from '@/constants/limits';
import { useProfileRepository } from '@/hooks/useRepositories';
import { isPickedPhotoUnavailable, saveProfile, useSaveProfileMutation } from '@/hooks/useSaveProfileMutation';
import type { ProfileRepository } from '@/services/db/profileRepository';
import { queryKeys } from '@/services/query/queryKeys';
import { PickedPhotoUnavailableError } from '@/services/storage/profilePhotoStorage';
import { fileSystemMock } from '@/tests/helpers/fileSystemMock';
import { makeProviders } from '@/tests/helpers/renderWithProviders';

jest.mock('@/hooks/useRepositories');

const fs = fileSystemMock();
const PROFILE_DIR = 'file:///data/document/profile';
const PICKER_DIR = 'file:///data/cache/ImagePicker';
const PICKED = `${PICKER_DIR}/picked-1.jpg`;

function makeRepo(initial: { bio: string; photo_uri: string | null } = { bio: 'old', photo_uri: 'photo-old-1.jpg' }) {
  const saveProfileMock = jest.fn(async (_patch: { bio: string; photo_uri: string | null }) => undefined);
  const repo: ProfileRepository = {
    getProfile: jest.fn(async () => ({ id: 1 as const, ...initial })),
    saveProfile: saveProfileMock,
    resetProfile: jest.fn(async () => undefined),
  };
  return { repo, saveProfileMock };
}

function seedFiles() {
  new Directory(PROFILE_DIR).create({ intermediates: true });
  new Directory(PICKER_DIR).create({ intermediates: true });
  fs.__addFile(`${PROFILE_DIR}/photo-old-1.jpg`);
  fs.__addFile(`${PROFILE_DIR}/photo-orphan-2.jpg`);
  fs.__addFile(PICKED);
  fs.__addFile(`${PICKER_DIR}/precrop-9.jpg`);
}

const profileFiles = () => fs.__listFiles().filter((f) => f.startsWith(PROFILE_DIR));
const pickerFiles = () => fs.__listFiles().filter((f) => f.startsWith(PICKER_DIR));

beforeEach(() => {
  fs.__resetFileSystem();
  seedFiles();
});
afterEach(() => jest.restoreAllMocks());

describe('saveProfile', () => {
  it('keep: writes the bio with the current photo name and sweeps the other photos and the picker cache', async () => {
    const { repo, saveProfileMock } = makeRepo();
    await saveProfile(repo, { bio: 'new bio', photo: { kind: 'keep' } });
    expect(saveProfileMock).toHaveBeenCalledWith({ bio: 'new bio', photo_uri: 'photo-old-1.jpg' });
    expect(profileFiles()).toEqual([`${PROFILE_DIR}/photo-old-1.jpg`]);
    expect(pickerFiles()).toEqual([]);
  });

  it('replace: copies the picked file, stores the new name and removes the old photo and picker files', async () => {
    const { repo, saveProfileMock } = makeRepo();
    await saveProfile(repo, { bio: 'b', photo: { kind: 'replace', pickerUri: PICKED } });
    const written = saveProfileMock.mock.calls[0][0];
    expect(written.photo_uri).toMatch(/^photo-.+\.jpg$/);
    expect(written.photo_uri).not.toBe('photo-old-1.jpg');
    expect(profileFiles()).toEqual([`${PROFILE_DIR}/${written.photo_uri}`]);
    expect(pickerFiles()).toEqual([]);
  });

  it('remove: stores no photo and deletes every photo file', async () => {
    const { repo, saveProfileMock } = makeRepo();
    await saveProfile(repo, { bio: 'b', photo: { kind: 'remove' } });
    expect(saveProfileMock).toHaveBeenCalledWith({ bio: 'b', photo_uri: null });
    expect(profileFiles()).toEqual([]);
  });

  it('replace with the picked cache file gone: throws PickedPhotoUnavailableError and writes nothing', async () => {
    const { repo, saveProfileMock } = makeRepo();
    await expect(
      saveProfile(repo, { bio: 'b', photo: { kind: 'replace', pickerUri: `${PICKER_DIR}/missing-5.jpg` } }),
    ).rejects.toBeInstanceOf(PickedPhotoUnavailableError);
    expect(saveProfileMock).not.toHaveBeenCalled();
    expect(profileFiles()).toContain(`${PROFILE_DIR}/photo-old-1.jpg`);
    expect(profileFiles()).toHaveLength(2);
  });

  it('DB write fails after the copy: deletes the new copy, rethrows, and keeps the picked file and old photo', async () => {
    const { repo, saveProfileMock } = makeRepo();
    const failure = new Error('disk full');
    saveProfileMock.mockRejectedValueOnce(failure);
    await expect(saveProfile(repo, { bio: 'b', photo: { kind: 'replace', pickerUri: PICKED } })).rejects.toBe(failure);
    expect(profileFiles().sort()).toEqual([`${PROFILE_DIR}/photo-old-1.jpg`, `${PROFILE_DIR}/photo-orphan-2.jpg`]);
    expect(pickerFiles()).toContain(PICKED);
  });

  it('DB write fails with keep: rethrows and sweeps nothing', async () => {
    const { repo, saveProfileMock } = makeRepo();
    saveProfileMock.mockRejectedValueOnce(new Error('x'));
    await expect(saveProfile(repo, { bio: 'b', photo: { kind: 'keep' } })).rejects.toThrow('x');
    expect(profileFiles()).toHaveLength(2);
    expect(pickerFiles()).toHaveLength(2);
  });

  it('still rethrows the DB error when deleting the new copy fails', async () => {
    const { repo, saveProfileMock } = makeRepo();
    const failure = new Error('db');
    saveProfileMock.mockRejectedValueOnce(failure);
    jest.spyOn(File.prototype, 'delete').mockImplementation(() => {
      throw new Error('locked');
    });
    await expect(saveProfile(repo, { bio: 'b', photo: { kind: 'replace', pickerUri: PICKED } })).rejects.toBe(failure);
  });

  it('clamps an over-long bio to BIO_LIMIT', async () => {
    const { repo, saveProfileMock } = makeRepo();
    await saveProfile(repo, { bio: 'a'.repeat(BIO_LIMIT + 50), photo: { kind: 'keep' } });
    expect(saveProfileMock.mock.calls[0][0].bio).toHaveLength(BIO_LIMIT);
  });

  it('does not throw when sweeping the old photos fails', async () => {
    const { repo, saveProfileMock } = makeRepo();
    jest.spyOn(Directory.prototype, 'list').mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(saveProfile(repo, { bio: 'b', photo: { kind: 'keep' } })).resolves.toBeUndefined();
    expect(saveProfileMock).toHaveBeenCalledTimes(1);
  });

  it('does not throw when deleting files fails', async () => {
    const { repo } = makeRepo();
    jest.spyOn(File.prototype, 'delete').mockImplementation(() => {
      throw new Error('locked');
    });
    await expect(saveProfile(repo, { bio: 'b', photo: { kind: 'replace', pickerUri: PICKED } })).resolves.toBeUndefined();
  });
});

describe('isPickedPhotoUnavailable', () => {
  it('is true for PickedPhotoUnavailableError only', () => {
    expect(isPickedPhotoUnavailable(new PickedPhotoUnavailableError())).toBe(true);
    expect(isPickedPhotoUnavailable(new Error('Picked photo is no longer available'))).toBe(false);
    expect(isPickedPhotoUnavailable('x')).toBe(false);
    expect(isPickedPhotoUnavailable(null)).toBe(false);
  });
});

describe('useSaveProfileMutation', () => {
  async function setup(repo: ProfileRepository) {
    jest.mocked(useProfileRepository).mockReturnValue(repo);
    const { queryClient, Wrapper } = makeProviders();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const hook = await renderHook(() => useSaveProfileMutation(), { wrapper: Wrapper });
    return { ...hook, invalidate };
  }

  it('saves through the repository and invalidates the profile query', async () => {
    const { repo, saveProfileMock } = makeRepo();
    const { result, invalidate } = await setup(repo);
    await act(async () => {
      await result.current.mutateAsync({ bio: 'hi', photo: { kind: 'keep' } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(saveProfileMock).toHaveBeenCalledWith({ bio: 'hi', photo_uri: 'photo-old-1.jpg' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.profile() });
  });

  it('does not invalidate when the save fails', async () => {
    const { repo, saveProfileMock } = makeRepo();
    saveProfileMock.mockRejectedValueOnce(new Error('x'));
    const { result, invalidate } = await setup(repo);
    await act(async () => {
      await expect(result.current.mutateAsync({ bio: 'hi', photo: { kind: 'keep' } })).rejects.toThrow('x');
    });
    expect(invalidate).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('does not invalidate when the picked photo is unavailable', async () => {
    const { repo } = makeRepo();
    const { result, invalidate } = await setup(repo);
    await act(async () => {
      await expect(
        result.current.mutateAsync({ bio: 'hi', photo: { kind: 'replace', pickerUri: `${PICKER_DIR}/gone-1.jpg` } }),
      ).rejects.toBeInstanceOf(PickedPhotoUnavailableError);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
