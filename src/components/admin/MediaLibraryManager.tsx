import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FolderOpen,
  FolderSync,
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
import {
  deleteDriveFile,
  DriveAuthExpiredError,
  type DriveFolderInfo,
  type DriveListedImage,
  ensureDriveFilePublicReadable,
  ensurePortfolioDriveFolder,
  extractDriveFileId,
  listDriveFolderImages,
  PORTFOLIO_DRIVE_FOLDER_NAME,
  uploadImageToDriveFolder,
} from '../../lib/googleDrive';
import { resolveAssetUrl } from '../../lib/routing';
import {
  findMediaReferences,
  findOrphanedMedia,
  validateMediaFile,
  validateMediaImageUrl,
} from '../../lib/validation';
import type { AllowedMediaMime, MediaAsset } from '../../types/portfolio';
import { ConfirmDialog } from '../common/ConfirmDialog';

async function probeImageFileDimensions(file: File): Promise<{
  width: number;
  height: number;
}> {
  if (file.type === 'image/svg+xml') {
    return { width: 800, height: 600 };
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const width = img.naturalWidth || 1200;
      const height = img.naturalHeight || 800;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 1200, height: 800 });
    };
    img.src = url;
  });
}

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

export function MediaLibraryManager() {
  const {
    data,
    driveAccessToken,
    connectGoogleDrive,
    clearDriveAccessToken,
    upsertDocument,
    deleteDocument,
  } = usePortfolio();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [driveFolder, setDriveFolder] = useState<DriveFolderInfo | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [pendingSyncImages, setPendingSyncImages] = useState<DriveListedImage[] | null>(
    null
  );

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
  const [showUrlSection, setShowUrlSection] = useState(false);
  const [brokenAssetIds, setBrokenAssetIds] = useState<Record<string, boolean>>({});

  const [pendingReplaceConfirm, setPendingReplaceConfirm] = useState<MediaAsset | null>(
    null
  );
  const [replacingAsset, setReplacingAsset] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Automatically resolve the dedicated portfolio folder once Drive token is in memory
  useEffect(() => {
    let active = true;
    if (!driveAccessToken) {
      setDriveFolder(null);
      return;
    }
    ensurePortfolioDriveFolder(driveAccessToken)
      .then((folder) => {
        if (active) setDriveFolder(folder);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof DriveAuthExpiredError) {
          clearDriveAccessToken();
        }
      });
    return () => {
      active = false;
    };
  }, [driveAccessToken, clearDriveAccessToken]);

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

  const handleConnectDrive = async (): Promise<string | null> => {
    setConnectingDrive(true);
    try {
      const token = await connectGoogleDrive();
      if (!token) {
        showToast(
          'Google Drive token missing',
          'error',
          'Please authorize Google Drive access in the Google sign-in popup.'
        );
        return null;
      }
      const folder = await ensurePortfolioDriveFolder(token);
      setDriveFolder(folder);
      showToast('Google Drive connected', 'success', `Folder "${folder.name}" ready`);
      return token;
    } catch (err) {
      showToast(
        'Failed to connect Google Drive',
        'error',
        err instanceof Error ? err.message : undefined
      );
      return null;
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleUploadFiles = async (
    files: FileList | null,
    replaceExisting?: MediaAsset,
    overrideToken?: string | null
  ) => {
    if (!files || files.length === 0) return;

    const token = overrideToken ?? driveAccessToken;
    if (!token) {
      showToast(
        'Connect Google Drive first',
        'error',
        'Click "Connect Google Drive" so uploads save directly to your portfolio Drive folder.'
      );
      return;
    }

    setUploading(true);
    try {
      const folder = driveFolder || (await ensurePortfolioDriveFolder(token));
      setDriveFolder(folder);

      for (const file of Array.from(files)) {
        const check = validateMediaFile(file.type, file.size);
        if (!check.valid) {
          showToast(check.error || 'Invalid file', 'error', file.name);
          continue;
        }

        const { width, height } = await probeImageFileDimensions(file);
        const cleanTitle =
          file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() ||
          'Portfolio Image';

        const uploaded = await uploadImageToDriveFolder({
          accessToken: token,
          folderId: folder.id,
          file,
          width,
          height,
          title: replaceExisting ? replaceExisting.title : cleanTitle,
        });

        if (replaceExisting) {
          const oldDriveId = extractDriveFileId(replaceExisting.url);
          if (oldDriveId && oldDriveId !== uploaded.fileId) {
            try {
              await deleteDriveFile(token, oldDriveId);
            } catch {
              // Non-fatal if old file was already removed from Drive
            }
          }
          await upsertDocument(
            'media_library',
            replaceExisting.id,
            {
              title: replaceExisting.title,
              altText: replaceExisting.altText,
              description: replaceExisting.description || '',
              category: replaceExisting.category || 'General',
              url: uploaded.url,
              thumbnailUrl: uploaded.thumbnailUrl,
              mimeType: uploaded.mimeType,
              sizeBytes: Math.round(uploaded.sizeBytes),
              width: Math.round(uploaded.width),
              height: Math.round(uploaded.height),
              filename: uploaded.name.slice(0, 200),
              createdBy: replaceExisting.createdBy || auth.currentUser?.uid || 'admin',
            },
            false,
            `Replaced Google Drive media file for "${replaceExisting.title}"`,
            true
          );
          setBrokenAssetIds((prev) => ({ ...prev, [replaceExisting.id]: false }));
          showToast('Image replaced in Google Drive', 'success', replaceExisting.title);
        } else {
          const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          await upsertDocument(
            'media_library',
            mediaId,
            {
              title: cleanTitle.slice(0, 160),
              altText: cleanTitle.slice(0, 300),
              description: '',
              category: uploadCategory,
              url: uploaded.url,
              thumbnailUrl: uploaded.thumbnailUrl,
              mimeType: uploaded.mimeType,
              sizeBytes: Math.round(uploaded.sizeBytes),
              width: Math.round(uploaded.width),
              height: Math.round(uploaded.height),
              filename: uploaded.name.slice(0, 200),
              createdBy: auth.currentUser?.uid || 'admin',
            },
            true,
            `Uploaded "${cleanTitle}" to Google Drive folder`,
            true
          );
          showToast('Uploaded to Google Drive', 'success', cleanTitle);
        }
      }
    } catch (err) {
      if (err instanceof DriveAuthExpiredError) {
        clearDriveAccessToken();
        showToast('Google Drive session expired', 'error', 'Click "Connect Google Drive" and try again.');
      } else {
        showToast(
          'Google Drive upload error',
          'error',
          err instanceof Error ? err.message : 'Unable to upload file to Google Drive.'
        );
      }
    } finally {
      setUploading(false);
      setReplacingAsset(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleSelectFilesClick = async () => {
    if (!driveAccessToken) {
      const token = await handleConnectDrive();
      if (!token) return;
      fileInputRef.current?.click();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleCheckSyncFromDrive = async () => {
    let token = driveAccessToken;
    if (!token) {
      token = await handleConnectDrive();
      if (!token) return;
    }

    setSyncingDrive(true);
    try {
      const folder = driveFolder || (await ensurePortfolioDriveFolder(token));
      setDriveFolder(folder);
      const files = await listDriveFolderImages(token, folder.id);
      const existingDriveIds = new Set(
        data.mediaLibrary
          .map((m) => extractDriveFileId(m.url))
          .filter((id): id is string => Boolean(id))
      );
      const unlinked = files.filter((f) => !existingDriveIds.has(f.id));
      if (unlinked.length === 0) {
        showToast('Already up to date', 'info', 'All images in your Drive folder are already in the Media Library.');
        return;
      }
      setPendingSyncImages(unlinked);
    } catch (err) {
      if (err instanceof DriveAuthExpiredError) {
        clearDriveAccessToken();
        showToast('Google Drive session expired', 'error', 'Please reconnect Google Drive.');
      } else {
        showToast(
          'Failed to scan Drive folder',
          'error',
          err instanceof Error ? err.message : undefined
        );
      }
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleConfirmSyncImport = async () => {
    if (!pendingSyncImages || pendingSyncImages.length === 0) return;
    const token = driveAccessToken;
    if (!token) {
      setPendingSyncImages(null);
      showToast('Connect Google Drive first', 'error');
      return;
    }

    setSyncingDrive(true);
    try {
      let imported = 0;
      for (const item of pendingSyncImages) {
        await ensureDriveFilePublicReadable(token, item.id);
        const cleanTitle =
          item.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() ||
          'Drive Image';
        const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await upsertDocument(
          'media_library',
          mediaId,
          {
            title: cleanTitle.slice(0, 160),
            altText: cleanTitle.slice(0, 300),
            description: '',
            category: uploadCategory,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            mimeType: item.mimeType,
            sizeBytes: Math.round(item.sizeBytes),
            width: Math.round(item.width),
            height: Math.round(item.height),
            filename: item.name.slice(0, 200),
            createdBy: auth.currentUser?.uid || 'admin',
          },
          true,
          `Imported "${cleanTitle}" from Google Drive folder`,
          true
        );
        imported += 1;
      }
      showToast(`Imported ${imported} image(s) from Google Drive`, 'success');
      setPendingSyncImages(null);
    } catch (err) {
      if (err instanceof DriveAuthExpiredError) {
        clearDriveAccessToken();
      }
      showToast(
        'Sync import failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSyncingDrive(false);
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

    const driveId = extractDriveFileId(deleteTarget.url);
    let token = driveAccessToken;
    if (driveId && !token) {
      token = await handleConnectDrive();
      if (!token) {
        return;
      }
    }

    setDeleting(true);
    try {
      if (driveId && token) {
        await deleteDriveFile(token, driveId);
      } else {
        const fbToken = await auth.currentUser?.getIdToken();
        if (fbToken && deleteTarget.url.startsWith('/uploads/')) {
          await fetch(`/api/media/file/${encodeURIComponent(deleteTarget.filename)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${fbToken}` },
          }).catch(() => undefined);
        }
      }
      await deleteDocument(
        'media_library',
        deleteTarget.id,
        `Deleted media asset "${deleteTarget.title}"`
      );
      showToast('Media deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof DriveAuthExpiredError) {
        clearDriveAccessToken();
        showToast('Google Drive session expired', 'error', 'Please reconnect Google Drive and try again.');
      } else {
        showToast('Delete failed', 'error', err instanceof Error ? err.message : undefined);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dedicated Google Drive Folder Status Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              driveAccessToken
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-display font-semibold">
                Google Drive Folder: {driveFolder?.name || PORTFOLIO_DRIVE_FOLDER_NAME}
              </h3>
              {driveAccessToken ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Connection required to upload/sync
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Uploaded photos are automatically stored in this dedicated Google Drive folder and loaded publicly across both AI Studio and GitHub Pages.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {driveFolder?.webViewLink && (
            <a
              href={driveFolder.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Drive Folder</span>
            </a>
          )}
          <button
            type="button"
            disabled={syncingDrive}
            onClick={handleCheckSyncFromDrive}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>{syncingDrive ? 'Syncing...' : 'Sync from Drive'}</span>
          </button>
          {!driveAccessToken && (
            <button
              type="button"
              disabled={connectingDrive}
              onClick={handleConnectDrive}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-medium shadow-sm transition-colors disabled:opacity-60"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{connectingDrive ? 'Connecting...' : 'Connect Google Drive'}</span>
            </button>
          )}
        </div>
      </div>

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
            Upload Photos Directly to Google Drive
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag and drop JPG, PNG, WebP, or SVG files (max 10MB). Every upload is stored inside your dedicated Google Drive folder and made publicly readable for your portfolio.
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
              disabled={uploading || connectingDrive}
              onClick={handleSelectFilesClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-60"
            >
              <ImagePlus className="w-4 h-4" />
              <span>
                {uploading
                  ? 'Uploading to Drive...'
                  : driveAccessToken
                  ? 'Select Files'
                  : 'Connect & Upload'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional External URL Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setShowUrlSection((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Or add an external HTTPS image URL manually</span>
          </span>
          <span className="text-xs text-slate-500">
            {showUrlSection ? 'Hide' : 'Expand'}
          </span>
        </button>

        {showUrlSection && (
          <form
            onSubmit={handleAddExternalUrl}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80"
          >
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
          </form>
        )}
      </div>

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
            const isDriveStored = Boolean(extractDriveFileId(asset.url));
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
                  {isDriveStored && !brokenAssetIds[asset.id] && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-sm text-[10px] font-medium text-white">
                      Google Drive
                    </span>
                  )}
                  {brokenAssetIds[asset.id] && (
                    <div className="absolute inset-0 bg-amber-950/85 text-amber-200 p-3 flex flex-col items-center justify-center text-center gap-1.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <span className="text-[11px] font-medium leading-tight">
                        File missing on this host
                      </span>
                      <span className="text-[10px] text-amber-300/90 leading-tight">
                        Click Replace to upload to Google Drive
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
                      onClick={() => setPendingReplaceConfirm(asset)}
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
              <label className="text-xs font-medium">Image URL</label>
              <input
                type="text"
                required
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://lh3.googleusercontent.com/d/..."
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

      {/* Confirmation before Replacing a Google Drive Asset */}
      <ConfirmDialog
        open={Boolean(pendingReplaceConfirm)}
        destructive={false}
        title={`Replace image for "${pendingReplaceConfirm?.title}"?`}
        description="This will upload a new photo to your Google Drive portfolio folder, update the Media Library record, and remove the previous Google Drive file."
        confirmLabel="Choose Replacement File"
        onCancel={() => setPendingReplaceConfirm(null)}
        onConfirm={async () => {
          const target = pendingReplaceConfirm;
          setPendingReplaceConfirm(null);
          if (!target) return;
          if (!driveAccessToken) {
            const token = await handleConnectDrive();
            if (!token) return;
          }
          setReplacingAsset(target);
          replaceInputRef.current?.click();
        }}
      />

      {/* Confirmation before Importing / Updating Permissions on Drive Folder Photos */}
      <ConfirmDialog
        open={Boolean(pendingSyncImages)}
        destructive={false}
        busy={syncingDrive}
        title={`Import ${pendingSyncImages?.length ?? 0} photo(s) from Google Drive?`}
        description={`Found ${pendingSyncImages?.length ?? 0} unlinked image(s) inside "${driveFolder?.name || PORTFOLIO_DRIVE_FOLDER_NAME}". Importing will set public viewer permissions on those Google Drive files so visitors can view them on your portfolio.`}
        details={(pendingSyncImages || []).slice(0, 8).map((f) => f.name)}
        confirmLabel="Import & Make Public"
        onCancel={() => setPendingSyncImages(null)}
        onConfirm={handleConfirmSyncImport}
      />

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
            : extractDriveFileId(deleteTarget?.url)
            ? 'This will permanently delete the image file from your Google Drive folder and remove the record from the Media Library.'
            : 'This will permanently remove the asset record from the Media Library.'
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
