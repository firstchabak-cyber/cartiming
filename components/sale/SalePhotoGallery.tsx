"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Photo = {
  id: string;
  signed_url: string;
};

export function SalePhotoGallery({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.signed_url)}
            className="h-24 w-24 overflow-hidden rounded-lg border border-border bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.signed_url}
              alt="매각 차량 사진"
              className="h-full w-full object-cover hover:opacity-80"
            />
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected}
            alt="확대"
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
