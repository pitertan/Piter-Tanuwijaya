import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdminPath,
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
