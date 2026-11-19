import { sanitizeSvgContent } from './validation';
import type { AllowedMediaMime } from '../types/portfolio';

export const PORTFOLIO_DRIVE_FOLDER_NAME = 'Piter Tanuwijaya — Portfolio Media';

export class DriveAuthExpiredError extends Error {
  constructor(message = 'Google Drive session expired. Please reconnect Google Drive.') {
    super(message);
    this.name = 'DriveAuthExpiredError';
  }
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveUploadedImage {
  fileId: string;
  name: string;
  mimeType: AllowedMediaMime;
  sizeBytes: number;
  width: number;
  height: number;
  url: string;
  thumbnailUrl: string;
  webViewLink: string;
}

export interface DriveListedImage {
  id: string;
  name: string;
  mimeType: AllowedMediaMime;
  sizeBytes: number;
  width: number;
  height: number;
  url: string;
  thumbnailUrl: string;
  webViewLink: string;
}

export function buildDriveImageUrls(fileId: string): {
  url: string;
  thumbnailUrl: string;
  fallbackUrl: string;
  viewUrl: string;
} {
  const safeId = fileId.trim();
  return {
    url: `https://lh3.googleusercontent.com/d/${safeId}=w1600`,
    thumbnailUrl: `https://lh3.googleusercontent.com/d/${safeId}=w480`,
    fallbackUrl: `https://drive.google.com/thumbnail?id=${safeId}&sz=w1600`,
    viewUrl: `https://drive.google.com/file/d/${safeId}/view`,
  };
}

export function extractDriveFileId(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // https://lh3.googleusercontent.com/d/<FILE_ID>=w1600
  const lh3Match = trimmed.match(
    /^https:\/\/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/
  );
  if (lh3Match?.[1]) return lh3Match[1];

  // https://drive.google.com/file/d/<FILE_ID>/view
  const fileMatch = trimmed.match(
    /^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (fileMatch?.[1]) return fileMatch[1];

  // https://drive.google.com/thumbnail?id=<FILE_ID>&sz=w1600 or /uc?id=<FILE_ID>
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname === 'drive.google.com' &&
      (parsed.pathname === '/thumbnail' || parsed.pathname === '/uc' || parsed.pathname === '/open')
    ) {
      const idParam = parsed.searchParams.get('id');
      if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) {
        return idParam;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getDriveFallbackImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;

  if (url.startsWith('https://lh3.googleusercontent.com/d/')) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }
  if (url.startsWith('https://drive.google.com/thumbnail')) {
    return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
  }
  return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
}

async function parseDriveError(resp: Response, fallback: string): Promise<string> {
  if (resp.status === 401) {
    throw new DriveAuthExpiredError();
  }
  try {
    const data = await resp.json();
    if (data?.error?.message) return String(data.error.message);
  } catch {
    // ignore non-JSON error body
  }
  return `${fallback} (HTTP ${resp.status})`;
}

export async function ensurePortfolioDriveFolder(
  accessToken: string,
  folderName = PORTFOLIO_DRIVE_FOLDER_NAME
): Promise<DriveFolderInfo> {
  const escaped = folderName.replace(/'/g, "\\'");
  const query = `name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('fields', 'files(id,name,webViewLink)');
  searchUrl.searchParams.set('pageSize', '1');
  searchUrl.searchParams.set('spaces', 'drive');

  const listResp = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listResp.ok) {
    throw new Error(await parseDriveError(listResp, 'Failed to check Google Drive folder'));
  }

  const listData = (await listResp.json()) as {
    files?: Array<{ id: string; name: string; webViewLink?: string }>;
  };
  const existing = listData.files?.[0];
  if (existing?.id) {
    return {
      id: existing.id,
      name: existing.name,
      webViewLink:
        existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  const createResp = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!createResp.ok) {
    throw new Error(await parseDriveError(createResp, 'Failed to create Google Drive folder'));
  }

  const created = (await createResp.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };
  return {
    id: created.id,
    name: created.name,
    webViewLink:
      created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

export async function ensureDriveFilePublicReadable(
  accessToken: string,
  fileId: string
): Promise<void> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );
  if (!resp.ok) {
    throw new Error(
      await parseDriveError(resp, 'Failed to set public viewer permission on Google Drive file')
    );
  }
}

export async function uploadImageToDriveFolder(options: {
  accessToken: string;
  folderId: string;
  file: File;
  width: number;
  height: number;
  title?: string;
}): Promise<DriveUploadedImage> {
  const { accessToken, folderId, file, width, height, title } = options;
  let contentBlob: Blob = file;
  let finalSize = file.size;

  if (file.type === 'image/svg+xml') {
    const sanitized = sanitizeSvgContent(await file.text());
    if (!sanitized.toLowerCase().includes('<svg')) {
      throw new Error('Invalid SVG document.');
    }
    contentBlob = new Blob([sanitized], { type: 'image/svg+xml' });
    finalSize = contentBlob.size;
  }

  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(0, 140) || 'image.jpg';
  const boundary = `portfolio_cms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const metadata = JSON.stringify({
    name: `${Date.now()}-${safeName}`,
    parents: [folderId],
    description: title || safeName,
  });

  const multipartBody = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      metadata,
      `\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,
      contentBlob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,imageMediaMetadata,webViewLink';

  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!resp.ok) {
    throw new Error(await parseDriveError(resp, 'Failed to upload image to Google Drive'));
  }

  const uploaded = (await resp.json()) as {
    id: string;
    name: string;
    mimeType?: string;
    size?: string;
    imageMediaMetadata?: { width?: number; height?: number };
    webViewLink?: string;
  };

  await ensureDriveFilePublicReadable(accessToken, uploaded.id);

  const urls = buildDriveImageUrls(uploaded.id);
  const resolvedWidth = uploaded.imageMediaMetadata?.width || width || 1200;
  const resolvedHeight = uploaded.imageMediaMetadata?.height || height || 800;

  return {
    fileId: uploaded.id,
    name: uploaded.name || safeName,
    mimeType: (uploaded.mimeType || file.type) as AllowedMediaMime,
    sizeBytes: uploaded.size ? Number(uploaded.size) || finalSize : finalSize,
    width: Math.round(resolvedWidth),
    height: Math.round(resolvedHeight),
    url: urls.url,
    thumbnailUrl: urls.thumbnailUrl,
    webViewLink: uploaded.webViewLink || urls.viewUrl,
  };
}

export async function listDriveFolderImages(
  accessToken: string,
  folderId: string
): Promise<DriveListedImage[]> {
  const allowedMimes = new Set<AllowedMediaMime>([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
  ]);
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set(
    'q',
    `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`
  );
  url.searchParams.set(
    'fields',
    'files(id,name,mimeType,size,imageMediaMetadata,webViewLink)'
  );
  url.searchParams.set('orderBy', 'createdTime desc');
  url.searchParams.set('pageSize', '100');

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    throw new Error(await parseDriveError(resp, 'Failed to list Google Drive folder images'));
  }

  const data = (await resp.json()) as {
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      imageMediaMetadata?: { width?: number; height?: number };
      webViewLink?: string;
    }>;
  };

  const results: DriveListedImage[] = [];
  for (const file of data.files || []) {
    const mime = allowedMimes.has(file.mimeType as AllowedMediaMime)
      ? (file.mimeType as AllowedMediaMime)
      : 'image/jpeg';
    const urls = buildDriveImageUrls(file.id);
    results.push({
      id: file.id,
      name: file.name,
      mimeType: mime,
      sizeBytes: Number(file.size) || 0,
      width: Math.round(file.imageMediaMetadata?.width || 1200),
      height: Math.round(file.imageMediaMetadata?.height || 800),
      url: urls.url,
      thumbnailUrl: urls.thumbnailUrl,
      webViewLink: file.webViewLink || urls.viewUrl,
    });
  }
  return results;
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (resp.status === 404) {
    // Already removed from Drive
    return;
  }
  if (!resp.ok) {
    throw new Error(await parseDriveError(resp, 'Failed to delete file from Google Drive'));
  }
}
