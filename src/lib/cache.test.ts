import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SEED_DATA } from './seedData';
import { parseCachedSnapshot, toPublicCacheSnapshot } from './cache';

test('toPublicCacheSnapshot excludes unpublished items and strips timestamps', () => {
  const modified = {
    ...DEFAULT_SEED_DATA,
    hero: {
      ...DEFAULT_SEED_DATA.hero,
      portraitMediaId: 'custom-photo-123',
      updatedAt: { seconds: 100 },
    },
    projects: [
      { ...DEFAULT_SEED_DATA.projects[0], isPublished: true, createdAt: { seconds: 10 } },
      { ...DEFAULT_SEED_DATA.projects[1], isPublished: false },
    ],
  };

  const cached = toPublicCacheSnapshot(modified);
  assert.equal(cached.hero.portraitMediaId, 'custom-photo-123');
  assert.equal('updatedAt' in cached.hero, false);
  assert.equal(cached.projects.length, 1);
  assert.equal('createdAt' in cached.projects[0], false);
});

test('parseCachedSnapshot merges valid JSON and rejects malformed payloads', () => {
  const cached = toPublicCacheSnapshot({
    ...DEFAULT_SEED_DATA,
    hero: {
      ...DEFAULT_SEED_DATA.hero,
      portraitMediaId: 'user-portrait-id',
    },
  });

  const restored = parseCachedSnapshot(JSON.stringify(cached), DEFAULT_SEED_DATA);
  assert.ok(restored);
  assert.equal(restored.hero.portraitMediaId, 'user-portrait-id');

  assert.equal(parseCachedSnapshot(null, DEFAULT_SEED_DATA), null);
  assert.equal(parseCachedSnapshot('{bad-json', DEFAULT_SEED_DATA), null);
  assert.equal(parseCachedSnapshot('{"foo":"bar"}', DEFAULT_SEED_DATA), null);
});
