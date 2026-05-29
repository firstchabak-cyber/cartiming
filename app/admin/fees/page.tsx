import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW } from "@/lib/utils/format";
import { FEE_STATUS_LABEL } from "@/lib/sales/fee";
import { FeeStatusButton } from "@/components/admin/FeeStatusButton";
import { RevenueCsvButton } from "@/components/admin/RevenueCsvButton";
import { getRevenueSummary } from "@/lib/admin/revenue";
import { BUSINESS_INFO } from "@/lib/constants/business";

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}년 ${Number(m)}월`;
}

type FeeRow = {
  id: string;
  channel: string;
  sold_price: number;
  sold_at: string;
  fee_amount: number | null;
  fee_status: string | null;
  fee_charged_at: string | null;
  fee_paid_at: string | null;
  fee_payment_reported_at: string | null;
  fee_payment_method: string | null;
  fee_note: string | null;
  snapshot_manufacturer: string;
  snapshot_model: string;
  snapshot_year: number;
  source_sale_request_id: string | null;
};

type DealerLite = { dealer_id: string | null; dealer_name: string };

type DealerProfile = {
  user_id: string;
  business_name: string;
  business_reg_number: string;
  contact_phone: string;
  email?: string | null;
};

export default async function AdminFeesPage() {
  const admin = createAdminClient();
  const [{ data: txns }, revenue] = await Promise.all([
    admin
      .from("sale_transactions")
      .select(
        "id, channel, sold_price, sold_at, fee_amount, fee_status, fee_charged_at, fee_paid_at, fee_payment_reported_at, fee_payment_method, fee_note, snapshot_manufacturer, snapshot_model, snapshot_year, source_sale_request_id",
      )
      .eq("channel", "cartiming")
      .order("sold_at", { ascending: false })
      .limit(200),
    getRevenueSummary(),
  ]);

  const list = (txns as FeeRow[]) ?? [];

  // 각 거래의 선정 딜러 정보 + 사업자 프로필 묶기 (embed 안 쓰고 2단계로)
  const requestIds = list
    .map((t) => t.source_sale_request_id)
    .filter((id): id is string => !!id);
  const { data: salesWithBidId } =
    requestIds.length > 0
      ? await admin
          .from("sale_requests")
          .select("id, selected_bid_id")
          .in("id", requestIds)
      : { data: null };
  const reqIdToBidId = new Map<string, string>();
  const allBidIds: string[] = [];
  for (const r of (salesWithBidId ?? []) as Array<{
    id: string;
    selected_bid_id: string | null;
  }>) {
    if (r.selected_bid_id) {
      reqIdToBidId.set(r.id, r.selected_bid_id);
      allBidIds.push(r.selected_bid_id);
    }
  }
  const { data: bidsList } =
    allBidIds.length > 0
      ? await admin
          .from("sale_bids")
          .select("id, dealer_id, dealer_name")
          .in("id", allBidIds)
      : { data: null };
  const bidIdToDealer = new Map<string, DealerLite>();
  for (const b of (bidsList ?? []) as Array<DealerLite & { id: string }>) {
    bidIdToDealer.set(b.id, { dealer_id: b.dealer_id, dealer_name: b.dealer_name });
  }
  const dealerMap = new Map<string, DealerLite>();
  for (const [reqId, bidId] of reqIdToBidId.entries()) {
    const dealer = bidIdToDealer.get(bidId);
    if (dealer) dealerMap.set(reqId, dealer);
  }

  // 딜러 사업자 정보 (계산서 발행용)
  const dealerUserIds = Array.from(
    new Set(
      Array.from(dealerMap.values())
        .map((d) => d.dealer_id)
        .filter((id): id is string => !!id),
    ),
  );
  const { data: dealerProfiles } =
    dealerUserIds.length > 0
      ? await admin
          .from("dealers")
          .select("user_id, business_name, business_reg_number, contact_phone")
          .in("user_id", dealerUserIds)
      : { data: null };
  const profileMap = new Map<string, DealerProfile>();
  for (const p of (dealerProfiles ?? []) as DealerProfile[]) {
    profileMap.set(p.user_id, p);
  }
  // 딜러 이메일 (auth)
  const emailMap = new Map<string, string>();
  if (dealerUserIds.length > 0) {
    const { data: authList } = await admin.auth.admin.listUsers();
    for (const u of authList?.users ?? []) {
      if (u.email && dealerUserIds.includes(u.id)) {
        emailMap.set(u.id, u.email);
      }
    }
  }

  const uncharged = list.filter((t) => t.fee_status === "uncharged");
  const charged = list.filter((t) => t.fee_status === "charged");
  const paid = list.filter((t) => t.fee_status === "paid");
  const reportedCount = charged.filter(
    (t) => !!t.fee_payment_reported_at,
  ).length;

  const totalDue = [...uncharged, ...charged].reduce(
    (sum, t) => sum + (t.fee_amount ?? 0),
    0,
  );
  const totalCollected = paid.reduce((sum, t) => sum + (t.fee_amount ?? 0), 0);

  // 입금 신고 된 거래를 맨 위로
  const sorted = [...list].sort((a, b) => {
    const aReported =
      a.fee_status === "charged" && a.fee_payment_reported_at ? 1 : 0;
    const bReported =
      b.fee_status === "charged" && b.fee_payment_reported_at ? 1 : 0;
    if (aReported !== bReported) return bReported - aReported;
    return a.sold_at < b.sold_at ? 1 : -1;
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">정산 · 매출</h1>
        <p className="text-sm text-muted">
          캐시 충전 매출과 매각 수수료를 한곳에서 관리합니다.
        </p>
      </header>

      {/* ── 매출 요약 ───────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">💵 매출 요약</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="flex flex-col gap-1 border-primary/40 bg-primary/5">
            <p className="text-xs text-muted">총 매출 (누적)</p>
            <p className="text-xl font-bold text-primary">
              {formatKRW(revenue.grandTotal)}
            </p>
            <p className="text-[10px] text-muted">
              캐시 {revenue.cashCountTotal}건 · 수수료 {revenue.feeCountTotal}건
            </p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-muted">캐시 매출 (누적)</p>
            <p className="text-lg font-bold text-foreground">
              {formatKRW(revenue.cashRevenueTotal)}
            </p>
            <p className="text-[10px] text-muted">
              충전 결제 {revenue.cashCountTotal}건
            </p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-muted">매각 수수료 (누적)</p>
            <p className="text-lg font-bold text-foreground">
              {formatKRW(revenue.feeRevenueTotal)}
            </p>
            <p className="text-[10px] text-muted">
              입금 완료 {revenue.feeCountTotal}건
            </p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-muted">이번 달 매출</p>
            <p className="text-lg font-bold text-success">
              {formatKRW(revenue.thisMonth.total)}
            </p>
            <p className="text-[10px] text-muted">
              캐시 {formatKRW(revenue.thisMonth.cashRevenue)} · 수수료{" "}
              {formatKRW(revenue.thisMonth.feeRevenue)}
            </p>
          </Card>
        </div>
        {revenue.feeReceivable > 0 && (
          <p className="text-xs text-warning">
            ⚠️ 미수금(청구했으나 미입금) {formatKRW(revenue.feeReceivable)} ·{" "}
            {revenue.feeReceivableCount}건 — 아래 정산 표에서 입금 확인 필요
          </p>
        )}
      </section>

      {/* ── 월별 매출 ───────────────────────────── */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            📅 월별 매출
          </h2>
          <RevenueCsvButton monthly={revenue.monthly} />
        </div>
        {revenue.monthly.length === 0 ? (
          <Card className="py-6 text-center">
            <CardDescription>아직 매출이 없습니다.</CardDescription>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-border bg-surface text-xs text-muted">
                <tr>
                  <th className="p-2 text-left">월</th>
                  <th className="p-2 text-right">캐시 매출</th>
                  <th className="p-2 text-right">매각 수수료</th>
                  <th className="p-2 text-right">합계</th>
                </tr>
              </thead>
              <tbody>
                {revenue.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-border">
                    <td className="p-2 font-semibold">{monthLabel(m.month)}</td>
                    <td className="p-2 text-right">
                      {formatKRW(m.cashRevenue)}
                      <span className="ml-1 text-[10px] text-muted">
                        ({m.cashCount})
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      {formatKRW(m.feeRevenue)}
                      <span className="ml-1 text-[10px] text-muted">
                        ({m.feeCount})
                      </span>
                    </td>
                    <td className="p-2 text-right font-bold text-primary">
                      {formatKRW(m.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-surface text-sm font-bold">
                <tr>
                  <td className="p-2">누적 합계</td>
                  <td className="p-2 text-right">
                    {formatKRW(revenue.cashRevenueTotal)}
                  </td>
                  <td className="p-2 text-right">
                    {formatKRW(revenue.feeRevenueTotal)}
                  </td>
                  <td className="p-2 text-right text-primary">
                    {formatKRW(revenue.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-1 text-[10px] text-muted">
              ※ 캐시 매출은 결제 입금일, 매각 수수료는 수수료 입금일 기준(한국
              시간). 괄호 안은 건수.
            </p>
          </div>
        )}
      </section>

      {/* ── 수수료 정산 상세 ─────────────────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            🧾 매각 수수료 정산
          </h2>
          <p className="text-xs text-muted">
            카타이밍 통한 매각 완료 건의 딜러 수수료 추적 (1,000만원 미만 15만원
            / 이상 1.5%)
          </p>
        </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">미청구</p>
          <p className="text-xl font-bold text-warning">{uncharged.length}건</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">청구 중</p>
          <p className="text-xl font-bold text-primary">{charged.length}건</p>
          {reportedCount > 0 && (
            <p className="text-[10px] font-semibold text-warning">
              🔔 딜러 입금 신고 {reportedCount}건 (확인 필요)
            </p>
          )}
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">입금 완료</p>
          <p className="text-xl font-bold text-success">{paid.length}건</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-xs text-muted">미수금 합계</p>
          <p className="text-base font-bold text-warning">
            {formatKRW(totalDue)}
          </p>
          <p className="text-[10px] text-muted">
            누적 입금 {formatKRW(totalCollected)}
          </p>
        </Card>
      </div>

      {list.length === 0 ? (
        <Card className="py-10 text-center">
          <CardDescription>
            아직 정산 대상 거래가 없습니다. 카타이밍 매각 완료 시 자동 등록됩니다.
          </CardDescription>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted">
              <tr>
                <th className="p-2 text-left">매각일</th>
                <th className="p-2 text-left">차종</th>
                <th className="p-2 text-left">딜러 / 계산서 정보</th>
                <th className="p-2 text-right">매각가</th>
                <th className="p-2 text-right">수수료</th>
                <th className="p-2 text-left">상태</th>
                <th className="p-2 text-left">액션</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const dealer = t.source_sale_request_id
                  ? dealerMap.get(t.source_sale_request_id)
                  : null;
                const profile = dealer?.dealer_id
                  ? profileMap.get(dealer.dealer_id)
                  : null;
                const email = dealer?.dealer_id
                  ? emailMap.get(dealer.dealer_id)
                  : null;
                const status = t.fee_status ?? "uncharged";
                const isReported =
                  status === "charged" && !!t.fee_payment_reported_at;
                const tone = isReported
                  ? "primary"
                  : status === "paid"
                    ? "success"
                    : status === "charged"
                      ? "warning"
                      : status === "waived"
                        ? "neutral"
                        : "danger";
                const statusLabel = isReported
                  ? "🔔 입금 신고됨"
                  : (FEE_STATUS_LABEL[status] ?? status);
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border hover:bg-surface ${isReported ? "bg-primary/5" : ""}`}
                  >
                    <td className="p-2 align-top text-xs">{t.sold_at}</td>
                    <td className="p-2 align-top">
                      {t.snapshot_manufacturer} {t.snapshot_model} (
                      {t.snapshot_year})
                    </td>
                    <td className="p-2 align-top text-xs">
                      <div className="font-semibold">
                        {dealer?.dealer_name ?? "운영자 등록"}
                      </div>
                      {profile && (
                        <div className="mt-0.5 flex flex-col gap-0 text-[10px] text-muted">
                          <span>상호: {profile.business_name}</span>
                          <span>사업자: {profile.business_reg_number}</span>
                          {email && <span>이메일: {email}</span>}
                          <span>전화: {profile.contact_phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-2 align-top text-right">
                      {formatKRW(t.sold_price)}
                    </td>
                    <td className="p-2 align-top text-right font-semibold text-warning">
                      {t.fee_amount ? formatKRW(t.fee_amount) : "-"}
                    </td>
                    <td className="p-2 align-top">
                      <Badge tone={tone}>{statusLabel}</Badge>
                      {isReported && t.fee_payment_reported_at && (
                        <p className="mt-1 text-[10px] text-muted">
                          신고 {t.fee_payment_reported_at.slice(0, 10)}
                        </p>
                      )}
                    </td>
                    <td className="p-2 align-top">
                      <FeeStatusButton
                        transactionId={t.id}
                        currentStatus={status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-muted">
            ※ 입금 계좌: {BUSINESS_INFO.bankAccount.bankName}{" "}
            {BUSINESS_INFO.bankAccount.accountNumber}{" "}
            {BUSINESS_INFO.bankAccount.accountHolder} — 딜러 알림에 자동 발송됨
          </p>
        </div>
      )}
      </section>
    </div>
  );
}
