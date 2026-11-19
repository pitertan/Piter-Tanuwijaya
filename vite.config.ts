import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {normalizeViteBase} from './src/lib/routing.ts';

export default defineConfig(() => {
  const base = normalizeViteBase(
    process.env.VITE_BASE_PATH,
    process.env.GITHUB_ACTIONS,
    process.env.GITHUB_REPOSITORY
  );

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Also generates dist/.nojekyll and dist/404.html for GitHub Pages SPA fallback.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const rootDir = import.meta.dirname;
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const uploadsDir = path.resolve(rootDir, 'uploads');
          const distUploads = path.resolve(distDir, 'uploads');
          if (fs.existsSync(distDir) && fs.existsSync(uploadsDir)) {
            fs.cpSync(uploadsDir, distUploads, {recursive: true, force: true});
          }
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
          }
          const indexHtml = path.join(distDir, 'index.html');
          const notFoundHtml = path.join(distDir, '404.html');
          if (fs.existsSync(indexHtml)) {
            if (base === './') {
              const rawHtml = fs.readFileSync(indexHtml, 'utf8');
              const redirectScript =
                '<script>(function(){var p=window.location.pathname;if(/\\/admin(\\/.*)?$/i.test(p)){var b=p.replace(/\\/admin(\\/.*)?$/i,"/");window.location.replace(b+window.location.search+"#/admin");}})();</script>';
              fs.writeFileSync(
                notFoundHtml,
                rawHtml.replace('<head>', `<head>${redirectScript}`)
              );
            } else {
              fs.copyFileSync(indexHtml, notFoundHtml);
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
