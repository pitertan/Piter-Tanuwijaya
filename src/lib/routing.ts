const ADMIN_SESSION_KEY = 'portfolio_cms_session';

export function isAdminPath(pathname: string): boolean {
  const normalized = pathname.trim().toLowerCase();
  return normalized === '/admin' || normalized.startsWith('/admin/');
}

export function resolveHashAdminRedirect(hash: string): string | null {
  const normalized = hash.trim().toLowerCase();
  if (normalized === '#/admin' || normalized.startsWith('#/admin/')) {
    return '/admin';
  }
  return null;
}

export function shouldShowCmsReturnControl(options: {
  isAdmin: boolean;
  visitedAdminInSession: boolean;
  fromAdminState?: boolean;
}): boolean {
  return Boolean(
    options.isAdmin || options.visitedAdminInSession || options.fromAdminState
  );
}

export function markVisitedAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function hasVisitedAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}
