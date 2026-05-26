"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Photo = {
  id: string;
  signed_url: string;
};

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const close = () => setActiveIdx(null);
  const prev = () => setActiveIdx((i) => (i == null ? null : Math.max(0, i - 1)));
  const next = () =>
    setActiveIdx((i) =>
      i == null ? null : Math.min(photos.length - 1, i + 1),
    );

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-surface"
            aria-label={`사진 ${idx + 1} 크게 보기`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.signed_url}
              alt={`차량 사진 ${idx + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {activeIdx != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {activeIdx > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="이전 사진"
              className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {activeIdx < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="다음 사진"
              className="absolute right-4 bottom-1/2 flex h-10 w-10 translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[activeIdx].signed_url}
            alt={`차량 사진 ${activeIdx + 1}`}
            className="max-h-[90vh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <p className="absolute bottom-4 text-xs text-white/70">
            {activeIdx + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
