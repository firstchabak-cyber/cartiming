"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ExistingPhoto = {
  id: string;
  storage_path: string;
  signed_url: string;
  sort_order: number;
};

const MAX_PHOTOS = 10;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BYTES = 10 * 1024 * 1024;

export function SalePhotoUploader({
  saleRequestId,
  initialPhotos,
}: {
  saleRequestId: string;
  initialPhotos: ExistingPhoto[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<ExistingPhoto[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const uploadFiles = async (files: FileList) => {
    if (!userId) {
      setError("로그인 세션을 확인하지 못했습니다");
      return;
    }
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    const invalid = list.find(
      (f) => !ALLOWED_MIME.includes(f.type) || f.size > MAX_BYTES,
    );
    if (invalid) {
      setError("JPG/PNG/WebP/HEIC, 1장당 10MB 이하");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const startOrder = photos.length;
    const uploaded: ExistingPhoto[] = [];

    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const photoId = crypto.randomUUID();
        const path = `${userId}/${saleRequestId}/${photoId}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("sale-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(`업로드 실패: ${upErr.message}`);

        const res = await fetch(`/api/sales/${saleRequestId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: path,
            sort_order: startOrder + i,
          }),
        });
        if (!res.ok) {
          await supabase.storage.from("sale-photos").remove([path]);
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "메타 저장 실패");
        }
        const meta = (await res.json()) as {
          id: string;
          storage_path: string;
          sort_order: number;
        };
        const { data: signed } = await supabase.storage
          .from("sale-photos")
          .createSignedUrl(path, 3600);
        uploaded.push({
          id: meta.id,
          storage_path: meta.storage_path,
          sort_order: meta.sort_order,
          signed_url: signed?.signedUrl ?? "",
        });
      }
      setPhotos((prev) => [...prev, ...uploaded]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (id: string) => {
    if (!window.confirm("이 사진을 삭제할까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sale-photos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "삭제 실패");
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.signed_url}
              alt="매각 차량 사진"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(p.id)}
              disabled={busy}
              aria-label="사진 삭제"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background text-xs text-muted hover:bg-surface">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span>추가</span>
              </>
            )}
          </label>
        )}
      </div>
      <p className="text-xs text-muted">
        {photos.length}/{MAX_PHOTOS}장 · 외관 4면 + 실내 + 휠 + 트렁크 등 권장
      </p>
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 p-2 text-xs text-danger">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
