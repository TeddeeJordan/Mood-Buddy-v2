import { Directory, File } from 'expo-file-system';

import {
  deleteAllProfilePhotos,
  deletePhoto,
  deletePhotosExcept,
  deletePickedPhotoCache,
  isPickerCacheUri,
  isSafePhotoFileName,
  newPhotoFileName,
  persistPickedPhoto,
  photoExtension,
  PickedPhotoUnavailableError,
  pickerCacheKeepName,
  resolvePhotoUri,
  sweepPickerCache,
} from '@/services/storage/profilePhotoStorage';
import { fileSystemMock } from '@/tests/helpers/fileSystemMock';

const fsMock = fileSystemMock();

const PROFILE_DIR = 'file:///data/document/profile';
const PICKER_DIR = 'file:///data/cache/ImagePicker';

function makeProfileDir() {
  new Directory(PROFILE_DIR).create({ intermediates: true });
}
function makePickerDir() {
  new Directory(PICKER_DIR).create({ intermediates: true });
}

beforeEach(() => {
  fsMock.__resetFileSystem();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('isSafePhotoFileName', () => {
  it('accepts names the module generates', () => {
    expect(isSafePhotoFileName(newPhotoFileName('file:///x/a.png', 1700000000000))).toBe(true);
    expect(isSafePhotoFileName('photo-lx3k2a-8f3k1q.jpg')).toBe(true);
  });

  it.each(['../evil.jpg', 'a/b.jpg', '..', '', 'noextension', 'a b.jpg', '.jpg', 'a..jpg/..'])('rejects %p', (name) => {
    expect(isSafePhotoFileName(name)).toBe(false);
  });
});

describe('photoExtension', () => {
  it.each(['jpg', 'jpeg', 'png', 'heic', 'webp'])('keeps the known extension %s', (ext) => {
    expect(photoExtension(`file:///c/ImagePicker/a.${ext}`)).toBe(ext);
  });

  it('folds the case', () => {
    expect(photoExtension('file:///c/a.PNG')).toBe('png');
  });

  it('strips a query string and a fragment', () => {
    expect(photoExtension('file:///c/a.webp?size=1')).toBe('webp');
    expect(photoExtension('file:///c/a.heic#frag')).toBe('heic');
  });

  it('falls back to jpg for an unknown or missing extension', () => {
    expect(photoExtension('file:///c/a.gif')).toBe('jpg');
    expect(photoExtension('file:///c/a')).toBe('jpg');
    expect(photoExtension('')).toBe('jpg');
  });
});

describe('newPhotoFileName', () => {
  it('has the photo-<time>-<random>.<ext> format', () => {
    expect(newPhotoFileName('file:///c/a.png', 1700000000000)).toMatch(/^photo-[a-z0-9]+-[a-z0-9]{8}\.png$/);
  });

  it('uses the injected time', () => {
    expect(newPhotoFileName('x.jpg', 36 * 36).startsWith('photo-100-')).toBe(true);
  });

  it('is unique across calls with the same time', () => {
    const names = new Set(Array.from({ length: 50 }, () => newPhotoFileName('x.jpg', 5)));
    expect(names.size).toBe(50);
  });

  it('defaults to the current time', () => {
    jest.spyOn(Date, 'now').mockReturnValue(36 * 36 * 36);
    expect(newPhotoFileName('x.jpg').startsWith('photo-1000-')).toBe(true);
  });
});

describe('persistPickedPhoto', () => {
  it('copies the picked file into <document>/profile/ and returns the new name', async () => {
    fsMock.__addFile('file:///data/cache/ImagePicker/abc.png');
    const name = await persistPickedPhoto('file:///data/cache/ImagePicker/abc.png');
    expect(name).toMatch(/^photo-.+\.png$/);
    expect(fsMock.__listFiles()).toContain(`${PROFILE_DIR}/${name}`);
    // The picker's own copy is not removed here.
    expect(fsMock.__listFiles()).toContain('file:///data/cache/ImagePicker/abc.png');
  });

  it('creates the folder if needed and works when it already exists', async () => {
    fsMock.__addFile('file:///data/cache/ImagePicker/abc.jpg');
    const first = await persistPickedPhoto('file:///data/cache/ImagePicker/abc.jpg');
    const second = await persistPickedPhoto('file:///data/cache/ImagePicker/abc.jpg');
    expect(second).not.toBe(first);
    expect(new Directory(PROFILE_DIR).list()).toHaveLength(2);
  });

  it('throws PickedPhotoUnavailableError when the source file is gone, writing nothing', async () => {
    await expect(persistPickedPhoto('file:///data/cache/ImagePicker/gone.jpg')).rejects.toBeInstanceOf(
      PickedPhotoUnavailableError,
    );
    expect(fsMock.__listFiles()).toEqual([]);
    expect(new Directory(PROFILE_DIR).exists).toBe(false);
  });

  it('carries no path or user data in the error', async () => {
    const error = await persistPickedPhoto('file:///data/cache/ImagePicker/secret-name.jpg').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PickedPhotoUnavailableError);
    const { message, name } = error as Error;
    expect(name).toBe('PickedPhotoUnavailableError');
    expect(message).not.toContain('secret-name');
    expect(message).not.toContain('file:');
    expect(message).not.toContain('/');
  });
});

describe('resolvePhotoUri', () => {
  it('returns null for null', () => {
    expect(resolvePhotoUri(null)).toBeNull();
  });

  it('returns null for an unsafe name even if the file exists', () => {
    fsMock.__addFile('file:///data/document/evil.jpg');
    expect(resolvePhotoUri('../evil.jpg')).toBeNull();
  });

  it('returns null when the file is missing', () => {
    makeProfileDir();
    expect(resolvePhotoUri('photo-a-b.jpg')).toBeNull();
  });

  it('returns the file URI when it exists', () => {
    makeProfileDir();
    fsMock.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    expect(resolvePhotoUri('photo-a-b.jpg')).toBe(`${PROFILE_DIR}/photo-a-b.jpg`);
  });
});

describe('deletePhoto', () => {
  it('deletes an existing photo', () => {
    makeProfileDir();
    fsMock.__addFile(`${PROFILE_DIR}/photo-a-b.jpg`);
    deletePhoto('photo-a-b.jpg');
    expect(fsMock.__listFiles()).toEqual([]);
  });

  it('ignores a missing file', () => {
    makeProfileDir();
    expect(() => deletePhoto('photo-a-b.jpg')).not.toThrow();
  });

  it('ignores an unsafe name and touches nothing', () => {
    fsMock.__addFile('file:///data/document/keep.jpg');
    deletePhoto('../keep.jpg');
    deletePhoto('');
    expect(fsMock.__listFiles()).toEqual(['file:///data/document/keep.jpg']);
  });
});

describe('deletePhotosExcept / deleteAllProfilePhotos', () => {
  it('keeps only the named file', () => {
    makeProfileDir();
    fsMock.__addFile(`${PROFILE_DIR}/photo-keep-1.jpg`);
    fsMock.__addFile(`${PROFILE_DIR}/photo-old-2.jpg`);
    fsMock.__addFile(`${PROFILE_DIR}/photo-old-3.png`);
    deletePhotosExcept('photo-keep-1.jpg');
    expect(fsMock.__listFiles()).toEqual([`${PROFILE_DIR}/photo-keep-1.jpg`]);
  });

  it('deletes everything when keep is null', () => {
    makeProfileDir();
    fsMock.__addFile(`${PROFILE_DIR}/photo-a-1.jpg`);
    deletePhotosExcept(null);
    expect(fsMock.__listFiles()).toEqual([]);
  });

  it('is fine when the folder does not exist', () => {
    expect(() => deletePhotosExcept('photo-a-1.jpg')).not.toThrow();
  });

  it('leaves subfolders untouched', () => {
    makeProfileDir();
    new Directory(PROFILE_DIR, 'sub').create();
    fsMock.__addFile(`${PROFILE_DIR}/sub/inner.jpg`);
    fsMock.__addFile(`${PROFILE_DIR}/photo-a-1.jpg`);
    deletePhotosExcept(null);
    expect(new Directory(PROFILE_DIR, 'sub').exists).toBe(true);
    expect(fsMock.__listFiles()).toEqual([`${PROFILE_DIR}/sub/inner.jpg`]);
  });

  it('deleteAllProfilePhotos removes every photo file', () => {
    makeProfileDir();
    fsMock.__addFile(`${PROFILE_DIR}/photo-a-1.jpg`);
    fsMock.__addFile(`${PROFILE_DIR}/photo-b-2.jpg`);
    deleteAllProfilePhotos();
    expect(fsMock.__listFiles()).toEqual([]);
  });
});

describe('isPickerCacheUri', () => {
  it('accepts a file directly inside <cache>/ImagePicker/', () => {
    expect(isPickerCacheUri(`${PICKER_DIR}/4F2A-91.jpg`)).toBe(true);
  });

  it.each([
    ['nested', `${PICKER_DIR}/sub/a.jpg`],
    ['parent traversal', `${PICKER_DIR}/../a.jpg`],
    ['another cache folder', 'file:///data/cache/Other/a.jpg'],
    ['the cache root', 'file:///data/cache/a.jpg'],
    ['content uri', 'content://media/external/images/1'],
    ['https uri', 'https://example.com/ImagePicker/a.jpg'],
    ['a stored profile photo', `${PROFILE_DIR}/photo-a-1.jpg`],
    ['a query string', `${PICKER_DIR}/a.jpg?x=1`],
    ['the folder itself', `${PICKER_DIR}/`],
  ])('rejects %s', (_label, uri) => {
    expect(isPickerCacheUri(uri)).toBe(false);
  });
});

describe('pickerCacheKeepName', () => {
  it('is null for null', () => {
    expect(pickerCacheKeepName(null)).toBeNull();
  });

  it('is the file name for a picker cache URI', () => {
    expect(pickerCacheKeepName(`${PICKER_DIR}/abc-1.jpg`)).toBe('abc-1.jpg');
  });

  it('is null when the parent folder is not ImagePicker', () => {
    expect(pickerCacheKeepName('file:///data/cache/Other/abc.jpg')).toBeNull();
    expect(pickerCacheKeepName('abc.jpg')).toBeNull();
  });

  it('still matches when the prefix differs (/private/var vs /var)', () => {
    expect(pickerCacheKeepName('file:///private/var/mobile/Caches/ImagePicker/abc.jpg')).toBe('abc.jpg');
    expect(pickerCacheKeepName('file:///var/mobile/Caches/ImagePicker/abc.jpg')).toBe('abc.jpg');
  });

  it('decodes a percent-encoded name', () => {
    expect(pickerCacheKeepName(`${PICKER_DIR}/abc%2D1.jpg`)).toBe('abc-1.jpg');
  });

  it('returns null for a malformed % escape instead of throwing', () => {
    expect(pickerCacheKeepName(`${PICKER_DIR}/abc%E0%A4%A.jpg`)).toBeNull();
  });

  it('strips a query string and a fragment', () => {
    expect(pickerCacheKeepName(`${PICKER_DIR}/abc.jpg?x=1`)).toBe('abc.jpg');
    expect(pickerCacheKeepName(`${PICKER_DIR}/abc.jpg#frag`)).toBe('abc.jpg');
  });

  it('is null for a name that is not picker-style', () => {
    expect(pickerCacheKeepName(`${PICKER_DIR}/my photo.jpg`)).toBeNull();
    expect(pickerCacheKeepName(`${PICKER_DIR}/under_score.jpg`)).toBeNull();
  });
});

describe('sweepPickerCache', () => {
  it('deletes every picker-named file except the kept one', () => {
    makePickerDir();
    fsMock.__addFile(`${PICKER_DIR}/keep-1.jpg`);
    fsMock.__addFile(`${PICKER_DIR}/other-2.jpg`);
    fsMock.__addFile(`${PICKER_DIR}/other-3.png`);
    sweepPickerCache(`${PICKER_DIR}/keep-1.jpg`);
    expect(fsMock.__listFiles()).toEqual([`${PICKER_DIR}/keep-1.jpg`]);
  });

  it('deletes all picker files when nothing is kept', () => {
    makePickerDir();
    fsMock.__addFile(`${PICKER_DIR}/a-1.jpg`);
    sweepPickerCache(null);
    expect(fsMock.__listFiles()).toEqual([]);
  });

  it('keeps the draft when the kept URI has a different prefix', () => {
    makePickerDir();
    fsMock.__addFile(`${PICKER_DIR}/keep-1.jpg`);
    sweepPickerCache('file:///private/var/Caches/ImagePicker/keep-1.jpg');
    expect(fsMock.__listFiles()).toEqual([`${PICKER_DIR}/keep-1.jpg`]);
  });

  it('never touches subfolders, non-matching names, other cache folders or the profile folder', () => {
    makePickerDir();
    new Directory(PICKER_DIR, 'sub').create();
    fsMock.__addFile(`${PICKER_DIR}/sub/inner.jpg`);
    fsMock.__addFile(`${PICKER_DIR}/not a match.jpg`);
    new Directory('file:///data/cache/Other').create();
    fsMock.__addFile('file:///data/cache/Other/a-1.jpg');
    makeProfileDir();
    fsMock.__addFile(`${PROFILE_DIR}/photo-a-1.jpg`);
    fsMock.__addFile(`${PICKER_DIR}/gone-1.jpg`);
    sweepPickerCache(null);
    expect(fsMock.__listFiles()).toEqual(
      [
        `${PICKER_DIR}/sub/inner.jpg`,
        `${PICKER_DIR}/not a match.jpg`,
        'file:///data/cache/Other/a-1.jpg',
        `${PROFILE_DIR}/photo-a-1.jpg`,
      ].sort(),
    );
    expect(new Directory(PICKER_DIR, 'sub').exists).toBe(true);
  });

  it('is fine when the folder does not exist', () => {
    expect(() => sweepPickerCache(null)).not.toThrow();
  });

  it('never throws when list() throws', () => {
    makePickerDir();
    jest.spyOn(Directory.prototype, 'list').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => sweepPickerCache(null)).not.toThrow();
  });

  it('continues after a failed delete and never throws', () => {
    makePickerDir();
    fsMock.__addFile(`${PICKER_DIR}/a-1.jpg`);
    fsMock.__addFile(`${PICKER_DIR}/b-2.jpg`);
    fsMock.__addFile(`${PICKER_DIR}/c-3.jpg`);
    const original = File.prototype.delete;
    let calls = 0;
    jest.spyOn(File.prototype, 'delete').mockImplementation(function (this: File) {
      calls += 1;
      if (calls === 1) throw new Error('locked');
      original.call(this);
    });
    expect(() => sweepPickerCache(null)).not.toThrow();
    expect(calls).toBe(3);
    expect(fsMock.__listFiles()).toHaveLength(1);
  });
});

describe('deletePickedPhotoCache', () => {
  it('deletes a picker cache file', () => {
    makePickerDir();
    fsMock.__addFile(`${PICKER_DIR}/a-1.jpg`);
    deletePickedPhotoCache(`${PICKER_DIR}/a-1.jpg`);
    expect(fsMock.__listFiles()).toEqual([]);
  });

  it('ignores a picker URI whose file is already gone', () => {
    expect(() => deletePickedPhotoCache(`${PICKER_DIR}/a-1.jpg`)).not.toThrow();
  });

  it('never deletes a URI isPickerCacheUri rejects', () => {
    makeProfileDir();
    fsMock.__addFile(`${PROFILE_DIR}/photo-a-1.jpg`);
    fsMock.__addFile('file:///data/cache/other.jpg');
    deletePickedPhotoCache(`${PROFILE_DIR}/photo-a-1.jpg`);
    deletePickedPhotoCache('file:///data/cache/other.jpg');
    deletePickedPhotoCache('content://media/1');
    expect(fsMock.__listFiles()).toHaveLength(2);
  });

  it('never throws when the delete fails', () => {
    makePickerDir();
    fsMock.__addFile(`${PICKER_DIR}/a-1.jpg`);
    jest.spyOn(File.prototype, 'delete').mockImplementation(() => {
      throw new Error('locked');
    });
    expect(() => deletePickedPhotoCache(`${PICKER_DIR}/a-1.jpg`)).not.toThrow();
  });
});
