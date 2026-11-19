import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDriveImageUrls,
  extractDriveFileId,
  getDriveFallbackImageUrl,
  PORTFOLIO_DRIVE_FOLDER_NAME,
} from './googleDrive';

test('buildDriveImageUrls generates compact public URLs within Firestore limits', () => {
  const urls = buildDriveImageUrls('1AbCDefGhIjKlMnOpQrStUvWxYz123456');
  assert.equal(
    urls.url,
    'https://lh3.googleusercontent.com/d/1AbCDefGhIjKlMnOpQrStUvWxYz123456=w1600'
  );
  assert.equal(
    urls.thumbnailUrl,
    'https://lh3.googleusercontent.com/d/1AbCDefGhIjKlMnOpQrStUvWxYz123456=w480'
  );
  assert.equal(
    urls.fallbackUrl,
    'https://drive.google.com/thumbnail?id=1AbCDefGhIjKlMnOpQrStUvWxYz123456&sz=w1600'
  );
  assert.ok(urls.url.length < 600);
  assert.ok(PORTFOLIO_DRIVE_FOLDER_NAME.length > 0);
});

test('extractDriveFileId recognizes Google Drive and lh3 image URLs', () => {
  assert.equal(
    extractDriveFileId('https://lh3.googleusercontent.com/d/1AbC_xyz-99=w1600'),
    '1AbC_xyz-99'
  );
  assert.equal(
    extractDriveFileId('https://drive.google.com/thumbnail?id=1AbC_xyz-99&sz=w1600'),
    '1AbC_xyz-99'
  );
  assert.equal(
    extractDriveFileId('https://drive.google.com/file/d/1AbC_xyz-99/view?usp=sharing'),
    '1AbC_xyz-99'
  );
  assert.equal(extractDriveFileId('/uploads/local.jpg'), null);
  assert.equal(extractDriveFileId('https://example.com/photo.jpg'), null);
});

test('getDriveFallbackImageUrl switches between lh3 and drive thumbnail URLs', () => {
  assert.equal(
    getDriveFallbackImageUrl('https://lh3.googleusercontent.com/d/1AbC_xyz-99=w1600'),
    'https://drive.google.com/thumbnail?id=1AbC_xyz-99&sz=w1600'
  );
  assert.equal(
    getDriveFallbackImageUrl('https://drive.google.com/thumbnail?id=1AbC_xyz-99&sz=w1600'),
    'https://lh3.googleusercontent.com/d/1AbC_xyz-99=w1600'
  );
  assert.equal(getDriveFallbackImageUrl('https://example.com/photo.jpg'), null);
});
