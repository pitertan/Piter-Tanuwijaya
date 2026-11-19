import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateContactForm,
  validateMediaFile,
  sanitizeSvgContent,
  findMediaReferences,
  findOrphanedMedia,
  isValidFirestoreId,
  slugify,
  isValidExternalUrl,
  stripUndefinedKeys,
  isValidNavHref,
  getAnchorElementId,
  MAX_MEDIA_SIZE_BYTES,
} from './validation';
import { DEFAULT_SEED_DATA } from './seedData';

test('validateContactForm rejects empty or invalid inputs and accepts clean submissions', () => {
  const empty = validateContactForm({
    name: '',
    email: 'not-an-email',
    subject: 'A',
    message: 'Too short',
  });
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.name);
  assert.ok(empty.errors.email);
  assert.ok(empty.errors.subject);
  assert.ok(empty.errors.message);

  const valid = validateContactForm({
    name: '  Elena Rostova  ',
    email: 'elena@orbital.io',
    subject: 'Architecture Consultation',
    message: 'We would love to collaborate on our autonomous telemetry dashboard.',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.data?.name, 'Elena Rostova');
});

test('validateMediaFile enforces allowed MIME types and file size bounds', () => {
  assert.equal(validateMediaFile('image/webp', 2048).valid, true);
  assert.equal(validateMediaFile('image/svg+xml', 1024).valid, true);
  assert.equal(validateMediaFile('application/pdf', 1024).valid, false);
  assert.equal(validateMediaFile('image/png', 0).valid, false);
  assert.equal(validateMediaFile('image/jpeg', MAX_MEDIA_SIZE_BYTES + 1).valid, false);
});

test('sanitizeSvgContent strips scripts, event handlers, foreignObject, and javascript URIs', () => {
  const malicious = `
    <svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
      <script>fetch('https://evil.test')</script>
      <foreignObject><div>xss</div></foreignObject>
      <a xlink:href="javascript:alert(2)"><rect width="10" height="10" onclick="evil()"/></a>
      <circle cx="5" cy="5" r="4" fill="#2563EB" />
    </svg>
  `;
  const clean = sanitizeSvgContent(malicious);
  assert.equal(/<script/i.test(clean), false);
  assert.equal(/foreignObject/i.test(clean), false);
  assert.equal(/onload=/i.test(clean), false);
  assert.equal(/onclick=/i.test(clean), false);
  assert.equal(/javascript:/i.test(clean), false);
  assert.ok(clean.includes('<circle cx="5" cy="5" r="4" fill="#2563EB" />'));
});

test('findMediaReferences prevents silent deletion of referenced images and detects orphans', () => {
  const heroMediaId = DEFAULT_SEED_DATA.hero.portraitMediaId;
  const heroRefs = findMediaReferences(heroMediaId, DEFAULT_SEED_DATA);
  assert.ok(heroRefs.length >= 1);
  assert.ok(heroRefs.some((r) => r.entityType === 'Hero Section'));

  const snapshotWithOrphan = {
    ...DEFAULT_SEED_DATA,
    mediaLibrary: [
      ...DEFAULT_SEED_DATA.mediaLibrary,
      {
        id: 'orphan-media-1',
        title: 'Unused Test Asset',
        altText: 'Unused image',
        description: '',
        category: 'General',
        url: '/uploads/unused.webp',
        thumbnailUrl: '/uploads/unused.webp',
        mimeType: 'image/webp' as const,
        sizeBytes: 1200,
        width: 800,
        height: 600,
        filename: 'unused.webp',
        createdBy: 'admin',
      },
    ],
  };

  const orphans = findOrphanedMedia(snapshotWithOrphan.mediaLibrary, snapshotWithOrphan);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].id, 'orphan-media-1');
});

test('ID, slug, and URL validators guard against injection and malformed paths', () => {
  assert.equal(isValidFirestoreId('project-orbital-1'), true);
  assert.equal(isValidFirestoreId('bad/id/with/slashes'), false);
  assert.equal(isValidFirestoreId('x'.repeat(200)), false);
  assert.equal(slugify('Autonomous Drone Telemetry v2!'), 'autonomous-drone-telemetry-v2');
  assert.equal(isValidExternalUrl('https://github.com/pitertanuwijaya'), true);
  assert.equal(isValidExternalUrl('javascript:alert(1)'), false);
});

test('DEFAULT_SEED_DATA uses Piter Tanuwijaya branding across site and profile fields', () => {
  assert.equal(DEFAULT_SEED_DATA.profile.fullName, 'Piter Tanuwijaya');
  assert.equal(DEFAULT_SEED_DATA.siteSettings.brandWordmark, 'Piter Tanuwijaya');
  assert.ok(DEFAULT_SEED_DATA.siteSettings.siteName.startsWith('Piter Tanuwijaya'));
  assert.ok(DEFAULT_SEED_DATA.seo.siteTitle.startsWith('Piter Tanuwijaya'));
  assert.ok(DEFAULT_SEED_DATA.footer.copyrightText.includes('Piter Tanuwijaya'));
  const serialized = JSON.stringify(DEFAULT_SEED_DATA);
  assert.equal(/julian\s+mercer/i.test(serialized), false);
});

test('stripUndefinedKeys omits undefined values while preserving valid falsy values', () => {
  const cleaned = stripUndefinedKeys({
    title: 'Portrait',
    isPublished: false,
    sortOrder: 0,
    description: '',
    createdAt: undefined,
  });
  assert.deepEqual(cleaned, {
    title: 'Portrait',
    isPublished: false,
    sortOrder: 0,
    description: '',
  });
  assert.equal('createdAt' in cleaned, false);
});

test('isValidNavHref and getAnchorElementId prevent invalid CSS selector crashes', () => {
  assert.equal(isValidNavHref('#projects'), true);
  assert.equal(isValidNavHref('https://github.com/pitertan'), true);
  assert.equal(isValidNavHref('#'), false);
  assert.equal(isValidNavHref(''), false);
  assert.equal(isValidNavHref('#bad selector with spaces'), false);
  assert.equal(getAnchorElementId('#projects'), 'projects');
  assert.equal(getAnchorElementId('#'), null);
  assert.equal(getAnchorElementId('https://example.com'), null);
});
