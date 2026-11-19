import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Expand } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import type { PortfolioSection } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';
import { GalleryLightboxModal } from './GalleryLightboxModal';

const PAGE_SIZE = 6;

export function GallerySection({ section }: { section: PortfolioSection }) {
  const { data } = usePortfolio();
  const published = data.galleries.filter((g) => g.isPublished);
  const categories = data.galleryCategories;

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (selectedCat === 'all') return published;
    return published.filter((g) => g.categoryId === selectedCat);
  }, [published, selectedCat]);

  const displayed = filtered.slice(0, visibleCount);
  const catMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  return (
    <section
      id="gallery"
      className="py-20 lg:py-28 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#090C12]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400">
              {section.subtitle}
            </p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-950 dark:text-white text-balance">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                {section.description}
              </p>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter gallery by category"
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0F131A] border border-slate-200 dark:border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCat === 'all'}
              onClick={() => {
                setSelectedCat('all');
                setVisibleCount(PAGE_SIZE);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCat === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
              }`}
            >
              All Media
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCat === cat.id}
                onClick={() => {
                  setSelectedCat(cat.id);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCat === cat.id
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {displayed.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No published gallery images yet.
          </p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {displayed.map((item, idx) => (
              <motion.figure
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0F131A]"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  aria-label={`Inspect ${item.title} in lightbox`}
                  className="block w-full text-left relative"
                >
                  <MediaImage
                    mediaId={item.mediaId}
                    useThumbnail={false}
                    fallbackTitle={item.title}
                    className="w-full"
                    imgClassName="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <figcaption className="absolute bottom-0 left-0 right-0 p-4 text-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-blue-300">
                        {catMap.get(item.categoryId) || 'Archive'}
                      </p>
                      <p className="text-sm font-display font-medium truncate">
                        {item.title}
                      </p>
                    </div>
                    <Expand className="w-4 h-4 shrink-0 text-white/80" />
                  </figcaption>
                </button>
              </motion.figure>
            ))}
          </div>
        )}

        {filtered.length > visibleCount && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors"
            >
              Load More Media ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      <GalleryLightboxModal
        items={filtered}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={(next) => setLightboxIndex(next)}
      />
    </section>
  );
}
