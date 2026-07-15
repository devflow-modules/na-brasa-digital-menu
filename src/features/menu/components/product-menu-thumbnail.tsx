"use client";

import { useEffect, useState } from "react";

const THUMB_SIZE_PX = 72;

type ProductMenuThumbnailProps = {
  name: string;
  imageUrl: string | null;
  available?: boolean;
};

/**
 * Pilot storefront: only same-origin local paths (e.g. /images/foo.jpg).
 * Remote URLs wait for official storage/CDN and an allowlist PR (and optional next/image).
 */
function normalizeLocalImagePath(imageUrl: string | null): string | null {
  if (!imageUrl) {
    return null;
  }

  const trimmed = imageUrl.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

function ThumbnailFallback() {
  return (
    <div
      data-testid="product-menu-thumbnail-fallback"
      className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-stone-800 to-orange-950/70"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 text-orange-200/50"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}

export function ProductMenuThumbnail({
  name,
  imageUrl,
  available = true,
}: ProductMenuThumbnailProps) {
  const localSrc = normalizeLocalImagePath(imageUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [localSrc]);

  const showImage = localSrc !== null && localSrc !== failedSrc;

  const frameClassName = [
    "h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl",
    available ? "" : "grayscale",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={frameClassName}
      style={{ width: THUMB_SIZE_PX, height: THUMB_SIZE_PX, minWidth: THUMB_SIZE_PX }}
    >
      {showImage ? (
        // Native img until official CDN + allowlist; next/image can follow in a dedicated PR.
        // eslint-disable-next-line @next/next/no-img-element -- local paths only; no remotePatterns yet
        <img
          data-testid="product-menu-thumbnail-image"
          src={localSrc}
          alt={name}
          width={THUMB_SIZE_PX}
          height={THUMB_SIZE_PX}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(localSrc)}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
              setFailedSrc(localSrc);
            }
          }}
        />
      ) : (
        <ThumbnailFallback />
      )}
    </div>
  );
}
