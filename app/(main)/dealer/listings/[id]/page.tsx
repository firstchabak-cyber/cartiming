import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDate, formatMileage } from "@/lib/utils/format";
import { DealerBidForm } from "@/components/dealer/DealerBidForm";
import { PriceAdjustmentForm } from "@/components/dealer/PriceAdjustmentForm";
import { CompleteSaleButton } from "@/components/dealer/CompleteSaleButton";
import { SalePhotoGallery } from "@/components/sale/SalePhotoGallery";
import { createAdminClient } from "@/lib/supabase/server";

export default async function DealerListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/dealer/login?next=/dealer/listings/${params.id}`);

  const { data: dealer } = await supabase
    .from("dealers")
    .select("verified, business_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) redirect("/dealer/register");

  const { data: sale } = await supabase
    .from("sale_requests")
    .select(
      "id, status, current_mileage, contact_phone, contact_kakao, sale_location, sale_timing, sale_reason, additional_notes, bidding_closes_at, selected_bid_id, matched_at, final_price, adjustment_reason, adjusted_at, created_at, vehicle_id, vehicle:vehicles(manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, vehicle_class, displacement_cc, options, damage_map, wheel_scuff_count, key_count, damage_note, plate_number, color, interior_color, registered_at, vin, engine_code, seating_capacity)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!sale) notFound();

  const v = sale.vehicle as unknown as {
    manufacturer: string;
    model: string;
    trim: string | null;
    year: number;
    mileage: number;
    fuel_type: string | null;
    transmission: string | null;
    body_type: string | null;
    vehicle_class: string | null;
    displacement_cc: number | null;
    options: string[] | null;
    damage_map: Record<string, string> | null;
    wheel_scuff_count: number | null;
    key_count: number | null;
    damage_note: string | null;
    plate_number: string | null;
    color: string | null;
    interior_color: string | null;
    registered_at: string | null;
    vin: string | null;
    engine_code: string | null;
    seating_capacity: number | null;
  } | null;

  // 핵심 정보 누락 체크
  const missingInfo: string[] = [];
  if (!v?.fuel_type) missingInfo.push("연료");
  if (!v?.transmission) missingInfo.push("변속기");
  if (!v?.body_type) missingInfo.push("차체");
  if (!v?.vehicle_class) missingInfo.push("차종");

  // 정비/사고 이력 + 사진 (admin client 로 조회 — 딜러는 다른 사용자 데이터 직접 접근 권한 없음)
  const admin = createAdminClient();
  const { data: maintenance } = await admin
    .from("vehicle_maintenance")
    .select("category, part, description, performed_at, cost")
    .eq("vehicle_id", sale.vehicle_id)
    .order("performed_at", { ascending: false })
    .limit(30);

  const { data: photoRows } = await admin
    .from("sale_photos")
    .select("id, storage_path")
    .eq("sale_request_id", params.id)
    .order("sort_order", { ascending: true });
  const photos = await Promise.all(
    (photoRows ?? []).map(async (p: { id: string; storage_path: string }) => {
      const { data: signed } = await admin.storage
        .from("sale-photos")
        .createSignedUrl(p.storage_path, 3600);
      return { id: p.id, signed_url: signed?.signedUrl ?? "" };
    }),
  );

  const { data: myBid } = await supabase
    .from("sale_bids")
    .select("id, bid_amount, notes, status, created_at")
    .eq("sale_request_id", params.id)
    .eq("dealer_id", user.id)
    .maybeSingle();

  // 감가 증빙 사진 (선정된 딜러 본인 것)
  const { data: adjPhotoRows } = await admin
    .from("sale_adjustment_photos")
    .select("id, storage_path")
    .eq("sale_request_id", params.id)
    .order("sort_order", { ascending: true });
  const adjustmentPhotos = await Promise.all(
    (adjPhotoRows ?? []).map(async (p: { id: string; storage_path: string }) => {
      const { data: signed } = await admin.storage
        .from("sale-photos")
        .createSignedUrl(p.storage_path, 3600);
      return { id: p.id, signed_url: signed?.signedUrl ?? "" };
    }),
  );

  const damageMap =
    v?.damage_map && typeof v.damage_map === "object" ? v.damage_map : {};
  const damageEntries = Object.entries(damageMap).filter(
    ([, s]) => s && s !== "없음",
  );
  const NON_DEPRECIATING = new Set([
    "앞범퍼",
    "뒷범퍼",
    "휠(좌앞)",
    "휠(우앞)",
    "휠(좌뒤)",
    "휠(우뒤)",
  ]);
  const countedDamage = damageEntries.filter(([p]) => !NON_DEPRECIATING.has(p));
  const ignoredDamage = damageEntries.filter(([p]) => NON_DEPRECIATING.has(p));

  // 매칭 결과 판단
  const isMatched = sale.status === "matched" || sale.status === "completed";
  const iWasSelected =
    isMatched && myBid && sale.selected_bid_id === myBid.id;
  const iWasRejected = isMatched && myBid && sale.selected_bid_id !== myBid.id;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link href="/dealer/listings" className="text-xs text-primary underline">
          ← 매물 리스트
        </Link>
        <h1 className="mt-1 text-xl font-bold">매물 상세</h1>
      </header>

      {iWasSelected && (
        <Card className="flex flex-col gap-3 border-success bg-success/10">
          <p className="text-base font-bold text-success">
            🎉 축하합니다! 이 매물에 선정되셨습니다
          </p>
          <div className="rounded-lg bg-background p-3">
            <p className="text-sm font-semibold text-foreground">차주 연락처</p>
            <p className="mt-2 text-sm">
              📞 휴대폰:{" "}
              <a
                href={`tel:${sale.contact_phone}`}
                className="text-primary underline"
              >
                {sale.contact_phone}
              </a>
            </p>
            {sale.contact_kakao && (
              <p className="mt-1 text-sm">💬 카카오톡: {sale.contact_kakao}</p>
            )}
            {sale.sale_location && (
              <p className="mt-1 text-sm">📍 판매 지역: {sale.sale_location}</p>
            )}
          </div>
          <div className="rounded-lg bg-background p-3 text-xs text-muted">
            <p className="font-semibold text-foreground">다음 단계</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>24~48시간 이내 차주에게 연락해서 미팅 약속 잡기</li>
              <li>차량 실사 + 사고이력·정비기록 확인 + 최종 가격 확정</li>
              <li>계약서 작성 + 차량 인도 + 입금</li>
              <li>명의이전 진행 (15일 이내)</li>
            </ol>
            <p className="mt-2">
              매각 완료 후 카타임에 수수료 정산 (매각가의 1.5%).
            </p>
          </div>
          {sale.matched_at && (
            <p className="text-[11px] text-muted">
              선정일: {formatDate(sale.matched_at)}
            </p>
          )}
        </Card>
      )}

      {iWasSelected && myBid && (
        <PriceAdjustmentForm
          saleRequestId={sale.id}
          bidAmount={myBid.bid_amount}
          initialFinalPrice={sale.final_price}
          initialReason={sale.adjustment_reason}
          initialPhotos={adjustmentPhotos}
        />
      )}

      {iWasSelected && sale.status === "matched" && (
        <CompleteSaleButton
          saleRequestId={sale.id}
          hasAdjustment={sale.final_price != null}
        />
      )}

      {iWasRejected && (
        <Card className="border-muted bg-muted/10">
          <p className="text-sm font-semibold text-muted">
            😔 다른 딜러가 선정되었습니다
          </p>
          <p className="mt-1 text-xs text-muted">
            다음 기회를 노려보세요. 매물 리스트에서 새 매물을 확인할 수 있습니다.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        {v?.plate_number && (
          <span className="self-start rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
            {v.plate_number}
          </span>
        )}
        <CardTitle>
          {v?.manufacturer} {v?.model}
          {v?.trim ? ` · ${v.trim}` : ""}
        </CardTitle>
        <CardDescription>
          {v?.year}년식 · {formatMileage(sale.current_mileage ?? v?.mileage ?? 0)}
        </CardDescription>
      </Card>

      {photos.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">차량 사진 ({photos.length})</CardTitle>
          <SalePhotoGallery photos={photos} />
        </Card>
      )}

      <Card className="flex flex-col gap-2 border-primary/30 bg-primary/5">
        <CardTitle className="text-sm">📍 매각 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">판매 지역</dt>
          <dd
            className={
              sale.sale_location
                ? "text-right font-semibold text-foreground"
                : "text-right text-warning"
            }
          >
            {sale.sale_location ?? "미입력 (차주에게 문의)"}
          </dd>
          <dt className="text-muted">희망 시기</dt>
          <dd className="text-right">{sale.sale_timing ?? "미입력"}</dd>
          <dt className="text-muted">매도 사유</dt>
          <dd className="text-right">{sale.sale_reason ?? "미입력"}</dd>
          {sale.bidding_closes_at && (
            <>
              <dt className="text-muted">입찰 마감</dt>
              <dd className="text-right">{formatDate(sale.bidding_closes_at)}</dd>
            </>
          )}
        </dl>
        {sale.sale_location && (
          <p className="text-[11px] text-muted">
            탁송비·교통비를 판매 지역 고려해서 입찰가에 반영해주세요.
          </p>
        )}
      </Card>

      {missingInfo.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm font-semibold text-warning">
            ℹ️ 차주가 미입력한 정보: {missingInfo.join(", ")}
          </p>
          <p className="mt-1 text-xs text-muted">
            정확한 입찰가 산정에 영향이 있으니, 의문 시 입찰 비고란에 "정보 확인 후 가격 조정 가능" 명시
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">차량 기본 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">연료</dt>
          <dd className={`text-right ${!v?.fuel_type ? "text-warning" : ""}`}>
            {v?.fuel_type ?? "미입력"}
          </dd>
          <dt className="text-muted">변속기</dt>
          <dd className={`text-right ${!v?.transmission ? "text-warning" : ""}`}>
            {v?.transmission ?? "미입력"}
          </dd>
          <dt className="text-muted">배기량</dt>
          <dd className={`text-right ${!v?.displacement_cc ? "text-warning" : ""}`}>
            {v?.displacement_cc ? `${v.displacement_cc}cc` : "미입력"}
          </dd>
          <dt className="text-muted">차종</dt>
          <dd className={`text-right ${!v?.vehicle_class ? "text-warning" : ""}`}>
            {v?.vehicle_class ?? "미입력"}
          </dd>
          <dt className="text-muted">차체</dt>
          <dd className={`text-right ${!v?.body_type ? "text-warning" : ""}`}>
            {v?.body_type ?? "미입력"}
          </dd>
          <dt className="text-muted">승차정원</dt>
          <dd className="text-right">
            {v?.seating_capacity != null ? `${v.seating_capacity}명` : "미입력"}
          </dd>
          <dt className="text-muted">자동차키</dt>
          <dd className="text-right">
            {v?.key_count != null
              ? v.key_count >= 3
                ? "3개 이상"
                : `${v.key_count}개`
              : "미입력"}
          </dd>
          <dt className="text-muted">휠 기스</dt>
          <dd className="text-right">
            {v?.wheel_scuff_count != null
              ? v.wheel_scuff_count > 0
                ? `${v.wheel_scuff_count}개`
                : "없음"
              : "미입력"}
          </dd>
        </dl>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">색상 / 등록 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">외장색</dt>
          <dd className="text-right">{v?.color ?? "미입력"}</dd>
          <dt className="text-muted">내장색</dt>
          <dd className="text-right">{v?.interior_color ?? "미입력"}</dd>
          <dt className="text-muted">최초등록일</dt>
          <dd className="text-right">{v?.registered_at ?? "미입력"}</dd>
        </dl>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">식별 정보</CardTitle>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">원동기 형식</dt>
          <dd className="text-right font-mono">{v?.engine_code ?? "미입력"}</dd>
          <dt className="text-muted">차대번호 (VIN)</dt>
          <dd className="text-right font-mono break-all">{v?.vin ?? "미입력"}</dd>
        </dl>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle className="text-sm">
          🛠 외판 상태 ({damageEntries.length === 0 ? "무사고·무판금" : `${damageEntries.length}곳 손상`})
        </CardTitle>
        {countedDamage.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-danger">감가 반영 부위</p>
            <ul className="flex flex-wrap gap-1">
              {countedDamage.map(([part, s]) => (
                <li key={part} className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">
                  {part} · {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {ignoredDamage.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            <p className="text-[11px] font-semibold text-muted">감가 미반영 (앞/뒤 범퍼·휠)</p>
            <ul className="flex flex-wrap gap-1">
              {ignoredDamage.map(([part, s]) => (
                <li key={part} className="rounded-full bg-muted/15 px-2 py-0.5 text-xs text-muted">
                  {part} · {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {v?.damage_note && (
          <div className="mt-1 rounded-lg bg-surface p-2 text-xs">
            <p className="font-semibold text-foreground">차주 사고·수리 메모</p>
            <p className="mt-0.5 text-muted">{v.damage_note}</p>
          </div>
        )}
      </Card>

      {v?.options && v.options.length > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">옵션</CardTitle>
          <p className="text-xs text-muted">{v.options.join(" · ")}</p>
        </Card>
      )}

      {(maintenance?.length ?? 0) > 0 && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">
            🔧 정비/사고 이력 ({maintenance!.length}건)
          </CardTitle>
          <ul className="flex flex-col divide-y divide-border text-xs">
            {(maintenance as Array<{
              category: string;
              part: string;
              description: string | null;
              performed_at: string;
              cost: number | null;
            }>).map((m, i) => (
              <li key={i} className="py-1.5">
                <span className="text-muted">{m.performed_at}</span>
                <span className="ml-2 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">
                  {m.category}
                </span>
                <span className="ml-2">{m.part}</span>
                {m.description && (
                  <span className="ml-1 text-muted">({m.description})</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sale.additional_notes && (
        <Card className="flex flex-col gap-2">
          <CardTitle className="text-sm">📝 차주 메모</CardTitle>
          <p className="text-xs text-muted">{sale.additional_notes}</p>
        </Card>
      )}

      {myBid && (
        <Card className="border-success/30 bg-success/5">
          <p className="text-sm font-semibold text-success">✅ 입찰 완료</p>
          <p className="mt-1 text-sm">
            {myBid.bid_amount.toLocaleString("ko-KR")}원 ({myBid.status})
          </p>
          <p className="text-xs text-muted">{formatDate(myBid.created_at)}</p>
        </Card>
      )}

      {!myBid && dealer.verified && (
        <DealerBidForm saleRequestId={params.id} />
      )}

      {!dealer.verified && (
        <Card className="border-warning/30 bg-warning/5">
          <CardDescription>
            ⏳ 딜러 인증 후 입찰 가능합니다.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}
