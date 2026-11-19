import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Edit3,
  ImagePlus,
  Link2,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';
import { auth } from '../../lib/firebase';
import { resolveAssetUrl } from '../../lib/routing';
import {
  findMediaReferences,
  findOrphanedMedia,
  validateMediaFile,
  validateMediaImageUrl,
} from '../../lib/validation';
import type { AllowedMediaMime, MediaAsset } from '../../types/portfolio';
import { ConfirmDialog } from '../common/ConfirmDialog';

async function probeImageUrlDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 1200,
        height: img.naturalHeight || 800,
      });
    };
    img.onerror = () => {
      resolve({ width: 1200, height: 800 });
    };
    img.src = url;
  });
}

async function generateImageMetadataAndThumbnail(file: File): Promise<{
  width: number;
  height: number;
  thumbnailBlob: Blob | null;
}> {
  if (file.type === 'image/svg+xml') {
    return { width: 800, height: 600, thumbnailBlob: null };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 600;
      const maxDim = 480;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const tw = Math.max(1, Math.round(width * scale));
      const th = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve({ width, height, thumbnailBlob: null });
        return;
      }
      ctx.drawImage(img, 0, 0, tw, th);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve({ width, height, thumbnailBlob: blob });
        },
        'image/webp',
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 800, height: 600, thumbnailBlob: null });
    };
    img.src = url;
  });
}

export function MediaLibraryManager() {
  const { data, upsertDocument, deleteDocument } = usePortfolio();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [orphansOnly, setOrphansOnly] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('General');
  const [editUrl, setEditUrl] = useState('');

  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [addingByUrl, setAddingByUrl] = useState(false);
  const [brokenAssetIds, setBrokenAssetIds] = useState<Record<string, boolean>>({});

  const [replacingAsset, setReplacingAsset] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const orphanedIds = useMemo(() => {
    return new Set(findOrphanedMedia(data.mediaLibrary, data).map((m) => m.id));
  }, [data]);

  const categories = useMemo(() => {
    const base = new Set(['General', 'Portraits', 'Hardware', 'Software', 'Spatial', 'Studio']);
    data.mediaLibrary.forEach((m) => base.add(m.category));
    return ['All', ...Array.from(base)];
  }, [data.mediaLibrary]);

  const filteredAssets = useMemo(() => {
    return data.mediaLibrary.filter((asset) => {
      if (orphansOnly && !orphanedIds.has(asset.id)) return false;
      if (categoryFilter !== 'All' && asset.category !== categoryFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        asset.title.toLowerCase().includes(q) ||
        asset.altText.toLowerCase().includes(q) ||
        asset.filename.toLowerCase().includes(q)
      );
    });
  }, [data.mediaLibrary, orphansOnly, orphanedIds, categoryFilter, searchQuery]);

  const handleUploadFiles = async (files: FileList | null, replaceExisting?: MediaAsset) => {
    if (!files || files.length === 0) return;
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      showToast('Authentication token missing', 'error');
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const check = validateMediaFile(file.type, file.size);
        if (!check.valid) {
          showToast(check.error || 'Invalid file', 'error', file.name);
          continue;
        }

        const { width, height, thumbnailBlob } = await generateImageMetadataAndThumbnail(file);
        const formData = new FormData();
        formData.append('file', file);
        if (thumbnailBlob) {
          formData.append('thumbnail', thumbnailBlob, 'thumb.webp');
        }

        const resp = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          showToast(
            'Upload server unavailable here',
            'error',
            'Static hosting (GitHub Pages) has no upload backend. Use "Add Image via URL" below instead.'
          );
          break;
        }

        const payload = await resp.json();
        if (!resp.ok) {
          showToast(payload.error || 'Upload failed', 'error', file.name);
          continue;
        }

        if (replaceExisting) {
          await upsertDocument(
            'media_library',
            replaceExisting.id,
            {
              title: replaceExisting.title,
              altText: replaceExisting.altText,
              description: replaceExisting.description || '',
              category: replaceExisting.category || 'General',
              url: payload.url,
              thumbnailUrl: payload.thumbnailUrl,
              mimeType: payload.mimeType as AllowedMediaMime,
              sizeBytes: Math.round(payload.sizeBytes),
              width: Math.round(width),
              height: Math.round(height),
              filename: payload.filename,
              createdBy: replaceExisting.createdBy || auth.currentUser?.uid || 'admin',
            },
            false,
            `Replaced media file for "${replaceExisting.title}"`,
            true
          );
          showToast('Image replaced', 'success', replaceExisting.title);
        } else {
          const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const cleanTitle =
            file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Uploaded Image';
          await upsertDocument(
            'media_library',
            mediaId,
            {
              title: cleanTitle.slice(0, 160),
              altText: cleanTitle.slice(0, 300),
              description: '',
              category: uploadCategory,
              url: payload.url,
              thumbnailUrl: payload.thumbnailUrl,
              mimeType: payload.mimeType as AllowedMediaMime,
              sizeBytes: Math.round(payload.sizeBytes),
              width: Math.round(width),
              height: Math.round(height),
              filename: payload.filename,
              createdBy: auth.currentUser?.uid || 'admin',
            },
            true,
            `Uploaded media asset "${cleanTitle}"`,
            true
          );
          showToast('Uploaded image', 'success', cleanTitle);
        }
      }
    } catch (err) {
      showToast(
        'Upload error',
        'error',
        err instanceof Error ? err.message : 'Unable to upload file.'
      );
    } finally {
      setUploading(false);
      setReplacingAsset(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleAddExternalUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateMediaImageUrl(externalUrl);
    if (!check.valid || !check.normalizedUrl) {
      showToast('Invalid Image URL', 'error', check.error);
      return;
    }

    setAddingByUrl(true);
    try {
      const urlToUse = check.normalizedUrl;
      const resolvedForProbe = resolveAssetUrl(
        urlToUse,
        import.meta.env.BASE_URL,
        window.location.pathname,
        window.location.hostname
      );
      const dims = await probeImageUrlDimensions(resolvedForProbe);
      const rawName = urlToUse.split('/').pop()?.split('?')[0] || 'remote-image.jpg';
      const cleanTitle =
        externalTitle.trim() ||
        rawName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() ||
        'Hosted Image';
      const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      await upsertDocument(
        'media_library',
        mediaId,
        {
          title: cleanTitle.slice(0, 160),
          altText: cleanTitle.slice(0, 300),
          description: '',
          category: uploadCategory,
          url: urlToUse,
          thumbnailUrl: urlToUse,
          mimeType: urlToUse.toLowerCase().endsWith('.png')
            ? 'image/png'
            : urlToUse.toLowerCase().endsWith('.webp')
            ? 'image/webp'
            : urlToUse.toLowerCase().endsWith('.svg')
            ? 'image/svg+xml'
            : 'image/jpeg',
          sizeBytes: 0,
          width: Math.round(dims.width),
          height: Math.round(dims.height),
          filename: rawName.slice(0, 200),
          createdBy: auth.currentUser?.uid || 'admin',
        },
        true,
        `Added external media URL "${cleanTitle}"`,
        true
      );
      setExternalUrl('');
      setExternalTitle('');
      showToast('Image URL added', 'success', cleanTitle);
    } catch (err) {
      showToast(
        'Failed to add image URL',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setAddingByUrl(false);
    }
  };

  const openEdit = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setEditTitle(asset.title);
    setEditAlt(asset.altText);
    setEditDesc(asset.description);
    setEditCat(asset.category);
    setEditUrl(asset.url);
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    if (!editTitle.trim() || !editAlt.trim()) {
      showToast('Title and Alt Text are required.', 'error');
      return;
    }
    const urlCheck = validateMediaImageUrl(editUrl);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      showToast('Invalid Image URL', 'error', urlCheck.error);
      return;
    }

    const nextUrl = urlCheck.normalizedUrl;
    const urlChanged = nextUrl !== editingAsset.url;

    try {
      await upsertDocument(
        'media_library',
        editingAsset.id,
        {
          title: editTitle.trim().slice(0, 160),
          altText: editAlt.trim().slice(0, 300),
          description: editDesc.trim().slice(0, 600),
          category: editCat.trim() || 'General',
          url: nextUrl,
          thumbnailUrl: urlChanged ? nextUrl : editingAsset.thumbnailUrl,
          mimeType: editingAsset.mimeType,
          sizeBytes: Math.round(editingAsset.sizeBytes),
          width: Math.round(editingAsset.width),
          height: Math.round(editingAsset.height),
          filename: editingAsset.filename,
          createdBy: editingAsset.createdBy || auth.currentUser?.uid || 'admin',
        },
        false,
        `Updated metadata for media "${editTitle.trim()}"`,
        true
      );
      if (urlChanged) {
        setBrokenAssetIds((prev) => ({ ...prev, [editingAsset.id]: false }));
      }
      showToast('Media details saved', 'success');
      setEditingAsset(null);
    } catch {
      showToast('Failed to save media details', 'error');
    }
  };

  const deleteReferences = useMemo(() => {
    if (!deleteTarget) return [];
    return findMediaReferences(deleteTarget.id, data);
  }, [deleteTarget, data]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteReferences.length > 0) {
      showToast(
        'Deletion blocked',
        'error',
        'Reassign referenced items before deleting this image.'
      );
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token && deleteTarget.url.startsWith('/uploads/')) {
        await fetch(`/api/media/file/${encodeURIComponent(deleteTarget.filename)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await deleteDocument(
        'media_library',
        deleteTarget.id,
        `Deleted media asset "${deleteTarget.title}"`
      );
      showToast('Media deleted', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleUploadFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0F131A]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={(e) => handleUploadFiles(e.target.files)}
          className="hidden"
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={(e) =>
            handleUploadFiles(e.target.files, replacingAsset || undefined)
          }
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-base font-display font-semibold">
            Upload Images to Centralized Media Library
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag and drop JPG, PNG, WebP, or SVG files (max 10MB). SVGs are automatically sanitized and thumbnails are generated automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <select
              aria-label="Target upload category"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
            >
              {['General', 'Portraits', 'Hardware', 'Software', 'Spatial', 'Studio'].map(
                (c) => (
                  <option key={c} value={c}>
                    Category: {c}
                  </option>
                )
              )}
            </select>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-60"
            >
              <ImagePlus className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Select Files'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Hosted Image by URL (Works on GitHub Pages & static hosting) */}
      <form
        onSubmit={handleAddExternalUrl}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-4 sm:p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <h3 className="text-sm font-display font-semibold">
            Add Hosted Image URL (Recommended for GitHub Pages)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Files uploaded via the local server live only in <code className="font-mono">/uploads/</code> and do not persist on static GitHub Pages unless committed. Paste a permanent <code className="font-mono">https://</code> image URL here so it renders everywhere.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="url"
            required
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://example.com/your-photo.jpg"
            aria-label="External image URL"
            className="sm:col-span-6 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <input
            type="text"
            value={externalTitle}
            onChange={(e) => setExternalTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="External image title"
            className="sm:col-span-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs"
          />
          <button
            type="submit"
            disabled={addingByUrl}
            className="sm:col-span-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-60"
          >
            {addingByUrl ? 'Adding...' : 'Add URL'}
          </button>
        </div>
      </form>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, alt text, or filename..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter media by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-xs"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOrphansOnly((v) => !v)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
              orphansOnly
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-slate-600 dark:text-slate-300'
            }`}
          >
            Unused Media ({orphanedIds.size})
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {filteredAssets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-12 text-center text-sm text-slate-500">
          No media assets match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredAssets.map((asset) => {
            const refCount = findMediaReferences(asset.id, data).length;
            return (
              <div
                key={asset.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900">
                  <img
                    src={resolveAssetUrl(
                      asset.thumbnailUrl || asset.url,
                      import.meta.env.BASE_URL,
                      typeof window !== 'undefined' ? window.location.pathname : '/',
                      typeof window !== 'undefined' ? window.location.hostname : ''
                    )}
                    alt={asset.altText}
                    referrerPolicy="no-referrer"
                    onLoad={() =>
                      setBrokenAssetIds((prev) =>
                        prev[asset.id] ? { ...prev, [asset.id]: false } : prev
                      )
                    }
                    onError={() =>
                      setBrokenAssetIds((prev) => ({ ...prev, [asset.id]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                  {brokenAssetIds[asset.id] && (
                    <div className="absolute inset-0 bg-amber-950/85 text-amber-200 p-3 flex flex-col items-center justify-center text-center gap-1.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] font-medium leading-tight">
                        File missing on this host
                      </span>
                      <span className="text-[10px] text-amber-300/90 leading-tight">
                        Click Edit to set an https:// URL or Replace file
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-display font-semibold truncate">
                      {asset.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {asset.category} · {asset.width}×{asset.height} ·{' '}
                      {Math.max(1, Math.round(asset.sizeBytes / 1024))} KB
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {refCount > 0
                        ? `Used in ${refCount} ${refCount === 1 ? 'place' : 'places'}`
                        : 'Orphaned (unused)'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => openEdit(asset)}
                      aria-label={`Edit metadata for ${asset.title}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReplacingAsset(asset);
                        replaceInputRef.current?.click();
                      }}
                      aria-label={`Replace image file for ${asset.title}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(asset)}
                      aria-label={`Delete ${asset.title}`}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Metadata Editor Modal */}
      {editingAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveMetadata}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold">Edit Media Details</h3>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                aria-label="Close media editor"
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Alternative Text (SEO &amp; Accessibility)</label>
              <input
                type="text"
                required
                value={editAlt}
                onChange={(e) => setEditAlt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Category</label>
              <input
                type="text"
                value={editCat}
                onChange={(e) => setEditCat(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Image URL (https:// or /uploads/...)</label>
              <input
                type="text"
                required
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Description</label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reference-Checked Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        destructive={deleteReferences.length === 0}
        busy={deleting}
        title={
          deleteReferences.length > 0
            ? 'Cannot Delete Referenced Asset'
            : `Delete "${deleteTarget?.title}"?`
        }
        description={
          deleteReferences.length > 0
            ? 'This image is currently referenced by live portfolio sections. Reassign those sections to another image before deleting.'
            : 'This will permanently remove the asset record and file from the Media Library.'
        }
        details={deleteReferences.map(
          (r) => `${r.entityType}: ${r.entityLabel} (${r.field})`
        )}
        confirmLabel={deleteReferences.length > 0 ? 'Understood' : 'Delete Permanently'}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={
          deleteReferences.length > 0
            ? () => setDeleteTarget(null)
            : handleConfirmDelete
        }
      />
    </div>
  );
}
