"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ExternalSaleButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [priceStr, setPriceStr] = useState("");
  const [soldAt, setSoldAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [buyerType, setBuyerType] = useState<"dealer" | "individual" | "unknown">(
    "unknown",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const price = Number(priceStr.replace(/[^0-9]/g, ""));
    if (!price || price <= 0) {
      setError("매각 금액을 입력해주세요");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(soldAt)) {
      setError("매각일을 YYYY-MM-DD 형식으로 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          soldPrice: price,
          soldAt,
          buyerType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? `신고 실패 (HTTP ${res.status})`);
        return;
      }
      setOpen(false);
      router.push("/garage");
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        fullWidth
      >
        <ExternalLink className="h-4 w-4" />
        외부에서 매각 (가격 신고)
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-foreground">
              외부에서 매각하셨나요?
            </p>
            <p className="text-xs text-muted">
              헤이딜러·엔카·직거래 등 다른 곳에서 매각한 경우 가격을 신고해 주세요.
              <br />• 차량은 자동으로 매각 상태로 전환됩니다.
              <br />• <strong>3개월 무료 슬롯</strong> 회복 (영구 슬롯은 X — 영구는 카타이밍 매각만)
              <br />• 익명화되어 다른 사용자의 시세 분석 정확도 향상에 기여됩니다.
            </p>

            {error && (
              <p className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                ⚠️ {error}
              </p>
            )}

            <Input
              label="매각 금액 (원)"
              inputMode="numeric"
              value={
                priceStr.replace(/[^0-9]/g, "")
                  ? new Intl.NumberFormat("ko-KR").format(
                      Number(priceStr.replace(/[^0-9]/g, "")),
                    )
                  : ""
              }
              onChange={(e) =>
                setPriceStr(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="예) 29,820,000"
            />
            <Input
              label="매각일 (YYYY-MM-DD)"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
              placeholder="2026-05-28"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">매수자 유형</label>
              <select
                value={buyerType}
                onChange={(e) =>
                  setBuyerType(e.target.value as "dealer" | "individual" | "unknown")
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground"
              >
                <option value="dealer">중고차 딜러 (헤이딜러·엔카 등)</option>
                <option value="individual">개인 (직거래)</option>
                <option value="unknown">기타/모름</option>
              </select>
            </div>

            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                취소
              </Button>
              <Button
                type="button"
                fullWidth
                onClick={submit}
                disabled={busy}
              >
                {busy ? "처리 중..." : "신고하기"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
