import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchProfile, useProfileQuery } from '@/hooks/useProfileQuery';
import { useProfileRepository } from '@/hooks/useRepositories';
import type { ProfileRepository } from '@/services/db/profileRepository';
import { queryKeys } from '@/services/query/queryKeys';
import { fileSystemMock } from '@/tests/helpers/fileSystemMock';
import { makeProviders } from '@/tests/helpers/renderWithProviders';

jest.mock('@/hooks/useRepositories');

const fs = fileSystemMock();
const PROFILE_DIR = 'file:///data/document/profile';

function repoReturning(row: { bio: string; photo_uri: string | null }) {
  return {
    getProfile: jest.fn(async () => ({ id: 1 as const, ...row })),
    saveProfile: jest.fn(),
    resetProfile: jest.fn(),
  } satisfies ProfileRepository;
}

beforeEach(() => {
  fs.__resetFileSystem();
});

describe('fetchProfile', () => {
  it('maps the bio and resolves the photo name to a file URI', async () => {
    fs.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    // The mock needs the folder for list(), but resolving only needs the file to exist.
    const data = await fetchProfile(repoReturning({ bio: 'hello', photo_uri: 'photo-a-b.jpg' }));
    expect(data).toEqual({ bio: 'hello', photoUri: `${PROFILE_DIR}/photo-a-b.jpg` });
  });

  it('gives a null photo when the file is missing', async () => {
    const data = await fetchProfile(repoReturning({ bio: 'hello', photo_uri: 'photo-a-b.jpg' }));
    expect(data).toEqual({ bio: 'hello', photoUri: null });
  });

  it('gives a null photo when there is none', async () => {
    expect((await fetchProfile(repoReturning({ bio: '', photo_uri: null }))).photoUri).toBeNull();
  });
});

describe('useProfileQuery', () => {
  it('loads the profile under queryKeys.profile()', async () => {
    jest.mocked(useProfileRepository).mockReturnValue(repoReturning({ bio: 'bio text', photo_uri: null }));
    const { queryClient, Wrapper } = makeProviders();
    const { result } = await renderHook(() => useProfileQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ bio: 'bio text', photoUri: null });
    expect(queryClient.getQueryData(queryKeys.profile())).toEqual({ bio: 'bio text', photoUri: null });
  });

  it('reports an error when the repository fails', async () => {
    jest.mocked(useProfileRepository).mockReturnValue({
      getProfile: jest.fn(async () => {
        throw new Error('db');
      }),
      saveProfile: jest.fn(),
      resetProfile: jest.fn(),
    });
    const { queryClient, Wrapper } = makeProviders();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    const { result } = await renderHook(() => useProfileQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
