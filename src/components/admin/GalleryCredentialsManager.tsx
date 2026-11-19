import React, { useState } from 'react';
import { Edit3, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';
import { clampString, slugify } from '../../lib/validation';
import type {
  AchievementItem,
  CertificationItem,
  EducationItem,
  GalleryItem,
} from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';
import { MediaPickerModal } from './MediaPickerModal';

export function GalleryManager() {
  const { data, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }
    const id = `gcat-${slugify(newCat)}-${Date.now().toString(36)}`;
    try {
      await upsertDocument(
        'gallery_categories',
        id,
        {
          name: clampString(newCat, 80),
          slug: slugify(newCat),
          sortOrder: data.galleryCategories.length + 1,
        },
        true,
        `Added gallery category "${newCat.trim()}"`
      );
      setNewCat('');
      showToast('Gallery category added', 'success');
    } catch {
      showToast('Failed to add gallery category', 'error');
    }
  };

  const openNewItem = () => {
    setIsNew(true);
    setEditing({
      id: `gal-${Date.now()}`,
      title: '',
      caption: '',
      categoryId: data.galleryCategories[0]?.id || '',
      mediaId: data.mediaLibrary[0]?.id || '',
      aspectRatio: '16:9',
      isPublished: true,
      sortOrder: data.galleries.length + 1,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.title.trim() || !editing.mediaId || !editing.categoryId) {
      showToast('Title, category, and image are required.', 'error');
      return;
    }
    try {
      await upsertDocument(
        'galleries',
        editing.id,
        {
          title: clampString(editing.title, 140),
          caption: clampString(editing.caption || '', 400),
          categoryId: editing.categoryId,
          mediaId: editing.mediaId,
          aspectRatio: editing.aspectRatio,
          isPublished: editing.isPublished,
          sortOrder: Math.round(editing.sortOrder || 0),
        },
        isNew,
        `${isNew ? 'Added' : 'Updated'} gallery item "${editing.title.trim()}"`,
        true
      );
      showToast('Gallery item saved', 'success');
      setEditing(null);
    } catch {
      showToast('Failed to save gallery item', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4">
        <h3 className="text-base font-display font-semibold">Gallery Categories</h3>
        <form onSubmit={handleAddCat} className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
          >
            Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {data.galleryCategories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
            >
              {c.name}
              <button
                type="button"
                aria-label={`Delete category ${c.name}`}
                onClick={async () => {
                  try {
                    await deleteDocument(
                      'gallery_categories',
                      c.id,
                      `Deleted gallery category "${c.name}"`
                    );
                    showToast('Gallery category deleted', 'success');
                  } catch {
                    showToast('Failed to delete gallery category', 'error');
                  }
                }}
                className="text-rose-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-display font-semibold">Gallery Entries</h3>
        <button
          type="button"
          onClick={openNewItem}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Gallery Item</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.galleries.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] overflow-hidden"
          >
            <div className="aspect-video">
              <MediaImage mediaId={item.mediaId} useThumbnail className="w-full h-full" />
            </div>
            <div className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold truncate">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500">
                  {item.isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditing({ ...item });
                  }}
                  aria-label={`Edit ${item.title}`}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteDocument(
                        'galleries',
                        item.id,
                        `Deleted gallery item "${item.title}"`
                      );
                      showToast('Gallery item deleted', 'success');
                    } catch {
                      showToast('Failed to delete gallery item', 'error');
                    }
                  }}
                  aria-label={`Delete ${item.title}`}
                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold">
                {isNew ? 'Add Gallery Item' : `Edit ${editing.title}`}
              </h3>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Title</label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Caption</label>
              <textarea
                rows={2}
                value={editing.caption}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Category</label>
                <select
                  value={editing.categoryId}
                  onChange={(e) =>
                    setEditing({ ...editing, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                >
                  {data.galleryCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Aspect Ratio</label>
                <select
                  value={editing.aspectRatio}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      aspectRatio: e.target.value as GalleryItem['aspectRatio'],
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                >
                  {['16:9', '4:3', '3:4', '1:1'].map((ar) => (
                    <option key={ar} value={ar}>
                      {ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
              >
                Select Image from Library
              </button>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editing.isPublished}
                  onChange={(e) =>
                    setEditing({ ...editing, isPublished: e.target.checked })
                  }
                />
                <span>Published</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                Save Gallery Item
              </button>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        selectedId={editing?.mediaId}
        onSelect={(mediaId) => editing && setEditing({ ...editing, mediaId })}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

export function CredentialsEducationManager() {
  const { data, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const [subTab, setSubTab] = useState<'achievements' | 'certifications' | 'education'>(
    'achievements'
  );
  const [pickerFor, setPickerFor] = useState<'ach' | 'cert' | 'edu' | null>(null);

  const [editAch, setEditAch] = useState<AchievementItem | null>(null);
  const [editCert, setEditCert] = useState<CertificationItem | null>(null);
  const [editEdu, setEditEdu] = useState<EducationItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-[#0F131A] border border-slate-200 dark:border-slate-800">
          {[
            { id: 'achievements', label: 'Achievements' },
            { id: 'certifications', label: 'Certifications' },
            { id: 'education', label: 'Education' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setSubTab(t.id as 'achievements' | 'certifications' | 'education')
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium ${
                subTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsNew(true);
            if (subTab === 'achievements') {
              setEditAch({
                id: `ach-${Date.now()}`,
                title: '',
                organization: '',
                issueDate: '2025',
                description: '',
                verificationUrl: '',
                mediaId: '',
                isPublished: true,
                sortOrder: data.achievements.length + 1,
              });
            } else if (subTab === 'certifications') {
              setEditCert({
                id: `cert-${Date.now()}`,
                title: '',
                organization: '',
                issueDate: '2025',
                credentialId: '',
                description: '',
                verificationUrl: '',
                mediaId: '',
                isPublished: true,
                sortOrder: data.certifications.length + 1,
              });
            } else {
              setEditEdu({
                id: `edu-${Date.now()}`,
                institution: '',
                degree: '',
                studyPeriod: '',
                location: '',
                description: '',
                logoMediaId: '',
                isPublished: true,
                sortOrder: data.education.length + 1,
              });
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Entry</span>
        </button>
      </div>

      {subTab === 'achievements' && (
        <div className="space-y-3">
          {data.achievements.map((ach) => (
            <div
              key={ach.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold truncate">{ach.title}</p>
                <p className="text-xs text-slate-500">
                  {ach.organization} · {ach.issueDate}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await upsertDocument(
                        'achievements',
                        ach.id,
                        {
                          title: clampString(ach.title, 160),
                          organization: clampString(ach.organization, 140),
                          issueDate: clampString(ach.issueDate, 60),
                          description: clampString(ach.description || '', 1000),
                          verificationUrl: clampString(ach.verificationUrl || '', 400),
                          mediaId: ach.mediaId || '',
                          isPublished: !ach.isPublished,
                          sortOrder: Math.round(ach.sortOrder || 0),
                        },
                        false,
                        `Toggled achievement "${ach.title}"`
                      );
                      showToast(
                        !ach.isPublished ? 'Achievement published' : 'Achievement hidden',
                        'info'
                      );
                    } catch {
                      showToast('Failed to update achievement', 'error');
                    }
                  }}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  {ach.isPublished ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditAch({ ...ach });
                  }}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteDocument(
                        'achievements',
                        ach.id,
                        `Deleted achievement "${ach.title}"`
                      );
                      showToast('Achievement deleted', 'success');
                    } catch {
                      showToast('Failed to delete achievement', 'error');
                    }
                  }}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'certifications' && (
        <div className="space-y-3">
          {data.certifications.map((cert) => (
            <div
              key={cert.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold truncate">{cert.title}</p>
                <p className="text-xs text-slate-500">
                  {cert.organization} · {cert.issueDate}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditCert({ ...cert });
                  }}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteDocument(
                        'certifications',
                        cert.id,
                        `Deleted certification "${cert.title}"`
                      );
                      showToast('Certification deleted', 'success');
                    } catch {
                      showToast('Failed to delete certification', 'error');
                    }
                  }}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'education' && (
        <div className="space-y-3">
          {data.education.map((edu) => (
            <div
              key={edu.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold truncate">
                  {edu.institution}
                </p>
                <p className="text-xs text-slate-500">
                  {edu.degree} · {edu.studyPeriod}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsNew(false);
                    setEditEdu({ ...edu });
                  }}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteDocument(
                        'education',
                        edu.id,
                        `Deleted education "${edu.institution}"`
                      );
                      showToast('Education entry deleted', 'success');
                    } catch {
                      showToast('Failed to delete education entry', 'error');
                    }
                  }}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Achievement Form Modal */}
      {editAch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editAch.title.trim() || !editAch.organization.trim() || !editAch.issueDate.trim()) {
                showToast('Title, Organization, and Issue Date are required.', 'error');
                return;
              }
              try {
                await upsertDocument(
                  'achievements',
                  editAch.id,
                  {
                    title: clampString(editAch.title, 160),
                    organization: clampString(editAch.organization, 140),
                    issueDate: clampString(editAch.issueDate, 60),
                    description: clampString(editAch.description || '', 1000),
                    verificationUrl: clampString(editAch.verificationUrl || '', 400),
                    mediaId: editAch.mediaId || '',
                    isPublished: editAch.isPublished,
                    sortOrder: Math.round(editAch.sortOrder || 0),
                  },
                  isNew,
                  `Saved achievement "${editAch.title.trim()}"`
                );
                showToast('Achievement saved', 'success');
                setEditAch(null);
              } catch {
                showToast('Failed to save achievement', 'error');
              }
            }}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-base font-display font-semibold">Achievement</h4>
              <button type="button" onClick={() => setEditAch(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Title"
              value={editAch.title}
              onChange={(e) => setEditAch({ ...editAch, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Organization"
                value={editAch.organization}
                onChange={(e) =>
                  setEditAch({ ...editAch, organization: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
              <input
                type="text"
                required
                placeholder="Issue Date"
                value={editAch.issueDate}
                onChange={(e) => setEditAch({ ...editAch, issueDate: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>
            <textarea
              rows={3}
              placeholder="Description"
              value={editAch.description}
              onChange={(e) => setEditAch({ ...editAch, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <input
              type="url"
              placeholder="Verification URL"
              value={editAch.verificationUrl}
              onChange={(e) =>
                setEditAch({ ...editAch, verificationUrl: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPickerFor('ach')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
              >
                Select Certificate Image
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Certification Form Modal */}
      {editCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editCert.title.trim() || !editCert.organization.trim() || !editCert.issueDate.trim()) {
                showToast('Title, Issuer, and Issue Date are required.', 'error');
                return;
              }
              try {
                await upsertDocument(
                  'certifications',
                  editCert.id,
                  {
                    title: clampString(editCert.title, 160),
                    organization: clampString(editCert.organization, 140),
                    issueDate: clampString(editCert.issueDate, 60),
                    credentialId: clampString(editCert.credentialId || '', 100),
                    description: clampString(editCert.description || '', 1000),
                    verificationUrl: clampString(editCert.verificationUrl || '', 400),
                    mediaId: editCert.mediaId || '',
                    isPublished: editCert.isPublished,
                    sortOrder: Math.round(editCert.sortOrder || 0),
                  },
                  isNew,
                  `Saved certification "${editCert.title.trim()}"`
                );
                showToast('Certification saved', 'success');
                setEditCert(null);
              } catch {
                showToast('Failed to save certification', 'error');
              }
            }}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-base font-display font-semibold">Certification</h4>
              <button type="button" onClick={() => setEditCert(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Certification Title"
              value={editCert.title}
              onChange={(e) => setEditCert({ ...editCert, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Issuer"
                value={editCert.organization}
                onChange={(e) =>
                  setEditCert({ ...editCert, organization: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
              <input
                type="text"
                required
                placeholder="Issue Date"
                value={editCert.issueDate}
                onChange={(e) => setEditCert({ ...editCert, issueDate: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Credential ID"
              value={editCert.credentialId}
              onChange={(e) =>
                setEditCert({ ...editCert, credentialId: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm font-mono"
            />
            <textarea
              rows={3}
              placeholder="Description"
              value={editCert.description}
              onChange={(e) =>
                setEditCert({ ...editCert, description: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <input
              type="url"
              placeholder="Verification URL"
              value={editCert.verificationUrl}
              onChange={(e) =>
                setEditCert({ ...editCert, verificationUrl: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPickerFor('cert')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
              >
                Select Certificate Image
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Education Form Modal */}
      {editEdu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editEdu.institution.trim() || !editEdu.degree.trim() || !editEdu.studyPeriod.trim()) {
                showToast('Institution, Degree, and Study Period are required.', 'error');
                return;
              }
              try {
                await upsertDocument(
                  'education',
                  editEdu.id,
                  {
                    institution: clampString(editEdu.institution, 160),
                    degree: clampString(editEdu.degree, 160),
                    studyPeriod: clampString(editEdu.studyPeriod, 80),
                    location: clampString(editEdu.location || '', 120),
                    description: clampString(editEdu.description || '', 1500),
                    logoMediaId: editEdu.logoMediaId || '',
                    isPublished: editEdu.isPublished,
                    sortOrder: Math.round(editEdu.sortOrder || 0),
                  },
                  isNew,
                  `Saved education "${editEdu.institution.trim()}"`
                );
                showToast('Education saved', 'success');
                setEditEdu(null);
              } catch {
                showToast('Failed to save education entry', 'error');
              }
            }}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-base font-display font-semibold">Education</h4>
              <button type="button" onClick={() => setEditEdu(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Institution"
              value={editEdu.institution}
              onChange={(e) => setEditEdu({ ...editEdu, institution: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <input
              type="text"
              required
              placeholder="Degree / Qualification"
              value={editEdu.degree}
              onChange={(e) => setEditEdu({ ...editEdu, degree: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Study Period"
                value={editEdu.studyPeriod}
                onChange={(e) =>
                  setEditEdu({ ...editEdu, studyPeriod: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
              <input
                type="text"
                placeholder="Location"
                value={editEdu.location}
                onChange={(e) => setEditEdu({ ...editEdu, location: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>
            <textarea
              rows={3}
              placeholder="Description"
              value={editEdu.description}
              onChange={(e) => setEditEdu({ ...editEdu, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
            />
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPickerFor('edu')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
              >
                Select Institution Logo
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={Boolean(pickerFor)}
        onSelect={(mediaId) => {
          if (pickerFor === 'ach' && editAch) setEditAch({ ...editAch, mediaId });
          if (pickerFor === 'cert' && editCert) setEditCert({ ...editCert, mediaId });
          if (pickerFor === 'edu' && editEdu)
            setEditEdu({ ...editEdu, logoMediaId: mediaId });
        }}
        onClose={() => setPickerFor(null)}
      />
    </div>
  );
}
