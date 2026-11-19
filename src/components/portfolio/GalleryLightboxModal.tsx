import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryItem } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';

interface GalleryLightboxModalProps {
  items: GalleryItem[];
  activeIndex: number | null;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
}

export function GalleryLightboxModal({
  items,
  activeIndex,
  onClose,
  onChangeIndex,
}: GalleryLightboxModalProps) {
  const touchStartX = useRef<number | null>(null);
  const activeItem =
    activeIndex !== null && items[activeIndex] ? items[activeIndex] : null;

  useEffect(() => {
    if (!activeItem || activeIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') {
        onChangeIndex((activeIndex - 1 + items.length) % items.length);
      } else if (e.key === 'ArrowRight') {
        onChangeIndex((activeIndex + 1) % items.length);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [activeItem, activeIndex, items.length, onClose, onChangeIndex]);

  return (
    <AnimatePresence>
      {activeItem && activeIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          onClick={onClose}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) > 50 && items.length > 1) {
              if (delta > 0) {
                onChangeIndex((activeIndex - 1 + items.length) % items.length);
              } else {
                onChangeIndex((activeIndex + 1) % items.length);
              }
            }
          }}
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between text-white"
          >
            <span className="text-xs font-mono tabular-nums text-slate-300">
              {activeIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lightbox"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 flex items-center justify-center my-4 min-h-0"
          >
            {items.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onChangeIndex((activeIndex - 1 + items.length) % items.length)
                }
                aria-label="Previous gallery image"
                className="hidden sm:flex p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors mr-4 shrink-0"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl w-full h-full max-h-[72vh] flex items-center justify-center"
            >
              <MediaImage
                mediaId={activeItem.mediaId}
                fallbackTitle={activeItem.title}
                className="w-full h-full rounded-xl"
                imgClassName="w-full h-full object-contain max-h-[72vh]"
              />
            </motion.div>

            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChangeIndex((activeIndex + 1) % items.length)}
                aria-label="Next gallery image"
                className="hidden sm:flex p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ml-4 shrink-0"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Caption + Mobile Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl mx-auto w-full text-center space-y-2 text-white"
          >
            <h3 className="text-base font-display font-semibold">{activeItem.title}</h3>
            {activeItem.caption && (
              <p className="text-xs sm:text-sm text-slate-300">{activeItem.caption}</p>
            )}
            {items.length > 1 && (
              <div className="flex sm:hidden items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeIndex((activeIndex - 1 + items.length) % items.length)
                  }
                  aria-label="Previous gallery image"
                  className="px-4 py-2 rounded-lg bg-white/10 text-xs font-medium"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => onChangeIndex((activeIndex + 1) % items.length)}
                  aria-label="Next gallery image"
                  className="px-4 py-2 rounded-lg bg-white/10 text-xs font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
