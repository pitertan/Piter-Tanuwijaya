import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRouterBasename,
  isAdminPath,
  resolveAssetUrl,
  resolveHashAdminRedirect,
  shouldShowCmsReturnControl,
} from './routing';

test('isAdminPath matches /admin, trailing slash, and subpaths case-insensitively', () => {
  assert.equal(isAdminPath('/admin'), true);
  assert.equal(isAdminPath('/admin/'), true);
  assert.equal(isAdminPath('/Admin'), true);
  assert.equal(isAdminPath('/admin/projects'), true);
  assert.equal(isAdminPath('/'), false);
  assert.equal(isAdminPath('/administrator'), false);
});

test('resolveHashAdminRedirect detects #/admin routes', () => {
  assert.equal(resolveHashAdminRedirect('#/admin'), '/admin');
  assert.equal(resolveHashAdminRedirect('#/Admin/'), '/admin');
  assert.equal(resolveHashAdminRedirect('#about'), null);
  assert.equal(resolveHashAdminRedirect(''), null);
});

test('shouldShowCmsReturnControl stays hidden for public visitors and shows for admin or CMS session', () => {
  assert.equal(
    shouldShowCmsReturnControl({
      isAdmin: false,
      visitedAdminInSession: false,
      fromAdminState: false,
    }),
    false
  );
  assert.equal(
    shouldShowCmsReturnControl({
      isAdmin: true,
      visitedAdminInSession: false,
    }),
    true
  );
  assert.equal(
    shouldShowCmsReturnControl({
      isAdmin: false,
      visitedAdminInSession: true,
    }),
    true
  );
  assert.equal(
    shouldShowCmsReturnControl({
      isAdmin: false,
      visitedAdminInSession: false,
      fromAdminState: true,
    }),
    true
  );
});

test('getRouterBasename and resolveAssetUrl handle root and GitHub Pages subpaths', () => {
  assert.equal(getRouterBasename('/'), '/');
  assert.equal(getRouterBasename('/my-portfolio/'), '/my-portfolio');
  assert.equal(
    getRouterBasename('./', '/my-portfolio/admin', 'user.github.io'),
    '/my-portfolio'
  );
  assert.equal(
    resolveAssetUrl('/src/assets/images/hero.jpg', '/my-portfolio/'),
    '/my-portfolio/src/assets/images/hero.jpg'
  );
  assert.equal(
    resolveAssetUrl('/src/assets/images/hero.jpg', '/'),
    '/src/assets/images/hero.jpg'
  );
  assert.equal(
    resolveAssetUrl('https://cdn.example.com/photo.jpg', '/my-portfolio/'),
    'https://cdn.example.com/photo.jpg'
  );
});
