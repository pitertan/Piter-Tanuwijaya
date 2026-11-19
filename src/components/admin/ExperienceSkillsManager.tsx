import React, { useState } from 'react';
import { Edit3, Eye, EyeOff, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';
import { clampString, clampStringArray, slugify } from '../../lib/validation';
import type {
  ExperienceItem,
  SkillCategory,
  SkillItem,
  SkillProficiency,
} from '../../types/portfolio';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MediaImage } from '../common/MediaImage';
import { MediaPickerModal } from './MediaPickerModal';

export function ExperienceManager() {
  const { data, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const experiences = [...data.experiences].sort((a, b) => a.sortOrder - b.sortOrder);
  const [editing, setEditing] = useState<ExperienceItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [respText, setRespText] = useState('');
  const [achText, setAchText] = useState('');
  const [pickerMode, setPickerMode] = useState<'logo' | 'gallery' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExperienceItem | null>(null);

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: `exp-${Date.now()}`,
      companyName: '',
      companyLogoMediaId: '',
      jobPosition: '',
      period: '2024 — Present',
      location: '',
      description: '',
      responsibilities: [],
      achievements: [],
      imageMediaIds: [],
      isPublished: true,
      sortOrder: experiences.length + 1,
    });
    setRespText('');
    setAchText('');
  };

  const openEdit = (exp: ExperienceItem) => {
    setIsNew(false);
    setEditing({
      ...exp,
      imageMediaIds: [...(exp.imageMediaIds ?? [])],
    });
    setRespText((exp.responsibilities ?? []).join('\n'));
    setAchText((exp.achievements ?? []).join('\n'));
  };

  const toCleanExperiencePayload = (exp: ExperienceItem, nextResp: string[], nextAch: string[]) => ({
    companyName: clampString(exp.companyName, 120),
    companyLogoMediaId: exp.companyLogoMediaId || '',
    jobPosition: clampString(exp.jobPosition, 140),
    period: clampString(exp.period, 80),
    location: clampString(exp.location || '', 120),
    description: clampString(exp.description, 2000),
    responsibilities: nextResp,
    achievements: nextAch,
    imageMediaIds: Array.from(new Set((exp.imageMediaIds ?? []).filter(Boolean))).slice(0, 8),
    isPublished: exp.isPublished,
    sortOrder: Math.round(exp.sortOrder || 0),
  });

  const reorderExperienceImage = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const next = [...(editing.imageMediaIds ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setEditing({ ...editing, imageMediaIds: next });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (
      !editing.jobPosition.trim() ||
      !editing.companyName.trim() ||
      !editing.period.trim() ||
      !editing.description.trim()
    ) {
      showToast('Job Position, Company Name, Period, and Summary are required.', 'error');
      return;
    }
    try {
      await upsertDocument(
        'experiences',
        editing.id,
        toCleanExperiencePayload(
          editing,
          clampStringArray(respText.split('\n'), 15),
          clampStringArray(achText.split('\n'), 15)
        ),
        isNew,
        `${isNew ? 'Created' : 'Updated'} experience at "${editing.companyName.trim()}"`,
        true
      );
      showToast('Experience saved', 'success');
      setEditing(null);
    } catch {
      showToast('Failed to save experience', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-display font-semibold">Work Experience</h3>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-500"
        >
          <Plus className="w-4 h-4" />
          <span>Add Experience</span>
        </button>
      </div>

      <div className="space-y-3">
        {experiences.map((exp) => (
          <div
            key={exp.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              {exp.companyLogoMediaId && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                  <MediaImage mediaId={exp.companyLogoMediaId} useThumbnail className="w-full h-full" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold truncate">
                  {exp.jobPosition} · {exp.companyName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {exp.period} · {(exp.imageMediaIds ?? []).length} photos ·{' '}
                  {exp.isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const updated = { ...exp, isPublished: !exp.isPublished };
                    await upsertDocument(
                      'experiences',
                      exp.id,
                      toCleanExperiencePayload(
                        updated,
                        exp.responsibilities ?? [],
                        exp.achievements ?? []
                      ),
                      false,
                      `Toggled visibility for ${exp.companyName}`,
                      true
                    );
                    showToast(
                      updated.isPublished ? 'Experience published' : 'Experience hidden',
                      'info'
                    );
                  } catch {
                    showToast('Failed to update experience visibility', 'error');
                  }
                }}
                aria-label={`Toggle publish for ${exp.companyName}`}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
              >
                {exp.isPublished ? (
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => openEdit(exp)}
                aria-label={`Edit ${exp.companyName}`}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(exp)}
                aria-label={`Delete ${exp.companyName}`}
                className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold">
                {isNew ? 'New Experience' : `Edit ${editing.companyName}`}
              </h3>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Job Position</label>
                <input
                  type="text"
                  required
                  value={editing.jobPosition}
                  onChange={(e) => setEditing({ ...editing, jobPosition: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Company Name</label>
                <input
                  type="text"
                  required
                  value={editing.companyName}
                  onChange={(e) => setEditing({ ...editing, companyName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Employment Period</label>
                <input
                  type="text"
                  required
                  value={editing.period}
                  onChange={(e) => setEditing({ ...editing, period: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Location</label>
                <input
                  type="text"
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Role Summary</label>
              <textarea
                rows={3}
                required
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Responsibilities (one per line)</label>
                <textarea
                  rows={4}
                  value={respText}
                  onChange={(e) => setRespText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Achievements (one per line)</label>
                <textarea
                  rows={4}
                  value={achText}
                  onChange={(e) => setAchText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
                />
              </div>
            </div>

            {/* Company Logo & Documentation Photos */}
            <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {editing.companyLogoMediaId ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                      <MediaImage
                        mediaId={editing.companyLogoMediaId}
                        useThumbnail
                        className="w-full h-full"
                      />
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs font-medium">Company Logo</p>
                    <p className="text-[11px] text-slate-500">
                      Shown next to your role title in the experience timeline.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPickerMode('logo')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {editing.companyLogoMediaId ? 'Change Company Logo' : 'Select Company Logo'}
                  </button>
                  {editing.companyLogoMediaId && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, companyLogoMediaId: '' })}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium">
                      Documentation Photos ({(editing.imageMediaIds ?? []).length}/8)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Displayed at the bottom of the expanded experience card.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={(editing.imageMediaIds ?? []).length >= 8}
                    onClick={() => setPickerMode('gallery')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Add Photo</span>
                  </button>
                </div>

                {(editing.imageMediaIds ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-3 px-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No documentation photos attached yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {(editing.imageMediaIds ?? []).map((mId, idx) => (
                      <div
                        key={`${mId}-${idx}`}
                        className="w-32 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900"
                      >
                        <div className="aspect-video">
                          <MediaImage mediaId={mId} useThumbnail className="w-full h-full" />
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 text-[11px]">
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => reorderExperienceImage(idx, -1)}
                              aria-label="Move documentation photo earlier"
                              className="disabled:opacity-30"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              disabled={idx === (editing.imageMediaIds ?? []).length - 1}
                              onClick={() => reorderExperienceImage(idx, 1)}
                              aria-label="Move documentation photo later"
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
                                imageMediaIds: (editing.imageMediaIds ?? []).filter(
                                  (_, i) => i !== idx
                                ),
                              })
                            }
                            aria-label="Remove documentation photo"
                            className="text-rose-500 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
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
                  Save Experience
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={Boolean(pickerMode)}
        title={
          pickerMode === 'logo'
            ? 'Select Company Logo'
            : 'Add Experience Documentation Photo'
        }
        selectedId={pickerMode === 'logo' ? editing?.companyLogoMediaId : undefined}
        onSelect={(mediaId) => {
          if (!editing) return;
          if (pickerMode === 'logo') {
            setEditing({ ...editing, companyLogoMediaId: mediaId });
          } else if (pickerMode === 'gallery') {
            const current = editing.imageMediaIds ?? [];
            if (current.includes(mediaId)) {
              showToast('Photo already added to this experience.', 'info');
              return;
            }
            if (current.length >= 8) {
              showToast('Maximum 8 documentation photos per experience.', 'info');
              return;
            }
            setEditing({ ...editing, imageMediaIds: [...current, mediaId] });
          }
        }}
        onClose={() => setPickerMode(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        destructive
        title={`Delete experience at "${deleteTarget?.companyName}"?`}
        description="This permanently deletes this timeline entry."
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteDocument(
              'experiences',
              deleteTarget.id,
              `Deleted experience "${deleteTarget.companyName}"`
            );
            showToast('Experience deleted', 'success');
            setDeleteTarget(null);
          } catch {
            showToast('Failed to delete experience', 'error');
          }
        }}
      />
    </div>
  );
}

export function SkillsManager() {
  const { data, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const [newCatName, setNewCatName] = useState('');
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [isNewSkill, setIsNewSkill] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }
    const id = `cat-${slugify(newCatName)}-${Date.now().toString(36)}`;
    try {
      await upsertDocument<Omit<SkillCategory, 'id'>>(
        'skill_categories',
        id,
        {
          name: clampString(newCatName, 80),
          slug: slugify(newCatName),
          description: '',
          isVisible: true,
          sortOrder: data.skillCategories.length + 1,
        },
        true,
        `Created skill category "${newCatName.trim()}"`
      );
      setNewCatName('');
      showToast('Skill category added', 'success');
    } catch {
      showToast('Failed to add skill category', 'error');
    }
  };

  const openNewSkill = () => {
    setIsNewSkill(true);
    setEditingSkill({
      id: `sk-${Date.now()}`,
      name: '',
      categoryId: data.skillCategories[0]?.id || '',
      description: '',
      proficiencyLevel: 'Core',
      yearsExperience: 3,
      iconName: 'Cpu',
      iconMediaId: '',
      isPublished: true,
      sortOrder: data.skills.length + 1,
    });
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill || !editingSkill.name.trim() || !editingSkill.categoryId) {
      showToast('Skill name and category are required.', 'error');
      return;
    }
    try {
      await upsertDocument(
        'skills',
        editingSkill.id,
        {
          name: clampString(editingSkill.name, 80),
          categoryId: editingSkill.categoryId,
          description: clampString(editingSkill.description || '', 400),
          proficiencyLevel: editingSkill.proficiencyLevel,
          yearsExperience: Math.max(0, Math.min(50, Math.round(editingSkill.yearsExperience))),
          iconName: editingSkill.iconName || 'Cpu',
          iconMediaId: editingSkill.iconMediaId || '',
          isPublished: editingSkill.isPublished,
          sortOrder: Math.round(editingSkill.sortOrder || 0),
        },
        isNewSkill,
        `${isNewSkill ? 'Created' : 'Updated'} skill "${editingSkill.name.trim()}"`
      );
      showToast('Skill saved', 'success');
      setEditingSkill(null);
    } catch {
      showToast('Failed to save skill', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Categories */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4">
        <h3 className="text-base font-display font-semibold">Skill Categories</h3>
        <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name (e.g. Embedded AI)"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
          >
            Add Category
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {data.skillCategories.map((cat) => (
            <div
              key={cat.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
            >
              <span>{cat.name}</span>
              <button
                type="button"
                aria-label={`Delete category ${cat.name}`}
                onClick={async () => {
                  try {
                    await deleteDocument(
                      'skill_categories',
                      cat.id,
                      `Deleted skill category "${cat.name}"`
                    );
                    showToast('Category deleted', 'success');
                  } catch {
                    showToast('Failed to delete category', 'error');
                  }
                }}
                className="text-rose-500 hover:text-rose-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Skills List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-display font-semibold">Skills &amp; Capabilities</h3>
          <button
            type="button"
            onClick={openNewSkill}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skill</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.skills.map((sk) => (
            <div
              key={sk.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold truncate">{sk.name}</p>
                <p className="text-xs text-slate-500">
                  {sk.proficiencyLevel} · {sk.yearsExperience} yrs ·{' '}
                  {sk.isPublished ? 'Published' : 'Hidden'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewSkill(false);
                    setEditingSkill({ ...sk });
                  }}
                  aria-label={`Edit skill ${sk.name}`}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteDocument('skills', sk.id, `Deleted skill "${sk.name}"`);
                      showToast('Skill deleted', 'success');
                    } catch {
                      showToast('Failed to delete skill', 'error');
                    }
                  }}
                  aria-label={`Delete skill ${sk.name}`}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingSkill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveSkill}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold">
                {isNewSkill ? 'Add Skill' : `Edit ${editingSkill.name}`}
              </h3>
              <button type="button" onClick={() => setEditingSkill(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Skill Name</label>
              <input
                type="text"
                required
                value={editingSkill.name}
                onChange={(e) =>
                  setEditingSkill({ ...editingSkill, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Category</label>
                <select
                  value={editingSkill.categoryId}
                  onChange={(e) =>
                    setEditingSkill({ ...editingSkill, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                >
                  {data.skillCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Proficiency Tier</label>
                <select
                  value={editingSkill.proficiencyLevel}
                  onChange={(e) =>
                    setEditingSkill({
                      ...editingSkill,
                      proficiencyLevel: e.target.value as SkillProficiency,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                >
                  {['Core', 'Advanced', 'Proficient', 'Exploring'].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Years Experience</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={editingSkill.yearsExperience}
                  onChange={(e) =>
                    setEditingSkill({
                      ...editingSkill,
                      yearsExperience: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Icon Name</label>
                <select
                  value={editingSkill.iconName}
                  onChange={(e) =>
                    setEditingSkill({ ...editingSkill, iconName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
                >
                  {[
                    'Cpu',
                    'Terminal',
                    'Code2',
                    'Box',
                    'CircuitBoard',
                    'Gauge',
                    'ShieldCheck',
                    'Network',
                    'Wrench',
                  ].map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Description</label>
              <textarea
                rows={3}
                value={editingSkill.description}
                onChange={(e) =>
                  setEditingSkill({ ...editingSkill, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={editingSkill.isPublished}
                onChange={(e) =>
                  setEditingSkill({ ...editingSkill, isPublished: e.target.checked })
                }
              />
              <span>Published</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSkill(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                Save Skill
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
