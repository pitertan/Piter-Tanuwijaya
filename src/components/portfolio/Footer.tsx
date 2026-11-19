import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useTheme } from '../../context/ThemeContext';
import {
  hasVisitedAdminSession,
  shouldShowCmsReturnControl,
} from '../../lib/routing';

export function Footer() {
  const { data, isAdmin } = usePortfolio();
  const { theme, toggleTheme } = useTheme();
  const { footer, navigation, socialLinks, siteSettings, profile } = data;
  const showCmsLink = shouldShowCmsReturnControl({
    isAdmin,
    visitedAdminInSession: hasVisitedAdminSession(),
  });

  const footerNav = navigation.filter(
    (n) => n.isVisible && (n.location === 'footer' || n.location === 'both')
  );
  const visibleSocials = socialLinks.filter((s) => s.isVisible);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090C12] text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-6 py-14 space-y-10">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-md space-y-3">
            <p className="text-lg font-display font-semibold text-slate-950 dark:text-white">
              {siteSettings.brandWordmark || profile.fullName}
            </p>
            {footer.brandStatement && (
              <p className="text-sm leading-relaxed">{footer.brandStatement}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-12">
            {footerNav.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-200">
                  Navigation
                </p>
                <ul className="space-y-2 text-sm">
                  {footerNav.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        className="hover:text-slate-950 dark:hover:text-white transition-colors"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {visibleSocials.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-200">
                  Connect
                </p>
                <ul className="space-y-2 text-sm">
                  {visibleSocials.map((soc) => (
                    <li key={soc.id}>
                      <a
                        href={soc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-slate-950 dark:hover:text-white transition-colors"
                      >
                        {soc.platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>{footer.copyrightText}</p>

          <div className="flex items-center gap-4">
            {showCmsLink && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:text-slate-950 dark:hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>CMS Admin</span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:text-slate-950 dark:hover:text-white transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {footer.showBackToTop && (
              <button
                type="button"
                onClick={scrollToTop}
                aria-label="Back to top"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white hover:bg-blue-600 transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Top</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
