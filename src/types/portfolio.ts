export type ThemeMode = 'dark' | 'light';

export type SectionKey =
  | 'hero'
  | 'about'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'gallery'
  | 'achievements'
  | 'education'
  | 'contact';

export type SectionLayoutStyle =
  | 'editorial'
  | 'grid'
  | 'timeline'
  | 'bento'
  | 'masonry'
  | 'split';

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'editor';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SiteSettings {
  siteName: string;
  brandWordmark: string;
  defaultTheme: ThemeMode;
  enableCustomCursor: boolean;
  enableParticles: boolean;
  seeded: boolean;
  updatedAt?: unknown;
}

export interface PersonalProfile {
  fullName: string;
  roleTitle: string;
  tagline: string;
  location: string;
  availabilityText: string;
  avatarMediaId: string;
  cvUrl: string;
  updatedAt?: unknown;
}

export interface HeroMetric {
  label: string;
  value: string;
  detail: string;
}

export interface HeroContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaTarget: string;
  secondaryCtaLabel: string;
  secondaryCtaTarget: string;
  portraitMediaId: string;
  metrics: HeroMetric[];
  updatedAt?: unknown;
}

export interface AboutContent {
  introduction: string;
  summary: string;
  background: string;
  philosophy: string;
  expertiseAreas: string[];
  photoMediaId: string;
  cvDownloadLabel: string;
  cvUrl: string;
  updatedAt?: unknown;
}

export interface ContactInformation {
  email: string;
  phone: string;
  location: string;
  responseExpectation: string;
  formHeading: string;
  updatedAt?: unknown;
}

export interface FooterSettings {
  brandStatement: string;
  copyrightText: string;
  showBackToTop: boolean;
  updatedAt?: unknown;
}

export interface SeoSettings {
  siteTitle: string;
  metaDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageMediaId: string;
  canonicalUrl: string;
  updatedAt?: unknown;
}

export interface PortfolioSection {
  id: string;
  sectionKey: SectionKey;
  title: string;
  subtitle: string;
  description: string;
  layoutStyle: SectionLayoutStyle;
  isVisible: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  location: 'header' | 'footer' | 'both';
  isVisible: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  isVisible: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface ExperienceItem {
  id: string;
  companyName: string;
  companyLogoMediaId: string;
  jobPosition: string;
  period: string;
  location: string;
  description: string;
  responsibilities: string[];
  achievements: string[];
  imageMediaIds: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  isVisible: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export type SkillProficiency = 'Core' | 'Advanced' | 'Proficient' | 'Exploring';

export interface SkillItem {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  proficiencyLevel: SkillProficiency;
  yearsExperience: number;
  iconName: string;
  iconMediaId: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface ProjectItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  technologies: string[];
  projectDate: string;
  role: string;
  projectUrl: string;
  coverMediaId: string;
  galleryMediaIds: string[];
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GalleryCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  categoryId: string;
  mediaId: string;
  aspectRatio: '16:9' | '4:3' | '3:4' | '1:1';
  isPublished: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AchievementItem {
  id: string;
  title: string;
  organization: string;
  issueDate: string;
  description: string;
  verificationUrl: string;
  mediaId: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface CertificationItem {
  id: string;
  title: string;
  organization: string;
  issueDate: string;
  credentialId: string;
  description: string;
  verificationUrl: string;
  mediaId: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  studyPeriod: string;
  location: string;
  description: string;
  logoMediaId: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export type AllowedMediaMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/svg+xml';

export interface MediaAsset {
  id: string;
  title: string;
  altText: string;
  description: string;
  category: string;
  url: string;
  thumbnailUrl: string;
  mimeType: AllowedMediaMime;
  sizeBytes: number;
  width: number;
  height: number;
  filename: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ContactMessageStatus = 'unread' | 'read' | 'replied' | 'archived';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'upload'
  | 'seed';

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt?: unknown;
}

export interface PortfolioSnapshot {
  siteSettings: SiteSettings;
  profile: PersonalProfile;
  hero: HeroContent;
  about: AboutContent;
  contactInfo: ContactInformation;
  footer: FooterSettings;
  seo: SeoSettings;
  sections: PortfolioSection[];
  navigation: NavigationItem[];
  socialLinks: SocialLink[];
  experiences: ExperienceItem[];
  skillCategories: SkillCategory[];
  skills: SkillItem[];
  projects: ProjectItem[];
  galleryCategories: GalleryCategory[];
  galleries: GalleryItem[];
  achievements: AchievementItem[];
  certifications: CertificationItem[];
  education: EducationItem[];
  mediaLibrary: MediaAsset[];
}
