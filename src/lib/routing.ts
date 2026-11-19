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

export function normalizeViteBase(
  rawBase?: string,
  githubActions?: string,
  githubRepository?: string
): string {
  const trimmed = rawBase?.trim();
  if (trimmed) {
    if (trimmed === '.' || trimmed === './') {
      return './';
    }
    const collapsed = `/${trimmed}`.replace(/\/+/g, '/');
    if (collapsed === '/') {
      return '/';
    }
    return collapsed.endsWith('/') ? collapsed : `${collapsed}/`;
  }

  const ghRepo = githubRepository?.split('/')[1]?.trim();
  if (githubActions === 'true' && ghRepo && !ghRepo.endsWith('.github.io')) {
    return `/${ghRepo}/`;
  }

  return '/';
}

export function getRouterBasename(
  baseUrl = '/',
  pathname = '/',
  hostname = ''
): string {
  const trimmed = baseUrl.trim();
  if (trimmed.startsWith('/') && trimmed !== '/') {
    return trimmed.replace(/\/+$/, '');
  }
  if ((trimmed === './' || trimmed === '.') && hostname.endsWith('.github.io')) {
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    if (firstSegment && firstSegment.toLowerCase() !== 'admin') {
      return `/${firstSegment}`;
    }
  }
  return '/';
}

export function getSafeBrowserBasename(
  baseUrl = '/',
  pathname = '/',
  hostname = ''
): string {
  const candidate = getRouterBasename(baseUrl, pathname, hostname);
  if (candidate === '/') return '/';
  const lowerPath = pathname.toLowerCase();
  const lowerBase = candidate.toLowerCase();
  if (lowerPath === lowerBase || lowerPath.startsWith(`${lowerBase}/`)) {
    return candidate;
  }
  return '/';
}

export function resolveAssetUrl(
  url: string | undefined,
  baseUrl = '/',
  pathname = '/',
  hostname = ''
): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  if (url.startsWith('/')) {
    const basePrefix = getRouterBasename(baseUrl, pathname, hostname);
    if (basePrefix !== '/' && !url.startsWith(`${basePrefix}/`)) {
      return `${basePrefix}${url}`;
    }
  }
  return url;
}
