import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getBalance,
  getFreeAnalysisRemaining,
  getVehicleSlots,
} from "@/lib/credits/server";
import { CREDIT_COSTS, FREE_ANALYSIS_PER_MONTH } from "@/lib/credits/constants";
import { formatDate } from "@/lib/utils/format";

const TYPE_LABEL: Record<string, string> = {
  signup_bonus: "신규 가입 보너스",
  charge: "캐시 충전",
  analysis_overage: "시세 분석 추가",
  add_vehicle: "차량 추가 등록",
  monitoring: "민감 모니터링 (7일)",
  precision_report: "정밀 분석 보고서",
  referral: "친구 초대 보상",
  admin_grant: "관리자 지급",
  admin_revoke: "관리자 회수",
  refund: "환불",
};

export default async function CreditsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">캐시</h1>
        <Card>
          <CardDescription>로그인이 필요합니다.</CardDescription>
        </Card>
      </div>
    );
  }

  const [{ balance, lifetime }, freeRemaining, slots] = await Promise.all([
    getBalance(user.id),
    getFreeAnalysisRemaining(user.id),
    getVehicleSlots(user.id),
  ]);

  const { data: txns } = await supabase
    .from("credit_transactions")
    .select("id, type, amount, balance_after, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">캐시</h1>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-warning" />
            <CardTitle>현재 잔액</CardTitle>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {lifetime ? "평생회원" : `${balance.toLocaleString("ko-KR")} 캐시`}
          </p>
        </div>
        {!lifetime && (
          <Link href="/credits/charge" className="mt-2">
            <Button size="sm" fullWidth>
              <Plus className="h-4 w-4" />
              캐시 충전하기
            </Button>
          </Link>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">이번 달 무료 시세 분석</CardTitle>
        <p className="text-xl font-bold text-foreground">
          {freeRemaining} <span className="text-sm text-muted">/ {FREE_ANALYSIS_PER_MONTH}회 남음</span>
        </p>
        <p className="text-xs text-muted">
          초과 사용 시 1회당 {CREDIT_COSTS.analysisOverage} 캐시 차감
        </p>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">차량 슬롯</CardTitle>
        <p className="text-xl font-bold text-foreground">
          {slots.activeCount} <span className="text-sm text-muted">/ {slots.freeSlots}대 무료</span>
        </p>
        <p className="text-xs text-muted">
          무료 슬롯 초과 등록 시 1대당 {CREDIT_COSTS.addVehicle} 캐시 차감.
          매각 처리한 차량은 3개월 이내 신규 등록 시 무료 슬롯이 회복됩니다.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle className="text-sm">사용 내역</CardTitle>
        {(txns?.length ?? 0) === 0 ? (
          <CardDescription>아직 사용 내역이 없습니다.</CardDescription>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {txns!.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {TYPE_LABEL[t.type] ?? t.type}
                  </p>
                  {t.description && (
                    <p className="text-xs text-muted">{t.description}</p>
                  )}
                  <p className="text-[11px] text-muted">
                    {formatDate(t.created_at)} · 잔액{" "}
                    {t.balance_after.toLocaleString("ko-KR")}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    t.amount > 0
                      ? "text-success"
                      : t.amount < 0
                        ? "text-danger"
                        : "text-muted"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount.toLocaleString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
