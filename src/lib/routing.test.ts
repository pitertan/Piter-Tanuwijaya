import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRouterBasename,
  getSafeBrowserBasename,
  isAdminPath,
  normalizeViteBase,
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

test('normalizeViteBase resolves GitHub Pages project subpath, user site, custom domain, and relative builds', () => {
  assert.equal(normalizeViteBase(undefined, 'true', 'pitertan/portfolio'), '/portfolio/');
  assert.equal(normalizeViteBase(undefined, 'true', 'pitertan/pitertan.github.io'), '/');
  assert.equal(normalizeViteBase('/', 'true', 'pitertan/portfolio'), '/');
  assert.equal(normalizeViteBase('//', 'true', 'pitertan/portfolio'), '/');
  assert.equal(normalizeViteBase('/portfolio', 'true', 'pitertan/portfolio'), '/portfolio/');
  assert.equal(normalizeViteBase('portfolio', 'true', 'pitertan/portfolio'), '/portfolio/');
  assert.equal(normalizeViteBase('./', undefined, undefined), './');
  assert.equal(normalizeViteBase(undefined, undefined, undefined), '/');
});

test('getRouterBasename, getSafeBrowserBasename, and resolveAssetUrl handle root, custom domain, and GitHub Pages subpaths', () => {
  assert.equal(getRouterBasename('/'), '/');
  assert.equal(getRouterBasename('/my-portfolio/'), '/my-portfolio');
  assert.equal(
    getRouterBasename('./', '/my-portfolio/admin', 'user.github.io'),
    '/my-portfolio'
  );
  assert.equal(
    getSafeBrowserBasename('/my-portfolio/', '/my-portfolio/', 'user.github.io'),
    '/my-portfolio'
  );
  assert.equal(
    getSafeBrowserBasename('/my-portfolio/', '/my-portfolio/admin', 'user.github.io'),
    '/my-portfolio'
  );
  // Falls back safely to '/' instead of crashing BrowserRouter when hosted on a custom domain
  assert.equal(
    getSafeBrowserBasename('/my-portfolio/', '/', 'customdomain.com'),
    '/'
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
