"use client";

import { useState } from "react";

type ImagePreviewProps = {
  src: string;
  alt: string;
};

export default function ImagePreview({ src, alt }: ImagePreviewProps) {
  const [hasError, setHasError] = useState(!src);

  if (hasError) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-center text-[11px] font-medium text-slate-500">
        No preview
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}
