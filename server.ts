import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json';
import {
  ALLOWED_MEDIA_MIMES,
  MAX_MEDIA_SIZE_BYTES,
  sanitizeSvgContent,
} from './src/lib/validation.ts';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminAuth = getAuth();
const app = express();
const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const ADMIN_BOOTSTRAP_EMAIL = 'pitertan0120@gmail.com';

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Security headers (iframe-friendly for AI Studio preview)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple sliding-window rate limiter for API routes
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
      });
    }
    bucket.count += 1;
    return next();
  };
}

// Verify Firebase ID Token (verifyIdToken requires no IAM on Starter Tier)
interface AuthenticatedRequest extends Request {
  userEmail?: string;
  userUid?: string;
}

async function requireVerifiedAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email_verified || decoded.email !== ADMIN_BOOTSTRAP_EMAIL) {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    req.userEmail = decoded.email;
    req.userUid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MEDIA_SIZE_BYTES,
    files: 2, // main image + optional generated thumbnail
  },
});

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

// Serve uploaded media files securely
app.get('/uploads/:filename', (req: Request, res: Response) => {
  const safeName = path.basename(req.params.filename);
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|svg)$/.test(safeName)) {
    return res.status(400).send('Invalid filename');
  }
  const fullPath = path.join(UPLOADS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('Not found');
  }
  if (safeName.endsWith('.svg')) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'"
    );
    res.setHeader('Content-Type', 'image/svg+xml');
  }
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(fullPath);
});

// Media upload endpoint
app.post(
  '/api/media/upload',
  rateLimit(40, 60_000),
  requireVerifiedAdmin,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;
      const mainFile = files?.file?.[0];
      if (!mainFile) {
        return res.status(400).json({ error: 'No image file provided.' });
      }
      if (!ALLOWED_MEDIA_MIMES.includes(mainFile.mimetype as (typeof ALLOWED_MEDIA_MIMES)[number])) {
        return res.status(400).json({
          error: 'Unsupported file type. Allowed: JPG, JPEG, PNG, WebP, SVG.',
        });
      }

      const ext = MIME_TO_EXT[mainFile.mimetype];
      if (!ext) {
        return res.status(400).json({ error: 'Unsupported MIME type.' });
      }

      const baseId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const mainFilename = `${baseId}${ext}`;
      const mainDest = path.join(UPLOADS_DIR, mainFilename);

      let finalSizeBytes = mainFile.size;
      if (mainFile.mimetype === 'image/svg+xml') {
        const sanitized = sanitizeSvgContent(mainFile.buffer.toString('utf8'));
        if (!sanitized.toLowerCase().includes('<svg')) {
          return res.status(400).json({ error: 'Invalid SVG document.' });
        }
        const buf = Buffer.from(sanitized, 'utf8');
        finalSizeBytes = buf.byteLength;
        fs.writeFileSync(mainDest, buf);
      } else {
        fs.writeFileSync(mainDest, mainFile.buffer);
      }

      let thumbnailUrl = `/uploads/${mainFilename}`;
      const thumbFile = files?.thumbnail?.[0];
      if (thumbFile && MIME_TO_EXT[thumbFile.mimetype] && thumbFile.mimetype !== 'image/svg+xml') {
        const thumbExt = MIME_TO_EXT[thumbFile.mimetype];
        const thumbFilename = `${baseId}_thumb${thumbExt}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, thumbFilename), thumbFile.buffer);
        thumbnailUrl = `/uploads/${thumbFilename}`;
      }

      return res.status(201).json({
        filename: mainFilename,
        url: `/uploads/${mainFilename}`,
        thumbnailUrl,
        mimeType: mainFile.mimetype,
        sizeBytes: finalSizeBytes,
        uploadedBy: req.userEmail || ADMIN_BOOTSTRAP_EMAIL,
      });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to process image upload.' });
    }
  }
);

// Delete uploaded file safely
app.delete(
  '/api/media/file/:filename',
  rateLimit(40, 60_000),
  requireVerifiedAdmin,
  (req: Request, res: Response) => {
    const safeName = path.basename(req.params.filename);
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|svg)$/.test(safeName)) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }
    const target = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    const base = safeName.replace(/\.[^.]+$/, '');
    for (const thumbExt of ['.webp', '.jpg', '.png']) {
      const thumbPath = path.join(UPLOADS_DIR, `${base}_thumb${thumbExt}`);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }
    return res.json({ deleted: true });
  }
);

// SEO: robots.txt & sitemap.xml
app.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const today = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

// Error handler for multer size limits
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File exceeds 10MB upload limit.' });
  }
  return next(err);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
