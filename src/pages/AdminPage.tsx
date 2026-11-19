import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Briefcase,
  Check,
  Copy,
  Cpu,
  Eye,
  FolderKanban,
  Globe,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  LayoutList,
  Lock,
  LogOut,
  Mail,
  Menu,
  Moon,
  PanelBottom,
  ShieldAlert,
  Sun,
  UserCheck,
  UserCircle,
  X,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { useTheme } from '../context/ThemeContext';
import { markVisitedAdminSession } from '../lib/routing';
import { formatFirebaseAuthError } from '../lib/validation';
import { AdminOverview } from '../components/admin/AdminOverview';
import {
  AboutEditor,
  ProfileHeroEditor,
  SeoSettingsEditor,
} from '../components/admin/SingletonEditors';
import {
  ExperienceManager,
  SkillsManager,
} from '../components/admin/ExperienceSkillsManager';
import { ProjectsManager } from '../components/admin/ProjectsManager';
import { MediaLibraryManager } from '../components/admin/MediaLibraryManager';
import {
  CredentialsEducationManager,
  GalleryManager,
} from '../components/admin/GalleryCredentialsManager';
import {
  ContactInboxManager,
  FooterSocialManager,
  SectionsNavigationManager,
} from '../components/admin/StructureInboxManager';

type AdminTab =
  | 'overview'
  | 'hero'
  | 'about'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'media'
  | 'gallery'
  | 'credentials'
  | 'sections'
  | 'messages'
  | 'footer'
  | 'seo';

const NAV_GROUPS: Array<{
  heading: string;
  items: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    heading: 'Overview',
    items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Identity & Story',
    items: [
      { id: 'hero', label: 'Profile & Hero', icon: UserCircle },
      { id: 'about', label: 'About & CV', icon: UserCheck },
      { id: 'experience', label: 'Experience', icon: Briefcase },
      { id: 'skills', label: 'Skills & Categories', icon: Cpu },
    ],
  },
  {
    heading: 'Showcase & Assets',
    items: [
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'media', label: 'Media Library', icon: Images },
      { id: 'gallery', label: 'Visual Gallery', icon: ImageIcon },
      { id: 'credentials', label: 'Awards & Education', icon: Award },
    ],
  },
  {
    heading: 'Site & Inbox',
    items: [
      { id: 'sections', label: 'Sections & Menu', icon: LayoutList },
      { id: 'messages', label: 'Contact Inbox', icon: Mail },
      { id: 'footer', label: 'Footer & Social', icon: PanelBottom },
      { id: 'seo', label: 'Settings & SEO', icon: Globe },
    ],
  },
];

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

export function AdminPage() {
  const {
    data,
    user,
    authReady,
    isAdmin,
    adminRole,
    contactMessages,
    signInWithGoogle,
    logoutAdmin,
  } = usePortfolio();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [authError, setAuthError] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingSeconds(0);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff === 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutUntil]);

  useEffect(() => {
    markVisitedAdminSession();
  }, []);

  useEffect(() => {
    document.title = `CMS Admin — ${data.siteSettings.brandWordmark || 'Portfolio'}`;
  }, [data.siteSettings.brandWordmark]);

  const unreadCount = contactMessages.filter((m) => m.status === 'unread').length;

  const handleLogin = async () => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;
    setAuthError('');
    setUnauthorizedDomain(null);
    setCopiedDomain(false);
    setSigningIn(true);
    try {
      await signInWithGoogle();
      setFailedAttempts(0);
    } catch (err) {
      const formatted = formatFirebaseAuthError(
        err,
        typeof window !== 'undefined' ? window.location.hostname : ''
      );
      if (formatted.unauthorizedDomain) {
        setUnauthorizedDomain(formatted.unauthorizedDomain);
      }
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_MS);
        setAuthError(
          'Too many failed authentication attempts. Please wait 30 seconds before trying again.'
        );
      } else {
        setAuthError(formatted.message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07090D] text-slate-900 dark:text-slate-100">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Verifying Session
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated Gate
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#07090D] text-slate-900 dark:text-slate-100 bg-architectural-grid p-6">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <Link
            to="/"
            state={{ fromAdmin: true }}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Public Portfolio</span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A]"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>

        <main className="max-w-md w-full mx-auto my-12">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F131A]/95 backdrop-blur-md p-8 shadow-2xl space-y-6">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-slate-950 dark:text-white">
                Portfolio CMS Console
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sign in with an authorized administrator account to manage portfolio sections, projects, media, and incoming messages.
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400 space-y-2.5"
              >
                <p>{authError}</p>
                {unauthorizedDomain && (
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-rose-500/20">
                    <code className="font-mono text-[11px] bg-black/10 dark:bg-white/10 px-2 py-1 rounded truncate">
                      {unauthorizedDomain}
                    </code>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(unauthorizedDomain);
                          setCopiedDomain(true);
                        } catch {
                          setCopiedDomain(false);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-medium hover:bg-rose-500 shrink-0"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy domain</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={signingIn || remainingSeconds > 0}
              onClick={handleLogin}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-white dark:hover:bg-slate-100 text-slate-800 border border-slate-300 dark:border-slate-300 text-sm font-medium shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-3"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>
                {remainingSeconds > 0
                  ? `Locked (${remainingSeconds}s)`
                  : signingIn
                  ? 'Signing in...'
                  : 'Sign in with Google'}
              </span>
            </button>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Protected by verified Firebase Authentication and collection-level Firestore security rules.
            </p>
          </div>
        </main>

        <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500 dark:text-slate-500">
          {data.siteSettings.brandWordmark || data.profile.fullName} · Private Administration
        </footer>
      </div>
    );
  }

  // Authenticated but unauthorized
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07090D] text-slate-900 dark:text-slate-100 p-6">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-white dark:bg-[#0F131A] p-8 space-y-5 shadow-2xl">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-display font-bold">Access Restricted</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Signed in as <span className="font-mono text-slate-900 dark:text-white">{user.email}</span>, which is not authorized for CMS administration.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={logoutAdmin}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-medium hover:bg-rose-500"
            >
              Sign Out
            </button>
            <Link
              to="/"
              state={{ fromAdmin: true }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Return to Portfolio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentTabLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label ||
    'Dashboard';

  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview onNavigate={(t) => handleSelectTab(t as AdminTab)} />;
      case 'hero':
        return <ProfileHeroEditor />;
      case 'about':
        return <AboutEditor />;
      case 'experience':
        return <ExperienceManager />;
      case 'skills':
        return <SkillsManager />;
      case 'projects':
        return <ProjectsManager />;
      case 'media':
        return <MediaLibraryManager />;
      case 'gallery':
        return <GalleryManager />;
      case 'credentials':
        return <CredentialsEducationManager />;
      case 'sections':
        return <SectionsNavigationManager />;
      case 'messages':
        return <ContactInboxManager />;
      case 'footer':
        return <FooterSocialManager />;
      case 'seo':
        return <SeoSettingsEditor />;
      default:
        return <AdminOverview onNavigate={(t) => handleSelectTab(t as AdminTab)} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#07090D] text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0E14] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-display font-bold tracking-tight truncate">
              {data.siteSettings.brandWordmark || 'Portfolio'} CMS
            </p>
            <p className="text-[11px] font-mono text-slate-500 truncate">
              {adminRole === 'super_admin' ? 'Super Admin' : 'Editor'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="p-1.5 rounded-lg lg:hidden text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav
          aria-label="CMS sections"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="space-y-1">
              <p className="px-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.heading}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'messages' && unreadCount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          <button
            type="button"
            onClick={logoutAdmin}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-display font-semibold truncate">
              {currentTabLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <Link
              to="/"
              state={{ fromAdmin: true }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Portfolio</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
