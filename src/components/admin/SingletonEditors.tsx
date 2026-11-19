import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';
import { auth } from '../../lib/firebase';
import { clampString, clampStringArray } from '../../lib/validation';
import type {
  AboutContent,
  HeroContent,
  PersonalProfile,
  SeoSettings,
  SiteSettings,
} from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';
import { MediaPickerModal } from './MediaPickerModal';

export function ProfileHeroEditor() {
  const { data, saveSingleton } = usePortfolio();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<PersonalProfile>(data.profile);
  const [hero, setHero] = useState<HeroContent>(data.hero);
  const [pickerTarget, setPickerTarget] = useState<'avatar' | 'portrait' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfile(data.profile);
  }, [data.profile]);

  useEffect(() => {
    setHero(data.hero);
  }, [data.hero]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !profile.fullName.trim() ||
      !profile.roleTitle.trim() ||
      !hero.headline.trim() ||
      !hero.subheadline.trim() ||
      !hero.primaryCtaLabel.trim() ||
      !hero.primaryCtaTarget.trim() ||
      !hero.secondaryCtaLabel.trim() ||
      !hero.secondaryCtaTarget.trim()
    ) {
      showToast('Name, Role, Headline, Subheadline, and CTA fields cannot be empty.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveSingleton(
        'personal_profiles',
        'main',
        {
          fullName: clampString(profile.fullName, 120),
          roleTitle: clampString(profile.roleTitle, 160),
          tagline: clampString(profile.tagline || '', 300),
          location: clampString(profile.location || '', 120),
          availabilityText: clampString(profile.availabilityText || '', 120),
          avatarMediaId: profile.avatarMediaId || '',
          cvUrl: clampString(profile.cvUrl || '', 500),
        },
        'Updated personal profile'
      );
      await saveSingleton(
        'hero_contents',
        'main',
        {
          eyebrow: clampString(hero.eyebrow || '', 120),
          headline: clampString(hero.headline, 180),
          subheadline: clampString(hero.subheadline, 600),
          primaryCtaLabel: clampString(hero.primaryCtaLabel, 60),
          primaryCtaTarget: clampString(hero.primaryCtaTarget, 120),
          secondaryCtaLabel: clampString(hero.secondaryCtaLabel, 60),
          secondaryCtaTarget: clampString(hero.secondaryCtaTarget, 120),
          portraitMediaId: hero.portraitMediaId || '',
          metrics: (hero.metrics ?? []).slice(0, 6),
        },
        'Updated hero section content'
      );
      showToast('Profile & Hero updated', 'success');
    } catch {
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-5">
        <h3 className="text-base font-display font-semibold">Personal Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Full Name</label>
            <input
              type="text"
              required
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Role Title</label>
            <input
              type="text"
              required
              value={profile.roleTitle}
              onChange={(e) => setProfile({ ...profile, roleTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Availability Note</label>
            <input
              type="text"
              value={profile.availabilityText}
              onChange={(e) =>
                setProfile({ ...profile, availabilityText: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Tagline</label>
          <input
            type="text"
            value={profile.tagline}
            onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-5">
        <h3 className="text-base font-display font-semibold">Hero Composition</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Eyebrow Lead-In</label>
          <input
            type="text"
            value={hero.eyebrow}
            onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Headline</label>
          <input
            type="text"
            required
            value={hero.headline}
            onChange={(e) => setHero({ ...hero, headline: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Subheadline</label>
          <textarea
            rows={3}
            required
            value={hero.subheadline}
            onChange={(e) => setHero({ ...hero, subheadline: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Primary CTA Label</label>
            <input
              type="text"
              required
              value={hero.primaryCtaLabel}
              onChange={(e) => setHero({ ...hero, primaryCtaLabel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Primary CTA Target</label>
            <input
              type="text"
              required
              value={hero.primaryCtaTarget}
              onChange={(e) => setHero({ ...hero, primaryCtaTarget: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Secondary CTA Label</label>
            <input
              type="text"
              required
              value={hero.secondaryCtaLabel}
              onChange={(e) =>
                setHero({ ...hero, secondaryCtaLabel: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Secondary CTA Target</label>
            <input
              type="text"
              required
              value={hero.secondaryCtaTarget}
              onChange={(e) =>
                setHero({ ...hero, secondaryCtaTarget: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
        </div>

        {/* Hero Portrait Selector */}
        <div className="flex items-center gap-4 pt-2">
          <div className="w-20 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
            <MediaImage
              mediaId={hero.portraitMediaId}
              useThumbnail
              className="w-full h-full"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">Hero Portrait Image</p>
            <button
              type="button"
              onClick={() => setPickerTarget('portrait')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Choose from Media Library</span>
            </button>
          </div>
        </div>

        {/* Metrics Strip Editor */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Hero Metrics Strip (up to 6)</p>
            {hero.metrics.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  setHero({
                    ...hero,
                    metrics: [...hero.metrics, { value: '0', label: 'Metric', detail: '' }],
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Metric</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hero.metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={m.value}
                    placeholder="Value (e.g. 18+)"
                    onChange={(e) => {
                      const next = [...hero.metrics];
                      next[idx] = { ...m, value: e.target.value };
                      setHero({ ...hero, metrics: next });
                    }}
                    className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={m.label}
                    placeholder="Label"
                    onChange={(e) => {
                      const next = [...hero.metrics];
                      next[idx] = { ...m, label: e.target.value };
                      setHero({ ...hero, metrics: next });
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
                  />
                  <button
                    type="button"
                    aria-label="Remove metric"
                    onClick={() =>
                      setHero({
                        ...hero,
                        metrics: hero.metrics.filter((_, i) => i !== idx),
                      })
                    }
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={m.detail}
                  placeholder="Supporting context"
                  onChange={(e) => {
                    const next = [...hero.metrics];
                    next[idx] = { ...m, detail: e.target.value };
                    setHero({ ...hero, metrics: next });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? 'Saving...' : 'Save Profile & Hero'}</span>
      </button>

      <MediaPickerModal
        open={Boolean(pickerTarget)}
        selectedId={
          pickerTarget === 'portrait' ? hero.portraitMediaId : profile.avatarMediaId
        }
        onSelect={(mediaId) => {
          if (pickerTarget === 'portrait') {
            setHero({ ...hero, portraitMediaId: mediaId });
          } else if (pickerTarget === 'avatar') {
            setProfile({ ...profile, avatarMediaId: mediaId });
          }
        }}
        onClose={() => setPickerTarget(null)}
      />
    </form>
  );
}

export function AboutEditor() {
  const { data, saveSingleton } = usePortfolio();
  const { showToast } = useToast();
  const [about, setAbout] = useState<AboutContent>(data.about);
  const [expertiseInput, setExpertiseInput] = useState(
    (data.about.expertiseAreas ?? []).join('\n')
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAbout(data.about);
    setExpertiseInput((data.about.expertiseAreas ?? []).join('\n'));
  }, [data.about]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!about.introduction.trim() || !about.summary.trim()) {
      showToast('Introduction and Professional Summary are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveSingleton(
        'about_contents',
        'main',
        {
          introduction: clampString(about.introduction, 1000),
          summary: clampString(about.summary, 2000),
          background: clampString(about.background || '', 2000),
          philosophy: clampString(about.philosophy || '', 1000),
          expertiseAreas: clampStringArray(expertiseInput.split('\n'), 12),
          photoMediaId: about.photoMediaId || '',
          cvDownloadLabel: clampString(about.cvDownloadLabel || '', 80),
          cvUrl: clampString(about.cvUrl || '', 500),
        },
        'Updated About Me section'
      );
      showToast('About section saved', 'success');
    } catch {
      showToast('Failed to save About section', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-5"
    >
      <h3 className="text-base font-display font-semibold">About &amp; Career Philosophy</h3>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Introduction</label>
        <textarea
          rows={3}
          required
          value={about.introduction}
          onChange={(e) => setAbout({ ...about, introduction: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Professional Summary</label>
        <textarea
          rows={4}
          required
          value={about.summary}
          onChange={(e) => setAbout({ ...about, summary: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Personal Background</label>
        <textarea
          rows={3}
          value={about.background}
          onChange={(e) => setAbout({ ...about, background: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Career Philosophy</label>
        <textarea
          rows={3}
          value={about.philosophy}
          onChange={(e) => setAbout({ ...about, philosophy: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Areas of Expertise (one per line)</label>
        <textarea
          rows={5}
          value={expertiseInput}
          onChange={(e) => setExpertiseInput(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm font-mono"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">CV Button Label</label>
          <input
            type="text"
            value={about.cvDownloadLabel}
            onChange={(e) => setAbout({ ...about, cvDownloadLabel: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">CV URL or Anchor</label>
          <input
            type="text"
            value={about.cvUrl}
            onChange={(e) => setAbout({ ...about, cvUrl: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-28 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <MediaImage mediaId={about.photoMediaId} useThumbnail className="w-full h-full" />
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Select Studio Photo</span>
        </button>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? 'Saving...' : 'Save About Section'}</span>
      </button>

      <MediaPickerModal
        open={pickerOpen}
        selectedId={about.photoMediaId}
        onSelect={(mediaId) => setAbout({ ...about, photoMediaId: mediaId })}
        onClose={() => setPickerOpen(false)}
      />
    </form>
  );
}

export function SeoSettingsEditor() {
  const {
    data,
    isSeededInDb,
    saveSingleton,
    adminUsers,
    upsertDocument,
    deleteDocument,
    isBootstrappedAdmin,
  } = usePortfolio();
  const { showToast } = useToast();

  const [seo, setSeo] = useState<SeoSettings>(data.seo);
  const [settings, setSettings] = useState<SiteSettings>(data.siteSettings);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSeo(data.seo);
  }, [data.seo]);

  useEffect(() => {
    setSettings(data.siteSettings);
  }, [data.siteSettings]);

  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'editor' | 'super_admin'>('editor');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !settings.brandWordmark.trim() ||
      !seo.siteTitle.trim() ||
      !seo.metaDescription.trim()
    ) {
      showToast('Brand Wordmark, SEO Page Title, and Meta Description are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveSingleton(
        'seo_settings',
        'main',
        {
          siteTitle: clampString(seo.siteTitle, 120),
          metaDescription: clampString(seo.metaDescription, 300),
          keywords: clampString(seo.keywords || '', 400),
          ogTitle: clampString(seo.ogTitle || '', 120),
          ogDescription: clampString(seo.ogDescription || '', 300),
          ogImageMediaId: seo.ogImageMediaId || '',
          canonicalUrl: clampString(seo.canonicalUrl || '', 300),
        },
        'Updated SEO metadata'
      );
      await saveSingleton(
        'site_settings',
        'main',
        {
          siteName: clampString(settings.siteName || settings.brandWordmark, 120),
          brandWordmark: clampString(settings.brandWordmark, 80),
          defaultTheme: settings.defaultTheme,
          enableCustomCursor: settings.enableCustomCursor,
          enableParticles: settings.enableParticles,
          seeded: isSeededInDb,
        },
        'Updated global site preferences'
      );
      showToast('SEO & Site settings updated', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid.trim() || !newAdminEmail.trim() || !newAdminName.trim()) {
      showToast('UID, Email, and Display Name are required.', 'error');
      return;
    }
    try {
      await upsertDocument(
        'admins',
        newAdminUid.trim(),
        {
          uid: newAdminUid.trim(),
          email: newAdminEmail.trim(),
          displayName: newAdminName.trim(),
          role: newAdminRole,
        },
        true,
        `Added admin user ${newAdminEmail.trim()} (${newAdminRole})`,
        true
      );
      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminName('');
      showToast('Admin user added', 'success');
    } catch {
      showToast('Failed to add administrator', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-5"
      >
        <h3 className="text-base font-display font-semibold">Global Site &amp; SEO Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Brand Wordmark (Navbar)</label>
            <input
              type="text"
              required
              value={settings.brandWordmark}
              onChange={(e) =>
                setSettings({ ...settings, brandWordmark: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">SEO Page Title</label>
            <input
              type="text"
              required
              value={seo.siteTitle}
              onChange={(e) => setSeo({ ...seo, siteTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Meta Description</label>
          <textarea
            rows={2}
            required
            value={seo.metaDescription}
            onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Open Graph Title</label>
            <input
              type="text"
              value={seo.ogTitle}
              onChange={(e) => setSeo({ ...seo, ogTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Keywords</label>
            <input
              type="text"
              value={seo.keywords}
              onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={settings.enableCustomCursor}
              onChange={(e) =>
                setSettings({ ...settings, enableCustomCursor: e.target.checked })
              }
            />
            <span>Enable Desktop Precision Cursor</span>
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={settings.enableParticles}
              onChange={(e) =>
                setSettings({ ...settings, enableParticles: e.target.checked })
              }
            />
            <span>Enable Hero Geometric Particle Field</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-28 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <MediaImage mediaId={seo.ogImageMediaId} useThumbnail className="w-full h-full" />
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Select Open Graph Share Image</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save SEO & Site Settings'}</span>
        </button>
      </form>

      {/* Role-Based Admin Access Control */}
      {isBootstrappedAdmin && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base font-display font-semibold">
              Administrator Roles
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage additional CMS editor or super-admin UIDs. Your primary account ({auth.currentUser?.email}) is always authorized.
            </p>
          </div>

          <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Firebase Auth UID"
              value={newAdminUid}
              onChange={(e) => setNewAdminUid(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs font-mono"
            />
            <input
              type="email"
              placeholder="Email address"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
            />
            <input
              type="text"
              placeholder="Display Name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
            />
            <div className="flex gap-2">
              <select
                value={newAdminRole}
                onChange={(e) =>
                  setNewAdminRole(e.target.value as 'editor' | 'super_admin')
                }
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
              >
                <option value="editor">Editor</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </form>

          {adminUsers.length > 0 && (
            <div className="space-y-2">
              {adminUsers.map((adm) => (
                <div
                  key={adm.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div>
                    <p className="font-medium">{adm.displayName}</p>
                    <p className="text-slate-500">
                      {adm.email} · {adm.role}
                    </p>
                  </div>
                  {adm.uid !== auth.currentUser?.uid && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteDocument(
                            'admins',
                            adm.id,
                            `Removed admin access for ${adm.email}`
                          );
                          showToast('Admin user removed', 'success');
                        } catch {
                          showToast('Failed to remove admin user', 'error');
                        }
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        selectedId={seo.ogImageMediaId}
        onSelect={(mediaId) => setSeo({ ...seo, ogImageMediaId: mediaId })}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
