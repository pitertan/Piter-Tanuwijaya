import React, { useState } from 'react';
import {
  Briefcase,
  Database,
  FolderKanban,
  Image as ImageIcon,
  Layers,
  Mail,
  Sparkles,
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';

interface AdminOverviewProps {
  onNavigate: (tab: string) => void;
}

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const { data, isSeededInDb, seedDatabase, contactMessages, activityLogs } =
    usePortfolio();
  const { showToast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const publishedCount =
    data.projects.filter((p) => p.isPublished).length +
    data.experiences.filter((e) => e.isPublished).length +
    data.skills.filter((s) => s.isPublished).length +
    data.galleries.filter((g) => g.isPublished).length +
    data.achievements.filter((a) => a.isPublished).length +
    data.certifications.filter((c) => c.isPublished).length +
    data.education.filter((ed) => ed.isPublished).length;

  const unreadMessages = contactMessages.filter((m) => m.status === 'unread').length;

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
      showToast('Database initialized', 'success', 'All default sections are now live in Firestore.');
    } catch (err) {
      showToast(
        'Seed failed',
        'error',
        err instanceof Error ? err.message : 'Unable to write seed data.'
      );
    } finally {
      setSeeding(false);
    }
  };

  const stats = [
    {
      label: 'Projects',
      value: data.projects.length,
      icon: FolderKanban,
      target: 'projects',
    },
    {
      label: 'Published Content',
      value: publishedCount,
      icon: Layers,
      target: 'sections',
    },
    {
      label: 'Gallery & Media',
      value: `${data.galleries.length} / ${data.mediaLibrary.length}`,
      icon: ImageIcon,
      target: 'media',
    },
    {
      label: 'Experience Entries',
      value: data.experiences.length,
      icon: Briefcase,
      target: 'experience',
    },
    {
      label: 'Incoming Messages',
      value: `${contactMessages.length} (${unreadMessages} unread)`,
      icon: Mail,
      target: 'messages',
    },
  ];

  const legacyNameDetected =
    isSeededInDb &&
    (data.profile.fullName.includes('Julian Mercer') ||
      data.siteSettings.brandWordmark.includes('Julian Mercer') ||
      data.seo.siteTitle.includes('Julian Mercer'));

  return (
    <div className="space-y-8">
      {(!isSeededInDb || legacyNameDetected) && (
        <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-display font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span>
                {legacyNameDetected
                  ? 'Sync Firestore Identity to Piter Tanuwijaya'
                  : 'Initialize Portfolio Database'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              {legacyNameDetected
                ? 'Your Firestore database currently holds earlier template records. Click once to update Firestore with the Piter Tanuwijaya site title, profile, SEO, footer, and default portfolio content.'
                : 'Your Firestore database has not been seeded yet. Click once to persist all default portfolio sections, media records, projects, skills, and SEO settings into Firestore so edits sync immediately.'}
            </p>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeed}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {seeding
              ? 'Seeding Database...'
              : legacyNameDetected
              ? 'Sync Default Content'
              : 'Initialize Database Seed'}
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.target)}
              className="text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] hover:border-blue-500/50 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
                <Icon className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-display font-bold tabular-nums text-slate-950 dark:text-white">
                {stat.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Quick Shortcuts + Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4">
          <h3 className="text-base font-display font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Quick Management Shortcuts</span>
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'hero', label: 'Hero & Profile' },
              { id: 'projects', label: 'Manage Projects' },
              { id: 'media', label: 'Upload Media' },
              { id: 'gallery', label: 'Edit Gallery' },
              { id: 'sections', label: 'Section Order' },
              { id: 'seo', label: 'SEO Metadata' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-left hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4">
          <h3 className="text-base font-display font-semibold">Recent CMS Activity</h3>
          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No administrative mutations recorded in Firestore yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Target</th>
                    <th className="py-2 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {activityLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="h-9">
                      <td className="py-2 pr-4 font-mono uppercase text-[11px] text-blue-600 dark:text-blue-400">
                        {log.action}
                      </td>
                      <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">
                        {log.entityType}
                      </td>
                      <td className="py-2 text-slate-800 dark:text-slate-200">
                        {log.summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
