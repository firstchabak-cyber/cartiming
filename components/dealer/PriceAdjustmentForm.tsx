"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type ExistingPhoto = {
  id: string;
  signed_url: string;
};

export function PriceAdjustmentForm({
  saleRequestId,
  bidAmount,
  initialFinalPrice,
  initialReason,
  initialPhotos,
}: {
  saleRequestId: string;
  bidAmount: number;
  initialFinalPrice: number | null;
  initialReason: string | null;
  initialPhotos: ExistingPhoto[];
}) {
  const router = useRouter();
  const [finalPriceStr, setFinalPriceStr] = useState(
    initialFinalPrice ? String(initialFinalPrice) : String(bidAmount),
  );
  const [reason, setReason] = useState(initialReason ?? "");
  const [photos, setPhotos] = useState<ExistingPhoto[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const cleanedNumber = Number(finalPriceStr.replace(/[^0-9]/g, ""));
  const diff = cleanedNumber - bidAmount;

  const submit = async () => {
    if (!cleanedNumber || cleanedNumber <= 0) {
      setError("실 매입가를 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/sales/${saleRequestId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPrice: cleanedNumber,
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "저장 실패");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  const uploadPhotos = async (files: FileList) => {
    if (!userId) return;
    const supabase = createClient();
    const start = photos.length;
    setBusy(true);
    setError(null);
    try {
      const list = Array.from(files).slice(0, 5 - photos.length);
      const uploaded: ExistingPhoto[] = [];
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const photoId = crypto.randomUUID();
        const path = `${userId}/${saleRequestId}/adjustment/${photoId}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("sale-photos")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw new Error(upErr.message);

        const res = await fetch(
          `/api/sales/${saleRequestId}/adjustment-photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storage_path: path,
              sort_order: start + i,
            }),
          },
        );
        if (!res.ok) {
          await supabase.storage.from("sale-photos").remove([path]);
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "메타 저장 실패");
        }
        const meta = (await res.json()) as { id: string };
        const { data: signed } = await supabase.storage
          .from("sale-photos")
          .createSignedUrl(path, 3600);
        uploaded.push({ id: meta.id, signed_url: signed?.signedUrl ?? "" });
      }
      setPhotos((prev) => [...prev, ...uploaded]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3 border-warning/30 bg-warning/5">
      <CardTitle>💼 실 매입가 조정 (실사 후)</CardTitle>
      <p className="text-xs text-muted">
        차량을 실사한 결과 입찰가에서 조정이 필요한 경우 입력하세요. 입찰가 그대로
        매입하시면 입찰가 동일하게 두면 됩니다.
      </p>

      <div className="flex flex-col gap-1 rounded-lg bg-background p-2 text-xs">
        <p className="text-muted">
          내가 제출한 입찰가:{" "}
          <span className="font-semibold text-foreground">
            {bidAmount.toLocaleString("ko-KR")}원
          </span>
        </p>
        {cleanedNumber > 0 && diff !== 0 && (
          <p
            className={diff < 0 ? "text-danger" : "text-success"}
          >
            조정 {diff > 0 ? "+" : ""}
            {diff.toLocaleString("ko-KR")}원
          </p>
        )}
      </div>

      <Input
        label="실 매입가 (원)"
        inputMode="numeric"
        value={
          finalPriceStr.replace(/[^0-9]/g, "")
            ? new Intl.NumberFormat("ko-KR").format(
                Number(finalPriceStr.replace(/[^0-9]/g, "")),
              )
            : ""
        }
        onChange={(e) =>
          setFinalPriceStr(e.target.value.replace(/[^0-9]/g, ""))
        }
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          조정 사유 (감가 시 필수)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="예) 앞범퍼 도색 흔적 발견 30만원 차감, 좌측 도어 단순 도색 흔적 20만원 차감"
          className="w-full rounded-xl border border-border bg-background p-3 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">감가 증빙 사진 (선택)</label>
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div
              key={p.id}
              className="h-20 w-20 overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.signed_url}
                alt="감가 증빙"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          {photos.length < 5 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background text-xs text-muted hover:bg-surface">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    uploadPhotos(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  <span>추가</span>
                </>
              )}
            </label>
          )}
        </div>
        <p className="text-[11px] text-muted">
          스크래치·사고흔적 등 감가 근거 사진 최대 5장 (10MB 이하)
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-success bg-success/10 px-3 py-2 text-sm text-success">
          ✅ 조정 정보 저장 완료
        </p>
      )}

      <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
        {busy ? "저장 중..." : "조정 정보 저장"}
      </Button>
    </Card>
  );
}
