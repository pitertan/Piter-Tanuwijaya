import { z } from 'zod';
import type {
  AllowedMediaMime,
  MediaAsset,
  PortfolioSnapshot,
} from '../types/portfolio';

export const ALLOWED_MEDIA_MIMES: readonly AllowedMediaMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

export const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export const contactMessageInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your full name (at least 2 characters).')
    .max(120, 'Name must be 120 characters or fewer.'),
  email: z
    .string()
    .trim()
    .min(5, 'Please enter a valid email address.')
    .max(200, 'Email must be 200 characters or fewer.')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.'),
  subject: z
    .string()
    .trim()
    .min(2, 'Please provide a brief subject.')
    .max(200, 'Subject must be 200 characters or fewer.'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters long.')
    .max(4000, 'Message must be 4000 characters or fewer.'),
});

export type ContactFormInput = z.infer<typeof contactMessageInputSchema>;

export interface ContactValidationResult {
  valid: boolean;
  data?: ContactFormInput;
  errors: Partial<Record<keyof ContactFormInput, string>>;
}

export function validateContactForm(input: ContactFormInput): ContactValidationResult {
  const parsed = contactMessageInputSchema.safeParse(input);
  if (parsed.success) {
    return { valid: true, data: parsed.data, errors: {} };
  }
  const errors: Partial<Record<keyof ContactFormInput, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ContactFormInput | undefined;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { valid: false, errors };
}

export function isValidFirestoreId(id: string): boolean {
  return VALID_ID_REGEX.test(id);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'item';
}

export function isValidExternalUrl(url: string): boolean {
  if (!url.trim()) return true;
  if (url.startsWith('/') || url.startsWith('#')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export function validateMediaFile(
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_MEDIA_MIMES.includes(mimeType as AllowedMediaMime)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload JPG, PNG, WebP, or SVG files.',
    };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { valid: false, error: 'Image file appears to be empty.' };
  }
  if (sizeBytes > MAX_MEDIA_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image exceeds the maximum allowed file size of 10MB.',
    };
  }
  return { valid: true };
}

/**
 * Sanitizes SVG markup by removing executable scripts, foreignObject tags,
 * external dangerous tags, inline event handlers, and javascript:/data: script URIs.
 */
export function sanitizeSvgContent(rawSvg: string): string {
  let clean = rawSvg.trim();
  // Remove XML processing instructions that could embed stylesheets or scripts
  clean = clean.replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '');
  // Remove dangerous elements completely
  clean = clean.replace(
    /<\s*(script|foreignObject|iframe|object|embed|applet|meta|link|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ''
  );
  clean = clean.replace(
    /<\s*(script|foreignObject|iframe|object|embed|applet|meta|link|base)\b[^>]*\/?>/gi,
    ''
  );
  // Remove inline event handlers (onload=, onclick=, onerror=, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Neutralize javascript: or vbscript: or data:text/html URIs in href / xlink:href / src
  clean = clean.replace(
    /(xlink:href|href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\2/gi,
    '$1=""'
  );
  // Remove CSS expressions or @import in style attributes/tags
  clean = clean.replace(/expression\s*\(/gi, 'invalid(');
  clean = clean.replace(/@import\b/gi, '');
  return clean;
}

export interface MediaReference {
  entityType: string;
  entityId: string;
  entityLabel: string;
  field: string;
}

/**
 * Checks every portfolio entity in the snapshot for references to a given mediaId
 * so deleting a media asset never silently breaks live content.
 */
export function findMediaReferences(
  mediaId: string,
  snapshot: PortfolioSnapshot
): MediaReference[] {
  const refs: MediaReference[] = [];

  if (snapshot.profile.avatarMediaId === mediaId) {
    refs.push({
      entityType: 'Personal Profile',
      entityId: 'main',
      entityLabel: snapshot.profile.fullName,
      field: 'avatarMediaId',
    });
  }
  if (snapshot.hero.portraitMediaId === mediaId) {
    refs.push({
      entityType: 'Hero Section',
      entityId: 'main',
      entityLabel: snapshot.hero.headline,
      field: 'portraitMediaId',
    });
  }
  if (snapshot.about.photoMediaId === mediaId) {
    refs.push({
      entityType: 'About Section',
      entityId: 'main',
      entityLabel: 'About Photo',
      field: 'photoMediaId',
    });
  }
  if (snapshot.seo.ogImageMediaId === mediaId) {
    refs.push({
      entityType: 'SEO Settings',
      entityId: 'main',
      entityLabel: snapshot.seo.siteTitle,
      field: 'ogImageMediaId',
    });
  }

  for (const exp of snapshot.experiences) {
    if (exp.companyLogoMediaId === mediaId) {
      refs.push({
        entityType: 'Experience',
        entityId: exp.id,
        entityLabel: `${exp.jobPosition} · ${exp.companyName}`,
        field: 'companyLogoMediaId',
      });
    }
    if (exp.imageMediaIds.includes(mediaId)) {
      refs.push({
        entityType: 'Experience',
        entityId: exp.id,
        entityLabel: `${exp.jobPosition} · ${exp.companyName}`,
        field: 'imageMediaIds',
      });
    }
  }

  for (const skill of snapshot.skills) {
    if (skill.iconMediaId === mediaId) {
      refs.push({
        entityType: 'Skill',
        entityId: skill.id,
        entityLabel: skill.name,
        field: 'iconMediaId',
      });
    }
  }

  for (const project of snapshot.projects) {
    if (project.coverMediaId === mediaId) {
      refs.push({
        entityType: 'Project',
        entityId: project.id,
        entityLabel: project.title,
        field: 'coverMediaId',
      });
    }
    if (project.galleryMediaIds.includes(mediaId)) {
      refs.push({
        entityType: 'Project Gallery',
        entityId: project.id,
        entityLabel: project.title,
        field: 'galleryMediaIds',
      });
    }
  }

  for (const item of snapshot.galleries) {
    if (item.mediaId === mediaId) {
      refs.push({
        entityType: 'Gallery',
        entityId: item.id,
        entityLabel: item.title,
        field: 'mediaId',
      });
    }
  }

  for (const ach of snapshot.achievements) {
    if (ach.mediaId === mediaId) {
      refs.push({
        entityType: 'Achievement',
        entityId: ach.id,
        entityLabel: ach.title,
        field: 'mediaId',
      });
    }
  }

  for (const cert of snapshot.certifications) {
    if (cert.mediaId === mediaId) {
      refs.push({
        entityType: 'Certification',
        entityId: cert.id,
        entityLabel: cert.title,
        field: 'mediaId',
      });
    }
  }

  for (const edu of snapshot.education) {
    if (edu.logoMediaId === mediaId) {
      refs.push({
        entityType: 'Education',
        entityId: edu.id,
        entityLabel: edu.institution,
        field: 'logoMediaId',
      });
    }
  }

  return refs;
}

export function findOrphanedMedia(
  mediaAssets: MediaAsset[],
  snapshot: PortfolioSnapshot
): MediaAsset[] {
  return mediaAssets.filter(
    (asset) => findMediaReferences(asset.id, snapshot).length === 0
  );
}

/**
 * Enforces blueprint max-length bounds on string lists and strings prior to Firestore writes.
 */
export function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function clampStringArray(values: string[], maxItems: number, maxLen = 240): string[] {
  return values
    .map((v) => v.trim().slice(0, maxLen))
    .filter((v) => v.length > 0)
    .slice(0, maxItems);
}

/**
 * Strips top-level keys whose value is `undefined` so Firestore setDoc never
 * throws "Unsupported field value: undefined".
 */
export function stripUndefinedKeys<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Validates CMS navigation link targets (#section-id, /path, or http(s)/mailto URL).
 * Rejects bare "#" which breaks in-page scroll queries and navigation.
 */
export function isValidNavHref(rawHref: string): boolean {
  const href = rawHref.trim();
  if (!href || href === '#') return false;
  if (href.startsWith('#')) {
    return /^#[a-zA-Z0-9_-]{1,128}$/.test(href);
  }
  return isValidExternalUrl(href);
}

/**
 * Safely extracts the DOM element ID from a "#id" anchor href without calling
 * document.querySelector (which throws SyntaxError on invalid CSS selectors).
 */
export function getAnchorElementId(href: string): string | null {
  if (!href || !href.startsWith('#') || href.length <= 1) return null;
  const id = href.slice(1).trim();
  return id.length > 0 ? id : null;
}

export function validateMediaImageUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Image URL is required.' };
  }
  if (trimmed.length > 600) {
    return {
      valid: false,
      error: 'Image URL must be 600 characters or fewer.',
    };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'Image URL cannot contain spaces.' };
  }
  if (trimmed.startsWith('data:')) {
    return {
      valid: false,
      error: 'Base64 data URLs are not supported. Use an HTTPS image URL or /uploads/ path.',
    };
  }
  if (trimmed.startsWith('/')) {
    return { valid: true, normalizedUrl: trimmed };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        error: 'Image URL must use https://, http://, or a root-relative / path.',
      };
    }
    return { valid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { valid: false, error: 'Please enter a valid image URL.' };
  }
}

export function formatFirebaseAuthError(
  err: unknown,
  hostname = ''
): {
  code: string;
  message: string;
  unauthorizedDomain?: string;
} {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
      ? err.code
      : '';
  const rawMessage = err instanceof Error ? err.message : String(err || '');

  if (
    code === 'auth/unauthorized-domain' ||
    rawMessage.includes('auth/unauthorized-domain')
  ) {
    const domain = hostname.trim() || 'your deployment domain';
    return {
      code: 'auth/unauthorized-domain',
      unauthorizedDomain: hostname.trim() || undefined,
      message: `Domain "${domain}" is not allowlisted in Firebase Authentication. Add "${domain}" under Firebase Console → Authentication → Settings → Authorized domains, then sign in again.`,
    };
  }

  if (code === 'auth/popup-blocked' || rawMessage.includes('auth/popup-blocked')) {
    return {
      code: 'auth/popup-blocked',
      message: 'Sign-in popup was blocked by your browser. Allow popups for this site and try again.',
    };
  }

  if (
    code === 'auth/popup-closed-by-user' ||
    rawMessage.includes('auth/popup-closed-by-user')
  ) {
    return {
      code: 'auth/popup-closed-by-user',
      message: 'Sign-in window was closed before completing authentication.',
    };
  }

  return {
    code: code || 'auth/unknown',
    message:
      rawMessage || 'Authentication could not be completed. Please try again.',
  };
}

