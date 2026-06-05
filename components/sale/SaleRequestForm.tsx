"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const TIMING_OPTIONS = [
  { value: "immediate", label: "즉시 매각" },
  { value: "within_week", label: "1주일 이내" },
  { value: "within_month", label: "한 달 이내" },
  { value: "undecided", label: "미정 (시세 보고 결정)" },
];

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BYTES = 10 * 1024 * 1024;

export function SaleRequestForm({
  vehicleId,
  currentMileage,
  requireOptionSheet = false,
}: {
  vehicleId: string;
  currentMileage: number;
  /** 슈퍼카 브랜드 — 옵션표 사진 1장 이상 필수 */
  requireOptionSheet?: boolean;
}) {
  const router = useRouter();
  const [mileageStr, setMileageStr] = useState(String(currentMileage));
  const [phone, setPhone] = useState("");
  const [kakao, setKakao] = useState("");
  const [location, setLocation] = useState("");
  const [timing, setTiming] = useState("undecided");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 옵션표 사진 (슈퍼카 필수) — 신청 생성 후 업로드할 파일들을 미리 보관
  const [optionFiles, setOptionFiles] = useState<File[]>([]);

  const addOptionFiles = (files: FileList) => {
    const list = Array.from(files);
    const invalid = list.find(
      (f) => !ALLOWED_MIME.includes(f.type) || f.size > MAX_BYTES,
    );
    if (invalid) {
      setError("옵션표 사진은 JPG/PNG/WebP/HEIC, 1장당 10MB 이하");
      return;
    }
    setError(null);
    setOptionFiles((prev) => [...prev, ...list].slice(0, 5));
  };

  const uploadOptionSheets = async (saleRequestId: string, userId: string) => {
    const supabase = createClient();
    for (let i = 0; i < optionFiles.length; i++) {
      const file = optionFiles[i];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const photoId = crypto.randomUUID();
      const path = `${userId}/${saleRequestId}/optionsheet-${photoId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("sale-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(`옵션표 사진 업로드 실패: ${upErr.message}`);
      const res = await fetch(`/api/sales/${saleRequestId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage_path: path, sort_order: i }),
      });
      if (!res.ok) {
        await supabase.storage.from("sale-photos").remove([path]);
        throw new Error("옵션표 사진 저장 실패");
      }
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const cleanedMileage = mileageStr.replace(/[^0-9]/g, "");
      if (!cleanedMileage || Number(cleanedMileage) <= 0) {
        setError("현재 주행거리를 입력해주세요");
        setBusy(false);
        return;
      }
      if (!phone.trim()) {
        setError("연락받을 휴대폰 번호를 입력해주세요");
        setBusy(false);
        return;
      }
      if (!location.trim()) {
        setError("판매 지역을 입력해주세요 (딜러가 탁송비 계산에 사용)");
        setBusy(false);
        return;
      }
      if (requireOptionSheet && optionFiles.length === 0) {
        setError(
          "옵션표 사진을 1장 이상 등록해주세요 (구매계약서 또는 제조사 옵션 명세서)",
        );
        setBusy(false);
        return;
      }

      // 옵션표 사진 업로드를 위해 로그인 사용자 id 확보
      let userId: string | null = null;
      if (requireOptionSheet) {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
        if (!userId) {
          setError("로그인 세션을 확인하지 못했습니다");
          setBusy(false);
          return;
        }
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          currentMileage: Number(cleanedMileage),
          contactPhone: phone.trim(),
          contactKakao: kakao.trim() || undefined,
          saleLocation: location.trim(),
          saleTiming: timing,
          saleReason: reason.trim() || undefined,
          additionalNotes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `신청 실패 (HTTP ${res.status})`);
        return;
      }

      // 슈퍼카: 옵션표 사진 업로드 (실패 시 신청은 됐으나 사진만 재시도 안내)
      if (requireOptionSheet && userId) {
        try {
          await uploadOptionSheets(data.id, userId);
        } catch (e) {
          setError(
            (e instanceof Error ? e.message : "옵션표 사진 업로드 실패") +
              " — 매각 신청은 생성됐으니 상세 페이지에서 사진을 추가해주세요.",
          );
        }
      }

      router.push(`/sales/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">차량 정보 업데이트</p>
        <Input
          label="현재 주행거리 (km)"
          inputMode="numeric"
          value={
            mileageStr.replace(/[^0-9]/g, "")
              ? new Intl.NumberFormat("ko-KR").format(
                  Number(mileageStr.replace(/[^0-9]/g, "")),
                )
              : ""
          }
          onChange={(e) =>
            setMileageStr(e.target.value.replace(/[^0-9]/g, ""))
          }
          placeholder="예) 45,000"
        />
        <p className="text-xs text-muted">
          외판 상태(판금·교환)는 차량 등록 시 입력한 정보가 그대로 활용됩니다.
          변경이 필요하면 먼저 차량 상세 → 외판 상태 수정 후 다시 신청해주세요.
        </p>
      </Card>

      {requireOptionSheet && (
        <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5">
          <div>
            <p className="text-sm font-semibold text-foreground">
              📋 옵션표 사진 (필수)
            </p>
            <p className="mt-1 text-xs text-muted">
              포르쉐·페라리 등 고가 브랜드는 옵션이 시세를 수백만~수천만원
              좌우합니다. <strong>구매계약서</strong>나{" "}
              <strong>제조사 옵션 명세서(빌드시트)</strong> 사진을 1장 이상
              올려주세요. 딜러가 정확한 입찰가를 산정합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {optionFiles.map((f, i) => (
              <div
                key={i}
                className="relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(f)}
                  alt={`옵션표 ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setOptionFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  disabled={busy}
                  aria-label="사진 삭제"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {optionFiles.length < 5 && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-primary/50 bg-background text-xs text-primary hover:bg-primary/5">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      addOptionFiles(e.target.files);
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
          <p className="text-[11px] text-muted">{optionFiles.length}/5장</p>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">매각 정보</p>
        <Input
          label="판매 지역 (필수)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="예) 서울 강남구 / 경기 분당구"
          maxLength={50}
        />
        <p className="text-[11px] text-muted">
          딜러가 탁송비·교통비를 포함해서 입찰가를 산정합니다.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">희망 매각 시기</label>
          <select
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {TIMING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="매도 사유 (선택)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예) 새 차 구매 / 사용 안 함"
          maxLength={100}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            추가 메모 (선택)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="장점, 아쉬운 점, 특이사항 등 자유롭게"
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-border bg-background p-3 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">연락처</p>
        <Input
          label="휴대폰 번호 (필수)"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
        />
        <Input
          label="카카오톡 ID (선택)"
          value={kakao}
          onChange={(e) => setKakao(e.target.value)}
          placeholder="kakao_id"
        />
        <p className="text-xs text-muted">
          연락처는 입찰 진행 중에는 딜러에게 공개되지 않으며,
          본인이 입찰을 선택한 후에만 그 딜러에게 전달됩니다.
        </p>
      </Card>

      <Card className="flex flex-col gap-2 border-warning/30 bg-warning/5">
        <p className="text-sm font-semibold text-foreground">
          🎁 카타임 통해 매각 시 혜택
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          <li><strong>영구 무료 슬롯 +1</strong> — 매각 완료 후 새 차량을 등록해도 평생 무료</li>
          <li>매각 수수료 차주 부담 0원 (수수료는 딜러에게만 부과)</li>
          <li>매각 데이터가 익명으로 시세 DB 에 누적되어 다음 분석 정확도 ↑</li>
        </ul>
      </Card>

      <Button type="button" size="lg" fullWidth onClick={submit} disabled={busy}>
        {busy ? "신청 중..." : "매각 신청하기"}
      </Button>

      <p className="text-[11px] text-muted">
        신청 후 다음 화면에서 <strong>차량 사진을 추가</strong> 할 수 있습니다.
        딜러는 사진을 보고 입찰가를 결정하므로 외관 4면 + 실내 + 휠 정도는
        등록 권장.
      </p>
    </div>
  );
}
