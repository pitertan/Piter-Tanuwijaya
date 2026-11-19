import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Briefcase,
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
    setSigningIn(true);
    try {
      await signInWithGoogle();
      setFailedAttempts(0);
    } catch (err) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_MS);
        setAuthError(
          'Too many failed authentication attempts. Please wait 30 seconds before trying again.'
        );
      } else {
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Authentication could not be completed. Please try again.'
        );
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
                className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400"
              >
                {authError}
              </div>
            )}

            <button
              type="button"
              disabled={signingIn || remainingSeconds > 0}
              onClick={handleLogin}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2.5"
            >
              <Lock className="w-4 h-4" />
              <span>
                {remainingSeconds > 0
                  ? `Locked (${remainingSeconds}s)`
                  : signingIn
                  ? 'Signing in...'
                  : 'Sign In with Google'}
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
