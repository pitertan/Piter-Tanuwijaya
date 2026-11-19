import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, X } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import {
  hasVisitedAdminSession,
  resolveAssetUrl,
  shouldShowCmsReturnControl,
} from '../lib/routing';
import type { PortfolioSection } from '../types/portfolio';
import { LoadingCurtain } from '../components/portfolio/LoadingCurtain';
import { CustomCursor } from '../components/portfolio/CustomCursor';
import { ScrollProgressBar } from '../components/portfolio/ScrollProgressBar';
import { Navbar } from '../components/portfolio/Navbar';
import { HeroSection } from '../components/portfolio/HeroSection';
import { AboutSection } from '../components/portfolio/AboutSection';
import { ExperienceSection } from '../components/portfolio/ExperienceSection';
import { SkillsSection } from '../components/portfolio/SkillsSection';
import { ProjectsSection } from '../components/portfolio/ProjectsSection';
import { GallerySection } from '../components/portfolio/GallerySection';
import { AchievementsSection } from '../components/portfolio/AchievementsSection';
import { EducationSection } from '../components/portfolio/EducationSection';
import { ContactSection } from '../components/portfolio/ContactSection';
import { Footer } from '../components/portfolio/Footer';

export function PortfolioPage() {
  const { data, resolveMedia, isAdmin } = usePortfolio();
  const { seo, siteSettings, profile, sections } = data;
  const location = useLocation();
  const fromAdminState = Boolean(
    (location.state as { fromAdmin?: boolean } | null)?.fromAdmin
  );
  const canReturnToCms = shouldShowCmsReturnControl({
    isAdmin,
    visitedAdminInSession: hasVisitedAdminSession(),
    fromAdminState,
  });
  const [dismissedCmsBar, setDismissedCmsBar] = useState(false);

  // Scroll to top cleanly when returning from /admin
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Dynamic SEO synchronization
  useEffect(() => {
    if (seo.siteTitle) {
      document.title = seo.siteTitle;
    }
    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el && content) {
        el.setAttribute('content', content);
      }
    };
    setMeta('meta[name="description"]', seo.metaDescription);
    setMeta('meta[property="og:title"]', seo.ogTitle || seo.siteTitle);
    setMeta('meta[property="og:description"]', seo.ogDescription || seo.metaDescription);
    setMeta('meta[name="twitter:title"]', seo.ogTitle || seo.siteTitle);
    setMeta('meta[name="twitter:description"]', seo.ogDescription || seo.metaDescription);

    const ogImg = resolveMedia(seo.ogImageMediaId);
    if (ogImg?.url) {
      let ogImgTag = document.querySelector('meta[property="og:image"]');
      if (!ogImgTag) {
        ogImgTag = document.createElement('meta');
        ogImgTag.setAttribute('property', 'og:image');
        document.head.appendChild(ogImgTag);
      }
      const resolvedAssetPath = resolveAssetUrl(
        ogImg.url,
        import.meta.env.BASE_URL,
        window.location.pathname,
        window.location.hostname
      );
      const resolvedUrl =
        resolvedAssetPath.startsWith('http://') || resolvedAssetPath.startsWith('https://')
          ? resolvedAssetPath
          : window.location.origin + resolvedAssetPath;
      ogImgTag.setAttribute('content', resolvedUrl);
    }
  }, [seo, resolveMedia]);

  const orderedSections = [...sections]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const renderSection = (sec: PortfolioSection) => {
    switch (sec.sectionKey) {
      case 'hero':
        return <HeroSection key={sec.id} />;
      case 'about':
        return <AboutSection key={sec.id} section={sec} />;
      case 'experience':
        return <ExperienceSection key={sec.id} section={sec} />;
      case 'skills':
        return <SkillsSection key={sec.id} section={sec} />;
      case 'projects':
        return <ProjectsSection key={sec.id} section={sec} />;
      case 'gallery':
        return <GallerySection key={sec.id} section={sec} />;
      case 'achievements':
        return <AchievementsSection key={sec.id} section={sec} />;
      case 'education':
        return <EducationSection key={sec.id} section={sec} />;
      case 'contact':
        return <ContactSection key={sec.id} section={sec} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#07090D] text-slate-900 dark:text-slate-100">
      {!fromAdminState && (
        <LoadingCurtain brandName={siteSettings.brandWordmark || profile.fullName} />
      )}
      <CustomCursor enabled={siteSettings.enableCustomCursor} />
      <ScrollProgressBar />
      <Navbar />
      <main className="flex-1">{orderedSections.map(renderSection)}</main>
      <Footer />

      {canReturnToCms && !dismissedCmsBar && (
        <div
          role="region"
          aria-label="CMS Navigation"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0F131A]/95 backdrop-blur-md p-1.5 shadow-xl"
        >
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Back to CMS</span>
          </Link>
          <button
            type="button"
            onClick={() => setDismissedCmsBar(true)}
            aria-label="Dismiss Back to CMS button"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
