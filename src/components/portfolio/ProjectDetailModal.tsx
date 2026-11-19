import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  X,
} from 'lucide-react';
import type { ProjectItem } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';

interface ProjectDetailModalProps {
  project: ProjectItem | null;
  onClose: () => void;
  onPrevProject: () => void;
  onNextProject: () => void;
  hasMultipleProjects: boolean;
}

export function ProjectDetailModal({
  project,
  onClose,
  onPrevProject,
  onNextProject,
  hasMultipleProjects,
}: ProjectDetailModalProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const images = project
    ? Array.from(
        new Set([project.coverMediaId, ...(project.galleryMediaIds ?? [])].filter(Boolean))
      )
    : [];

  useEffect(() => {
    setActiveImageIdx(0);
    setFullscreen(false);
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
        else onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setActiveImageIdx((i) => (i - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setActiveImageIdx((i) => (i + 1) % images.length);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [project, fullscreen, images.length, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-screen sm:max-h-[90vh] overflow-y-auto sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-slate-100 shadow-2xl"
          >
            {/* Top Sticky Modal Bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0D1117]/95 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                <span className="font-medium text-blue-600 dark:text-blue-400 truncate">
                  {project.category}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums shrink-0">{project.projectDate}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasMultipleProjects && (
                  <>
                    <button
                      type="button"
                      onClick={onPrevProject}
                      aria-label="Previous project"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onNextProject}
                      aria-label="Next project"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close project detail"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <h2
                  id="project-modal-title"
                  className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-950 dark:text-white text-balance"
                >
                  {project.title}
                </h2>
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                  {project.summary}
                </p>
              </div>

              {/* Interactive Media Stage */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    <MediaImage
                      mediaId={images[activeImageIdx]}
                      fallbackTitle={project.title}
                      className="w-full h-full"
                    />

                    <button
                      type="button"
                      onClick={() => setFullscreen(true)}
                      aria-label="Open full-screen image view"
                      className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIdx(
                              (i) => (i - 1 + images.length) % images.length
                            )
                          }
                          aria-label="Previous image"
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIdx((i) => (i + 1) % images.length)
                          }
                          aria-label="Next image"
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1">
                      {images.map((mId, idx) => (
                        <button
                          key={mId}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          aria-label={`Select project image ${idx + 1}`}
                          className={`relative w-24 aspect-video rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                            idx === activeImageIdx
                              ? 'border-blue-600 dark:border-blue-500'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <MediaImage
                            mediaId={mId}
                            useThumbnail
                            fallbackTitle={project.title}
                            className="w-full h-full"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Metadata & Case Study Prose */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
                <div className="lg:col-span-8 space-y-4">
                  <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                    Architecture &amp; Implementation
                  </h3>
                  <div className="space-y-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </div>
                </div>

                <aside className="lg:col-span-4 space-y-6 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131922] h-fit">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                      {project.role}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Technologies
                    </p>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                      {(project.technologies ?? []).join(' · ')}
                    </p>
                  </div>

                  {project.projectUrl && (
                    <a
                      href={project.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
                    >
                      <span>View Project Reference</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </aside>
              </div>
            </div>
          </motion.div>

          {/* Fullscreen Image Overlay */}
          {fullscreen && images.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(false);
              }}
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            >
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                aria-label="Exit full-screen image"
                className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-6xl max-h-[88vh] aspect-video"
              >
                <MediaImage
                  mediaId={images[activeImageIdx]}
                  fallbackTitle={project.title}
                  className="w-full h-full"
                  imgClassName="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
