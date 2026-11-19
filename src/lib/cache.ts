import type { PortfolioSnapshot } from '../types/portfolio';

export const PORTFOLIO_CACHE_KEY = 'portfolio_live_cache_v1';

function stripTimestamps<T extends object>(obj: T): T {
  const copy = { ...(obj as Record<string, unknown>) };
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy as T;
}

export function toPublicCacheSnapshot(
  snapshot: PortfolioSnapshot
): PortfolioSnapshot {
  return {
    siteSettings: stripTimestamps(snapshot.siteSettings),
    profile: stripTimestamps(snapshot.profile),
    hero: stripTimestamps(snapshot.hero),
    about: stripTimestamps(snapshot.about),
    contactInfo: stripTimestamps(snapshot.contactInfo),
    footer: stripTimestamps(snapshot.footer),
    seo: stripTimestamps(snapshot.seo),
    sections: snapshot.sections.map((s) => stripTimestamps(s)),
    navigation: snapshot.navigation.map((n) => stripTimestamps(n)),
    socialLinks: snapshot.socialLinks.map((s) => stripTimestamps(s)),
    skillCategories: snapshot.skillCategories.map((c) => stripTimestamps(c)),
    galleryCategories: snapshot.galleryCategories.map((c) => stripTimestamps(c)),
    mediaLibrary: snapshot.mediaLibrary.map((m) => stripTimestamps(m)),
    experiences: snapshot.experiences
      .filter((e) => e.isPublished)
      .map((e) => stripTimestamps(e)),
    skills: snapshot.skills
      .filter((s) => s.isPublished)
      .map((s) => stripTimestamps(s)),
    projects: snapshot.projects
      .filter((p) => p.isPublished)
      .map((p) => stripTimestamps(p)),
    galleries: snapshot.galleries
      .filter((g) => g.isPublished)
      .map((g) => stripTimestamps(g)),
    achievements: snapshot.achievements
      .filter((a) => a.isPublished)
      .map((a) => stripTimestamps(a)),
    certifications: snapshot.certifications
      .filter((c) => c.isPublished)
      .map((c) => stripTimestamps(c)),
    education: snapshot.education
      .filter((e) => e.isPublished)
      .map((e) => stripTimestamps(e)),
  };
}

export function parseCachedSnapshot(
  raw: string | null,
  fallback: PortfolioSnapshot
): PortfolioSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PortfolioSnapshot> | null;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.profile ||
      !parsed.hero ||
      !Array.isArray(parsed.mediaLibrary)
    ) {
      return null;
    }
    return {
      ...fallback,
      ...parsed,
      siteSettings: { ...fallback.siteSettings, ...parsed.siteSettings },
      profile: { ...fallback.profile, ...parsed.profile },
      hero: { ...fallback.hero, ...parsed.hero },
      about: { ...fallback.about, ...parsed.about },
      contactInfo: { ...fallback.contactInfo, ...parsed.contactInfo },
      footer: { ...fallback.footer, ...parsed.footer },
      seo: { ...fallback.seo, ...parsed.seo },
    };
  } catch {
    return null;
  }
}

export function loadCachedSnapshot(
  fallback: PortfolioSnapshot
): PortfolioSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseCachedSnapshot(
      window.localStorage.getItem(PORTFOLIO_CACHE_KEY),
      fallback
    );
  } catch {
    return null;
  }
}

export function saveCachedSnapshot(snapshot: PortfolioSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const publicCopy = toPublicCacheSnapshot(snapshot);
    window.localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(publicCopy));
  } catch {
    // Ignore quota or restricted storage errors
  }
}
