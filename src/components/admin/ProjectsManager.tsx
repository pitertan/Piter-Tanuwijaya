import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';
import { clampString, clampStringArray, slugify } from '../../lib/validation';
import type { ProjectItem } from '../../types/portfolio';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MediaImage } from '../common/MediaImage';
import { MediaPickerModal } from './MediaPickerModal';

export function ProjectsManager() {
  const { data, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const projects = [...data.projects].sort((a, b) => a.sortOrder - b.sortOrder);

  const [editing, setEditing] = useState<ProjectItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [pickerMode, setPickerMode] = useState<'cover' | 'gallery' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);

  const openCreate = () => {
    const defaultMedia = data.mediaLibrary[0]?.id || 'media-orbital-telemetry';
    setIsNew(true);
    setEditing({
      id: `proj-${Date.now()}`,
      title: '',
      slug: '',
      summary: '',
      description: '',
      category: 'Spatial Software',
      technologies: [],
      projectDate: String(new Date().getFullYear()),
      role: 'Principal Systems Architect',
      projectUrl: '',
      coverMediaId: defaultMedia,
      galleryMediaIds: [defaultMedia],
      isFeatured: false,
      isPublished: true,
      sortOrder: projects.length + 1,
    });
    setTechInput('');
  };

  const openEdit = (proj: ProjectItem) => {
    setIsNew(false);
    setEditing({ ...proj });
    setTechInput((proj.technologies ?? []).join(', '));
  };

  const toCleanProjectPayload = (proj: ProjectItem, techs: string[]) => ({
    title: clampString(proj.title, 140),
    slug: slugify(proj.slug || proj.title),
    summary: clampString(proj.summary, 400),
    description: clampString(proj.description || proj.summary, 5000),
    category: clampString(proj.category, 80),
    technologies: techs,
    projectDate: clampString(proj.projectDate, 60),
    role: clampString(proj.role, 120),
    projectUrl: clampString(proj.projectUrl || '', 400),
    coverMediaId: proj.coverMediaId,
    galleryMediaIds: (proj.galleryMediaIds ?? []).slice(0, 20),
    isFeatured: Boolean(proj.isFeatured),
    isPublished: Boolean(proj.isPublished),
    sortOrder: Math.round(proj.sortOrder || 0),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (
      !editing.title.trim() ||
      !editing.summary.trim() ||
      !editing.category.trim() ||
      !editing.role.trim() ||
      !editing.projectDate.trim() ||
      !editing.coverMediaId
    ) {
      showToast('Title, category, role, date, summary, and cover image are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const techs = clampStringArray(techInput.split(','), 20, 60);
      await upsertDocument(
        'projects',
        editing.id,
        toCleanProjectPayload(editing, techs),
        isNew,
        `${isNew ? 'Created' : 'Updated'} project "${editing.title.trim()}"`,
        true
      );
      showToast(isNew ? 'Project created' : 'Project updated', 'success');
      setEditing(null);
    } catch {
      showToast('Unable to save project', 'error');
    } finally {
      setSaving(false);
    }
  };

  const moveOrder = async (proj: ProjectItem, dir: -1 | 1) => {
    const idx = projects.findIndex((p) => p.id === proj.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= projects.length) return;
    const other = projects[swapIdx];
    try {
      await upsertDocument(
        'projects',
        proj.id,
        toCleanProjectPayload({ ...proj, sortOrder: other.sortOrder }, proj.technologies ?? []),
        false,
        `Reordered project "${proj.title}"`,
        true
      );
      await upsertDocument(
        'projects',
        other.id,
        toCleanProjectPayload({ ...other, sortOrder: proj.sortOrder }, other.technologies ?? []),
        false,
        `Reordered project "${other.title}"`,
        true
      );
    } catch {
      showToast('Unable to reorder projects', 'error');
    }
  };

  const togglePublish = async (proj: ProjectItem) => {
    try {
      await upsertDocument(
        'projects',
        proj.id,
        toCleanProjectPayload({ ...proj, isPublished: !proj.isPublished }, proj.technologies ?? []),
        false,
        `${proj.isPublished ? 'Unpublished' : 'Published'} project "${proj.title}"`,
        true
      );
      showToast(proj.isPublished ? 'Project unpublished' : 'Project published', 'info');
    } catch {
      showToast('Unable to update project visibility', 'error');
    }
  };

  const reorderGalleryImage = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const next = [...editing.galleryMediaIds];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setEditing({ ...editing, galleryMediaIds: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-display font-semibold">Projects &amp; Case Studies</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage cover imagery, multi-image galleries, visibility, and display ordering.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-10 text-center text-sm text-slate-500">
          No projects configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((proj, idx) => (
            <div
              key={proj.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-20 aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                  <MediaImage mediaId={proj.coverMediaId} useThumbnail className="w-full h-full" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-display font-semibold truncate">
                      {proj.title}
                    </h4>
                    {proj.isFeatured && (
                      <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {proj.category} · {proj.projectDate} · {proj.galleryMediaIds.length} images ·{' '}
                    {proj.isPublished ? 'Published' : 'Draft'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveOrder(proj, -1)}
                  aria-label={`Move ${proj.title} up`}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === projects.length - 1}
                  onClick={() => moveOrder(proj, 1)}
                  aria-label={`Move ${proj.title} down`}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => togglePublish(proj)}
                  aria-label={
                    proj.isPublished
                      ? `Unpublish ${proj.title}`
                      : `Publish ${proj.title}`
                  }
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  {proj.isPublished ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(proj)}
                  aria-label={`Edit ${proj.title}`}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(proj)}
                  aria-label={`Delete ${proj.title}`}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold">
                {isNew ? 'Create Project' : `Edit: ${editing.title}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close project editor"
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Project Title</label>
                <input
                  type="text"
                  required
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Category</label>
                <input
                  type="text"
                  required
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Role</label>
                <input
                  type="text"
                  required
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Date / Year</label>
                <input
                  type="text"
                  required
                  value={editing.projectDate}
                  onChange={(e) =>
                    setEditing({ ...editing, projectDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Summary</label>
              <textarea
                rows={2}
                required
                value={editing.summary}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Full Case Study Description</label>
              <textarea
                rows={5}
                required
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Technologies (comma separated)
                </label>
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="Rust, TypeScript, WebGL"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">External Project URL</label>
                <input
                  type="url"
                  value={editing.projectUrl}
                  onChange={(e) =>
                    setEditing({ ...editing, projectUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
            </div>

            {/* Cover & Multi-image Gallery Manager */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Cover Image</p>
                <button
                  type="button"
                  onClick={() => setPickerMode('cover')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Change Cover Image
                </button>
              </div>
              <div className="w-40 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <MediaImage mediaId={editing.coverMediaId} useThumbnail className="w-full h-full" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs font-medium">
                  Project Gallery Images ({editing.galleryMediaIds.length})
                </p>
                <button
                  type="button"
                  onClick={() => setPickerMode('gallery')}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>Add Gallery Image</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {editing.galleryMediaIds.map((mId, idx) => (
                  <div
                    key={`${mId}-${idx}`}
                    className="w-28 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900"
                  >
                    <div className="aspect-video">
                      <MediaImage mediaId={mId} useThumbnail className="w-full h-full" />
                    </div>
                    <div className="flex items-center justify-between px-1.5 py-1 text-[11px]">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => reorderGalleryImage(idx, -1)}
                          aria-label="Move image earlier"
                          className="disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={idx === editing.galleryMediaIds.length - 1}
                          onClick={() => reorderGalleryImage(idx, 1)}
                          aria-label="Move image later"
                          className="disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            galleryMediaIds: editing.galleryMediaIds.filter(
                              (_, i) => i !== idx
                            ),
                          })
                        }
                        aria-label="Remove gallery image"
                        className="text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={editing.isFeatured}
                  onChange={(e) =>
                    setEditing({ ...editing, isFeatured: e.target.checked })
                  }
                />
                <span>Featured in Showcase</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium">
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={Boolean(pickerMode)}
        selectedId={pickerMode === 'cover' ? editing?.coverMediaId : undefined}
        onSelect={(mediaId) => {
          if (!editing) return;
          if (pickerMode === 'cover') {
            setEditing({ ...editing, coverMediaId: mediaId });
          } else if (pickerMode === 'gallery') {
            if (!editing.galleryMediaIds.includes(mediaId)) {
              setEditing({
                ...editing,
                galleryMediaIds: [...editing.galleryMediaIds, mediaId],
              });
            }
          }
        }}
        onClose={() => setPickerMode(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        destructive
        title={`Delete "${deleteTarget?.title}"?`}
        description="This permanently removes the project from your portfolio."
        confirmLabel="Delete Project"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteDocument(
              'projects',
              deleteTarget.id,
              `Deleted project "${deleteTarget.title}"`
            );
            showToast('Project deleted', 'success');
            setDeleteTarget(null);
          } catch {
            showToast('Unable to delete project', 'error');
          }
        }}
      />
    </div>
  );
}
