import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCachedSnapshot } from './cache';
import { DEFAULT_SEED_DATA } from './seedData';

test('parseCachedSnapshot returns null for invalid JSON or missing required objects', () => {
  assert.equal(parseCachedSnapshot(null, DEFAULT_SEED_DATA), null);
  assert.equal(parseCachedSnapshot('{broken', DEFAULT_SEED_DATA), null);
  assert.equal(parseCachedSnapshot('{"profile":null}', DEFAULT_SEED_DATA), null);
});

test('parseCachedSnapshot repairs missing or non-array collections from fallback seed data', () => {
  const malformedCache = JSON.stringify({
    profile: { fullName: 'Cached Name' },
    hero: { headline: 'Cached Headline', metrics: 'not-an-array' },
    about: { summary: 'Cached Summary', expertiseAreas: null },
    sections: null,
    navigation: 'invalid',
    socialLinks: 123,
    projects: undefined,
    mediaLibrary: [],
  });

  const parsed = parseCachedSnapshot(malformedCache, DEFAULT_SEED_DATA);
  assert.ok(parsed);
  assert.equal(parsed.profile.fullName, 'Cached Name');
  assert.equal(parsed.hero.headline, 'Cached Headline');
  assert.ok(Array.isArray(parsed.hero.metrics));
  assert.equal(parsed.hero.metrics.length, DEFAULT_SEED_DATA.hero.metrics.length);
  assert.ok(Array.isArray(parsed.about.expertiseAreas));
  assert.ok(Array.isArray(parsed.sections));
  assert.equal(parsed.sections.length, DEFAULT_SEED_DATA.sections.length);
  assert.ok(Array.isArray(parsed.navigation));
  assert.ok(Array.isArray(parsed.socialLinks));
  assert.ok(Array.isArray(parsed.projects));
});
