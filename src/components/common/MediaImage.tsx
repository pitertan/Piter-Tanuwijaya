import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { resolveAssetUrl } from '../../lib/routing';

interface MediaImageProps {
  mediaId?: string;
  useThumbnail?: boolean;
  fallbackTitle?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}

export function MediaImage({
  mediaId,
  useThumbnail = false,
  fallbackTitle = 'Visual Asset',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  priority = false,
}: MediaImageProps) {
  const { resolveMedia } = usePortfolio();
  const asset = resolveMedia(mediaId);
  const [failed, setFailed] = useState(false);

  const rawSrc = useThumbnail ? asset?.thumbnailUrl || asset?.url : asset?.url;
  const src = resolveAssetUrl(
    rawSrc,
    import.meta.env.BASE_URL,
    typeof window !== 'undefined' ? window.location.pathname : '/',
    typeof window !== 'undefined' ? window.location.hostname : ''
  );

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!asset || !src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 p-4 text-center ${className}`}
        role="img"
        aria-label={asset?.altText || fallbackTitle}
      >
        <ImageOff className="w-6 h-6 opacity-60" />
        <span className="text-xs font-medium truncate max-w-full">
          {asset?.title || fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={src}
        alt={asset.altText || asset.title}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={imgClassName}
      />
    </div>
  );
}
