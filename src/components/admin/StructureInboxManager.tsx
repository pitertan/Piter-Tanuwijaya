import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Mail,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';
import {
  buildSocialLinkPayload,
  clampString,
  isValidNavHref,
} from '../../lib/validation';
import type {
  ContactInformation,
  ContactMessage,
  FooterSettings,
  NavigationItem,
  PortfolioSection,
  SectionLayoutStyle,
  SocialLink,
} from '../../types/portfolio';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function SectionsNavigationManager() {
  const { data, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const sections = [...data.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const navItems = [...data.navigation].sort((a, b) => a.sortOrder - b.sortOrder);

  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavHref, setNewNavHref] = useState('');
  const [newNavLoc, setNewNavLoc] = useState<NavigationItem['location']>('both');

  const updateSection = async (sec: PortfolioSection, patch: Partial<PortfolioSection>) => {
    const next = { ...sec, ...patch };
    if (!next.title.trim()) {
      showToast('Section title cannot be empty.', 'error');
      return;
    }
    try {
      await upsertDocument(
        'portfolio_sections',
        sec.id,
        {
          sectionKey: next.sectionKey,
          title: clampString(next.title, 140),
          subtitle: clampString(next.subtitle || '', 300),
          description: clampString(next.description || '', 1000),
          layoutStyle: next.layoutStyle,
          isVisible: next.isVisible,
          sortOrder: Math.round(next.sortOrder || 0),
        },
        false,
        `Updated section "${next.title.trim()}"`
      );
      showToast(`Updated ${next.title.trim()}`, 'success');
    } catch {
      showToast('Failed to update section', 'error');
    }
  };

  const swapSectionOrder = async (sec: PortfolioSection, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === sec.id);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const other = sections[targetIdx];
    await updateSection(sec, { sortOrder: other.sortOrder });
    await updateSection(other, { sortOrder: sec.sortOrder });
  };

  const handleAddNav = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNavLabel.trim() || !isValidNavHref(newNavHref)) {
      showToast(
        'Provide a valid label and target (e.g. #projects or https://...).',
        'error'
      );
      return;
    }
    const id = `nav-${Date.now()}`;
    try {
      await upsertDocument(
        'navigation_items',
        id,
        {
          label: clampString(newNavLabel, 40),
          href: clampString(newNavHref, 200),
          location: newNavLoc,
          isVisible: true,
          sortOrder: navItems.length + 1,
        },
        true,
        `Added navigation link "${newNavLabel.trim()}"`
      );
      setNewNavLabel('');
      setNewNavHref('');
      showToast('Navigation link added', 'success');
    } catch {
      showToast('Failed to add navigation link', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Dynamic Portfolio Sections */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4">
        <div>
          <h3 className="text-base font-display font-semibold">
            Dynamic Section Visibility, Ordering &amp; Layouts
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control the order, titles, visibility, and layout preferences for every section on the public portfolio.
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#090C12] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <input
                  type="text"
                  aria-label={`Title for ${sec.sectionKey}`}
                  defaultValue={sec.title}
                  onBlur={(e) => {
                    if (e.target.value !== sec.title) {
                      updateSection(sec, { title: e.target.value });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-xs font-medium"
                />
                <input
                  type="text"
                  aria-label={`Subtitle for ${sec.sectionKey}`}
                  defaultValue={sec.subtitle}
                  onBlur={(e) => {
                    if (e.target.value !== sec.subtitle) {
                      updateSection(sec, { subtitle: e.target.value });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-xs"
                />
                <select
                  aria-label={`Layout style for ${sec.sectionKey}`}
                  value={sec.layoutStyle}
                  onChange={(e) =>
                    updateSection(sec, {
                      layoutStyle: e.target.value as SectionLayoutStyle,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-xs"
                >
                  {['editorial', 'grid', 'timeline', 'bento', 'masonry', 'split'].map(
                    (style) => (
                      <option key={style} value={style}>
                        Layout: {style}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => swapSectionOrder(sec, -1)}
                  aria-label={`Move ${sec.title} up`}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === sections.length - 1}
                  onClick={() => swapSectionOrder(sec, 1)}
                  aria-label={`Move ${sec.title} down`}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSection(sec, { isVisible: !sec.isVisible })}
                  aria-label={
                    sec.isVisible ? `Hide ${sec.title}` : `Show ${sec.title}`
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                >
                  {sec.isVisible ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Menu Manager */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4">
        <h3 className="text-base font-display font-semibold">Navigation Menu</h3>

        <form onSubmit={handleAddNav} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Label (e.g. Projects)"
            value={newNavLabel}
            onChange={(e) => setNewNavLabel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <input
            type="text"
            required
            placeholder="Target (#projects)"
            value={newNavHref}
            onChange={(e) => setNewNavHref(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs font-mono"
          />
          <select
            value={newNavLoc}
            onChange={(e) =>
              setNewNavLoc(e.target.value as NavigationItem['location'])
            }
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          >
            <option value="both">Header &amp; Footer</option>
            <option value="header">Header Only</option>
            <option value="footer">Footer Only</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </form>

        <div className="space-y-2">
          {navItems.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{item.label}</span>
                <span className="font-mono text-slate-500">{item.href}</span>
                <span className="text-slate-400">({item.location})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await upsertDocument(
                        'navigation_items',
                        item.id,
                        {
                          label: clampString(item.label, 40),
                          href: clampString(item.href, 200),
                          location: item.location,
                          isVisible: !item.isVisible,
                          sortOrder: Math.round(item.sortOrder || 0),
                        },
                        false,
                        `Toggled nav link "${item.label}"`
                      );
                      showToast(
                        !item.isVisible ? 'Navigation link shown' : 'Navigation link hidden',
                        'info'
                      );
                    } catch {
                      showToast('Failed to update navigation link', 'error');
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  {item.isVisible ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteDocument(
                        'navigation_items',
                        item.id,
                        `Deleted navigation item "${item.label}"`
                      );
                      showToast('Navigation link deleted', 'success');
                    } catch {
                      showToast('Failed to delete navigation link', 'error');
                    }
                  }}
                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContactInboxManager() {
  const {
    data,
    contactMessages,
    saveSingleton,
    updateContactMessage,
    deleteDocument,
  } = usePortfolio();
  const { showToast } = useToast();

  const [contactInfo, setContactInfo] = useState<ContactInformation>(data.contactInfo);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  useEffect(() => {
    setContactInfo(data.contactInfo);
  }, [data.contactInfo]);

  const filteredMessages = contactMessages.filter(
    (m) => statusFilter === 'all' || m.status === statusFilter
  );

  const saveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInfo.email.trim() || contactInfo.email.trim().length < 3) {
      showToast('A valid contact email is required.', 'error');
      return;
    }
    try {
      await saveSingleton(
        'contact_information',
        'main',
        {
          email: clampString(contactInfo.email, 200),
          phone: clampString(contactInfo.phone || '', 60),
          location: clampString(contactInfo.location || '', 160),
          responseExpectation: clampString(contactInfo.responseExpectation || '', 240),
          formHeading: clampString(contactInfo.formHeading || '', 160),
        },
        'Updated public contact information'
      );
      showToast('Contact information saved', 'success');
    } catch {
      showToast('Failed to save contact information', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={saveContactInfo}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
      >
        <h3 className="text-base font-display font-semibold">Public Contact Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="email"
            required
            value={contactInfo.email}
            onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
            placeholder="Email"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
          <input
            type="text"
            value={contactInfo.phone}
            onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
            placeholder="Phone"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
          <input
            type="text"
            value={contactInfo.location}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, location: e.target.value })
            }
            placeholder="Location"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={contactInfo.formHeading}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, formHeading: e.target.value })
            }
            placeholder="Contact Form Heading"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
          <input
            type="text"
            value={contactInfo.responseExpectation}
            onChange={(e) =>
              setContactInfo({
                ...contactInfo,
                responseExpectation: e.target.value,
              })
            }
            placeholder="Response expectation"
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Contact Details</span>
        </button>
      </form>

      {/* Incoming Messages Inbox */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-display font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <span>Contact Messages Inbox ({contactMessages.length})</span>
          </h3>

          <select
            aria-label="Filter messages by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          >
            {['all', 'unread', 'read', 'replied', 'archived'].map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>
        </div>

        {filteredMessages.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No messages in this view.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-2 max-h-[460px] overflow-y-auto">
              {filteredMessages.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    setActiveMessage(msg);
                    setNotesDraft(msg.adminNotes || '');
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    activeMessage?.id === msg.id
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold truncate">{msg.name}</p>
                    <span className="text-[11px] font-mono uppercase text-blue-500">
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1 truncate">{msg.subject}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {msg.email}
                  </p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/70 dark:bg-[#090C12]">
              {activeMessage ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-display font-semibold">
                        {activeMessage.subject}
                      </h4>
                      <p className="text-xs text-slate-500">
                        From {activeMessage.name} ({activeMessage.email})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(activeMessage)}
                      aria-label="Delete message"
                      className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm whitespace-pre-line leading-relaxed p-4 rounded-xl bg-white dark:bg-[#0F131A] border border-slate-200 dark:border-slate-800">
                    {activeMessage.message}
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Admin Notes</label>
                    <textarea
                      rows={3}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(['read', 'replied', 'archived'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={async () => {
                          try {
                            await updateContactMessage(activeMessage.id, activeMessage, {
                              status,
                              adminNotes: notesDraft,
                            });
                            setActiveMessage({
                              ...activeMessage,
                              status,
                              adminNotes: notesDraft,
                            });
                            showToast(`Message marked ${status}`, 'success');
                          } catch {
                            showToast('Failed to update message status', 'error');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-xs font-medium hover:border-blue-500"
                      >
                        Mark {status}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-12 text-center">
                  Select an inquiry to inspect details and update status.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        destructive
        title="Delete inquiry message?"
        description="This permanently removes the contact submission."
        confirmLabel="Delete Message"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteDocument(
              'contact_messages',
              deleteTarget.id,
              `Deleted contact message from ${deleteTarget.email}`
            );
            if (activeMessage?.id === deleteTarget.id) setActiveMessage(null);
            setDeleteTarget(null);
            showToast('Message deleted', 'success');
          } catch {
            showToast('Failed to delete message', 'error');
          }
        }}
      />
    </div>
  );
}

export function FooterSocialManager() {
  const { data, saveSingleton, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const [footer, setFooter] = useState<FooterSettings>(data.footer);
  const [platform, setPlatform] = useState('');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [editPlatform, setEditPlatform] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [savingSocialId, setSavingSocialId] = useState<string | null>(null);

  useEffect(() => {
    setFooter(data.footer);
  }, [data.footer]);

  const socialLinks = [...data.socialLinks].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const handleSaveFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footer.copyrightText.trim()) {
      showToast('Copyright text is required.', 'error');
      return;
    }
    try {
      await saveSingleton(
        'footer_settings',
        'main',
        {
          brandStatement: clampString(footer.brandStatement || '', 400),
          copyrightText: clampString(footer.copyrightText, 200),
          showBackToTop: footer.showBackToTop,
        },
        'Updated footer settings'
      );
      showToast('Footer updated', 'success');
    } catch {
      showToast('Failed to save footer settings', 'error');
    }
  };

  const handleAddSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    const validated = buildSocialLinkPayload({
      platform,
      label,
      url,
      isVisible: true,
      sortOrder: socialLinks.length + 1,
    });
    if (!validated.valid || !validated.data) {
      showToast(validated.error || 'Platform and URL are required.', 'error');
      return;
    }
    const id = `soc-${Date.now()}`;
    try {
      await upsertDocument<Omit<SocialLink, 'id'>>(
        'social_links',
        id,
        validated.data,
        true,
        `Added social link "${validated.data.platform}"`
      );
      setPlatform('');
      setLabel('');
      setUrl('');
      showToast('Social link added', 'success');
    } catch {
      showToast('Failed to add social link', 'error');
    }
  };

  const startEditSocial = (soc: SocialLink) => {
    setEditingSocialId(soc.id);
    setEditPlatform(soc.platform);
    setEditLabel(soc.label);
    setEditUrl(soc.url);
    setEditVisible(soc.isVisible);
  };

  const cancelEditSocial = () => {
    setEditingSocialId(null);
    setEditPlatform('');
    setEditLabel('');
    setEditUrl('');
    setEditVisible(true);
  };

  const handleSaveEditSocial = async (e: React.FormEvent, soc: SocialLink) => {
    e.preventDefault();
    const validated = buildSocialLinkPayload({
      platform: editPlatform,
      label: editLabel,
      url: editUrl,
      isVisible: editVisible,
      sortOrder: soc.sortOrder ?? 0,
    });
    if (!validated.valid || !validated.data) {
      showToast(validated.error || 'Please check the social link fields.', 'error');
      return;
    }
    setSavingSocialId(soc.id);
    try {
      await upsertDocument<Omit<SocialLink, 'id'>>(
        'social_links',
        soc.id,
        validated.data,
        false,
        `Updated social link "${validated.data.platform}"`
      );
      cancelEditSocial();
      showToast('Social link updated', 'success');
    } catch {
      showToast('Failed to update social link', 'error');
    } finally {
      setSavingSocialId(null);
    }
  };

  const handleToggleSocialVisibility = async (soc: SocialLink) => {
    const validated = buildSocialLinkPayload({
      platform: soc.platform,
      label: soc.label,
      url: soc.url,
      isVisible: !soc.isVisible,
      sortOrder: soc.sortOrder ?? 0,
    });
    if (!validated.valid || !validated.data) return;
    try {
      await upsertDocument<Omit<SocialLink, 'id'>>(
        'social_links',
        soc.id,
        validated.data,
        false,
        `Toggled visibility for social link "${soc.platform}"`
      );
      showToast(
        validated.data.isVisible ? 'Social link shown' : 'Social link hidden',
        'info'
      );
    } catch {
      showToast('Failed to update social link visibility', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSaveFooter}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
      >
        <h3 className="text-base font-display font-semibold">Footer Configuration</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Brand Statement</label>
          <textarea
            rows={2}
            value={footer.brandStatement}
            onChange={(e) => setFooter({ ...footer, brandStatement: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Copyright Text</label>
          <input
            type="text"
            required
            value={footer.copyrightText}
            onChange={(e) => setFooter({ ...footer, copyrightText: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={footer.showBackToTop}
            onChange={(e) =>
              setFooter({ ...footer, showBackToTop: e.target.checked })
            }
          />
          <span>Show Back-to-Top Button</span>
        </label>
        <div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Footer</span>
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4">
        <h3 className="text-base font-display font-semibold">Social Media Links</h3>
        <form onSubmit={handleAddSocial} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Platform (GitHub)"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <input
            type="text"
            placeholder="Handle / Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <input
            type="url"
            required
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors"
          >
            Add Social Link
          </button>
        </form>

        <div className="space-y-2">
          {socialLinks.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
              No social links added yet.
            </p>
          ) : (
            socialLinks.map((soc) => {
              const isEditing = editingSocialId === soc.id;
              const isSaving = savingSocialId === soc.id;

              return (
                <div
                  key={soc.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveEditSocial(e, soc)}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          required
                          aria-label={`Platform for ${soc.platform}`}
                          placeholder="Platform (GitHub)"
                          value={editPlatform}
                          onChange={(e) => setEditPlatform(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
                        />
                        <input
                          type="text"
                          aria-label={`Handle or label for ${soc.platform}`}
                          placeholder="Handle / Label"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
                        />
                        <input
                          type="url"
                          required
                          aria-label={`URL for ${soc.platform}`}
                          placeholder="https://..."
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={editVisible}
                            onChange={(e) => setEditVisible(e.target.checked)}
                          />
                          <span>Visible on portfolio</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelEditSocial}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-60"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold">{soc.platform}</span>
                        {soc.label && soc.label !== soc.platform && (
                          <span className="text-slate-500 dark:text-slate-400">
                            ({soc.label})
                          </span>
                        )}
                        <span className="text-slate-500 truncate">· {soc.url}</span>
                        {!soc.isVisible && (
                          <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                            · Hidden
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSocialVisibility(soc)}
                          aria-label={
                            soc.isVisible
                              ? `Hide ${soc.platform}`
                              : `Show ${soc.platform}`
                          }
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {soc.isVisible ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditSocial(soc)}
                          aria-label={`Edit social link ${soc.platform}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteDocument(
                                'social_links',
                                soc.id,
                                `Deleted social link "${soc.platform}"`
                              );
                              if (editingSocialId === soc.id) {
                                cancelEditSocial();
                              }
                              showToast('Social link deleted', 'success');
                            } catch {
                              showToast('Failed to delete social link', 'error');
                            }
                          }}
                          aria-label={`Delete social link ${soc.platform}`}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

