import { createProfileRepository, EMPTY_PROFILE, mapProfileRow } from '@/services/db/profileRepository';
import { migrateDbIfNeeded } from '@/services/db/migrations';
import { NodeSqliteAdapter } from '@/tests/helpers/nodeSqliteAdapter';

let db: NodeSqliteAdapter;

beforeEach(async () => {
  db = new NodeSqliteAdapter();
  await migrateDbIfNeeded(db);
});

afterEach(() => db.close());

describe('profileRepository', () => {
  it('reads the seeded row as an empty profile', async () => {
    expect(await createProfileRepository(db).getProfile()).toEqual({ id: 1, bio: '', photo_uri: null });
  });

  it('reads a seeded row with data', async () => {
    await db.runAsync('UPDATE profile SET bio = ?, photo_uri = ? WHERE id = 1', 'hello', 'photo-a-b.jpg');
    expect(await createProfileRepository(db).getProfile()).toEqual({ id: 1, bio: 'hello', photo_uri: 'photo-a-b.jpg' });
  });

  it('returns EMPTY_PROFILE when the row is missing', async () => {
    await db.runAsync('DELETE FROM profile');
    expect(await createProfileRepository(db).getProfile()).toBe(EMPTY_PROFILE);
  });

  it('saveProfile updates the existing row', async () => {
    const repo = createProfileRepository(db);
    await repo.saveProfile({ bio: 'new bio', photo_uri: 'photo-x-y.png' });
    expect(await repo.getProfile()).toEqual({ id: 1, bio: 'new bio', photo_uri: 'photo-x-y.png' });
    expect(await db.getAllAsync('SELECT id FROM profile')).toHaveLength(1);
  });

  it('saveProfile inserts the row when it is missing (upsert)', async () => {
    await db.runAsync('DELETE FROM profile');
    const repo = createProfileRepository(db);
    await repo.saveProfile({ bio: 'inserted', photo_uri: null });
    expect(await repo.getProfile()).toEqual({ id: 1, bio: 'inserted', photo_uri: null });
    expect(await db.getAllAsync('SELECT id FROM profile')).toEqual([{ id: 1 }]);
  });

  it('saveProfile replaces a photo with null', async () => {
    const repo = createProfileRepository(db);
    await repo.saveProfile({ bio: 'b', photo_uri: 'photo-a-b.jpg' });
    await repo.saveProfile({ bio: 'b', photo_uri: null });
    expect((await repo.getProfile()).photo_uri).toBeNull();
  });

  it('binds the bio as a parameter: quotes and SQL-like text round-trip and the table survives', async () => {
    const repo = createProfileRepository(db);
    const bio = `it's "quoted"; DROP TABLE profile; -- ' OR 1=1 --\n100% ? :name $x`;
    await repo.saveProfile({ bio, photo_uri: null });
    expect((await repo.getProfile()).bio).toBe(bio);
    expect(await db.getAllAsync('SELECT id FROM profile')).toHaveLength(1);
  });

  it('binds every parameter (no values inlined in the statement)', async () => {
    await createProfileRepository(db).saveProfile({ bio: 'SECRET-BIO', photo_uri: 'SECRET-PHOTO.jpg' });
    const statement = db.log.at(-1)?.sql ?? '';
    expect(statement).not.toContain('SECRET');
  });

  it('resetProfile empties the bio and removes the photo', async () => {
    const repo = createProfileRepository(db);
    await repo.saveProfile({ bio: 'bio', photo_uri: 'photo-a-b.jpg' });
    await repo.resetProfile();
    expect(await repo.getProfile()).toEqual({ id: 1, bio: '', photo_uri: null });
  });
});

describe('mapProfileRow', () => {
  it('maps a null row to EMPTY_PROFILE', () => {
    expect(mapProfileRow(null)).toBe(EMPTY_PROFILE);
  });

  it('maps valid strings through', () => {
    expect(mapProfileRow({ bio: 'x', photo_uri: 'photo-a-b.jpg' })).toEqual({ id: 1, bio: 'x', photo_uri: 'photo-a-b.jpg' });
  });

  it('maps non-string values defensively', () => {
    expect(mapProfileRow({ bio: 42, photo_uri: 7 })).toEqual({ id: 1, bio: '', photo_uri: null });
    expect(mapProfileRow({ bio: null, photo_uri: null })).toEqual({ id: 1, bio: '', photo_uri: null });
    expect(mapProfileRow({ bio: undefined, photo_uri: {} })).toEqual({ id: 1, bio: '', photo_uri: null });
  });

  it('maps an empty photo string to null but keeps an empty bio', () => {
    expect(mapProfileRow({ bio: '', photo_uri: '' })).toEqual({ id: 1, bio: '', photo_uri: null });
  });
});
