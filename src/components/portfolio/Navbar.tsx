import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePortfolio } from '../../context/PortfolioContext';
import { getAnchorElementId } from '../../lib/validation';

export function Navbar() {
  const { data } = usePortfolio();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string>('#about');
  const scrollTimerRef = useRef<number | null>(null);

  const headerNav = data.navigation
    .filter((n) => n.isVisible && (n.location === 'header' || n.location === 'both'))
    .slice(0, 5);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + 140;
      for (const item of headerNav) {
        const targetId = getAnchorElementId(item.href);
        if (!targetId) continue;
        const el = document.getElementById(targetId);
        if (el) {
          if (scrollY >= el.offsetTop && scrollY < el.offsetTop + el.offsetHeight) {
            setActiveHref(item.href);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headerNav]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const handleMobileNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    const targetId = getAnchorElementId(href);
    setMobileOpen(false);
    if (!targetId) return;

    e.preventDefault();
    setActiveHref(href);

    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = prefersReduced ? 20 : 200;

    scrollTimerRef.current = window.setTimeout(() => {
      if (targetId === 'top') {
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
        window.history.replaceState(null, '', href);
        return;
      }
      const el = document.getElementById(targetId);
      if (el) {
        const headerOffset = 64;
        const targetTop = Math.max(
          0,
          el.getBoundingClientRect().top + window.scrollY - headerOffset
        );
        window.scrollTo({
          top: targetTop,
          behavior: prefersReduced ? 'auto' : 'smooth',
        });
        window.history.replaceState(null, '', href);
      }
    }, delay);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#07090D]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="text-lg font-display font-semibold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          {data.siteSettings.brandWordmark || data.profile.fullName}
        </a>

        {/* Zone 2: Dynamic CMS Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {headerNav.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setActiveHref(item.href)}
                className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-slate-950 dark:text-white'
                    : 'hover:text-slate-950 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-underline"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-blue-600 dark:bg-blue-500 rounded-full"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#contact"
            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white dark:bg-blue-600 dark:text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            Contact
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            aria-label="Mobile Navigation"
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07090D] overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              {headerNav.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleMobileNavClick(e, item.href)}
                  className="py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={(e) => handleMobileNavClick(e, '#contact')}
                className="mt-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white"
              >
                Contact
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
