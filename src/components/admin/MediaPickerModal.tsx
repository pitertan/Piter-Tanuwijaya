import React, { useMemo, useState } from 'react';
import { Check, ImagePlus, Search, X } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { resolveAssetUrl } from '../../lib/routing';
import type { MediaAsset } from '../../types/portfolio';

interface MediaPickerModalProps {
  open: boolean;
  selectedId?: string;
  title?: string;
  onSelect: (mediaId: string) => void;
  onClose: () => void;
}

export function MediaPickerModal({
  open,
  selectedId,
  title = 'Select Media Asset',
  onSelect,
  onClose,
}: MediaPickerModalProps) {
  const { data } = usePortfolio();
  const [queryText, setQueryText] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(data.mediaLibrary.map((m) => m.category)));
    return ['All', ...cats];
  }, [data.mediaLibrary]);

  const filtered = useMemo(() => {
    return data.mediaLibrary.filter((m: MediaAsset) => {
      const matchesCat = catFilter === 'All' || m.category === catFilter;
      const q = queryText.trim().toLowerCase();
      const matchesQ =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.altText.toLowerCase().includes(q) ||
        m.filename.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [data.mediaLibrary, catFilter, queryText]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-display font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media picker"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search media by title, alt text, or filename..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            aria-label="Filter media category"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-500">
              <ImagePlus className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-sm">No matching assets in Media Library.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-4">
              {filtered.map((asset) => {
                const isSelected = asset.id === selectedId;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelect(asset.id);
                      onClose();
                    }}
                    className={`break-inside-avoid mb-4 w-full block group text-left rounded-xl border overflow-hidden transition-all ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    <div className="relative bg-slate-100 dark:bg-slate-900">
                      <img
                        src={resolveAssetUrl(
                          asset.thumbnailUrl || asset.url,
                          import.meta.env.BASE_URL,
                          typeof window !== 'undefined' ? window.location.pathname : '/',
                          typeof window !== 'undefined' ? window.location.hostname : ''
                        )}
                        alt={asset.altText}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto block object-cover"
                      />
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <p className="text-xs font-medium truncate">{asset.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {asset.category} · {asset.width}×{asset.height}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
