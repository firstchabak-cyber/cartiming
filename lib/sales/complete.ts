import { createAdminClient } from "@/lib/supabase/server";
import { classifyPlate } from "@/lib/analysis/prompt";
import { calculateDealerFee } from "@/lib/sales/fee";

export type CompleteSaleResult =
  | { ok: true; transactionId: string; finalPrice: number; feeAmount: number }
  | { ok: false; code: string; message: string };

/**
 * 매각 신청을 'completed' 로 전환하면서:
 * 1. sale_requests.status = 'completed' + completed_at
 * 2. vehicles.status = 'sold' + sold_at
 * 3. sale_transactions 생성 (수수료 자동 계산, fee_status=uncharged)
 * 4. user_credits.permanent_free_slots +1
 *
 * 차주 또는 선정 딜러가 호출 가능.
 */
export async function completeSale(args: {
  saleRequestId: string;
  callerId: string;
}): Promise<CompleteSaleResult> {
  const admin = createAdminClient();

  // sale_request 가져오기 + 권한 + 상태 검증
  const { data: sale } = await admin
    .from("sale_requests")
    .select(
      "id, user_id, vehicle_id, status, selected_bid_id, final_price, completed_at",
    )
    .eq("id", args.saleRequestId)
    .maybeSingle();
  if (!sale) {
    return { ok: false, code: "not_found", message: "신청을 찾을 수 없습니다" };
  }

  // 권한: 차주 본인 또는 선정 딜러
  let isAuthorized = sale.user_id === args.callerId;
  let dealerId: string | null = null;
  if (!isAuthorized && sale.selected_bid_id) {
    const { data: bid } = await admin
      .from("sale_bids")
      .select("dealer_id")
      .eq("id", sale.selected_bid_id)
      .maybeSingle();
    if (bid?.dealer_id === args.callerId) {
      isAuthorized = true;
      dealerId = bid.dealer_id;
    }
  }
  if (!isAuthorized) {
    return {
      ok: false,
      code: "forbidden",
      message: "차주 또는 선정 딜러만 거래 완료 처리 가능합니다",
    };
  }

  // 상태 검증
  if (sale.status === "completed") {
    return {
      ok: false,
      code: "already_completed",
      message: "이미 매각 완료된 거래입니다",
    };
  }
  if (sale.status !== "matched") {
    return {
      ok: false,
      code: "invalid_status",
      message: `현재 상태(${sale.status})에서는 완료 처리 불가합니다`,
    };
  }
  if (!sale.selected_bid_id) {
    return {
      ok: false,
      code: "no_bid",
      message: "선정된 입찰이 없습니다",
    };
  }

  // 입찰가 가져오기 + 차량 정보
  const { data: bid } = await admin
    .from("sale_bids")
    .select("bid_amount, dealer_id")
    .eq("id", sale.selected_bid_id)
    .maybeSingle();
  if (!bid) {
    return { ok: false, code: "bid_missing", message: "입찰 정보 없음" };
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select(
      "id, manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, damage_map, plate_number",
    )
    .eq("id", sale.vehicle_id)
    .maybeSingle();
  if (!vehicle) {
    return { ok: false, code: "vehicle_missing", message: "차량 정보 없음" };
  }

  const actualPrice = sale.final_price ?? bid.bid_amount;
  const feeAmount = calculateDealerFee(actualPrice);
  const today = new Date().toISOString();
  const todayDate = today.slice(0, 10);

  const damageMap =
    vehicle.damage_map && typeof vehicle.damage_map === "object"
      ? (vehicle.damage_map as Record<string, string>)
      : {};
  const damageCount = Object.values(damageMap).filter(
    (s) => s && s !== "없음",
  ).length;
  const plateInfo = classifyPlate(vehicle.plate_number);

  // 1. sale_transactions 생성
  const { data: txn, error: txnError } = await admin
    .from("sale_transactions")
    .insert({
      user_id: sale.user_id,
      vehicle_id: sale.vehicle_id,
      source_sale_request_id: sale.id,
      channel: "cartiming",
      sold_price: actualPrice,
      sold_at: todayDate,
      buyer_type: "dealer",
      snapshot_manufacturer: vehicle.manufacturer,
      snapshot_model: vehicle.model,
      snapshot_trim: vehicle.trim,
      snapshot_year: vehicle.year,
      snapshot_mileage: vehicle.mileage,
      snapshot_fuel_type: vehicle.fuel_type,
      snapshot_transmission: vehicle.transmission,
      snapshot_body_type: vehicle.body_type,
      snapshot_damage_count: damageCount,
      snapshot_plate_category:
        plateInfo.category === "unknown" ? null : plateInfo.category,
      fee_amount: feeAmount,
      fee_status: "uncharged",
    })
    .select("id")
    .single();

  if (txnError || !txn) {
    return {
      ok: false,
      code: "txn_create_failed",
      message: txnError?.message ?? "거래 기록 생성 실패",
    };
  }

  // 2. sale_request 완료
  await admin
    .from("sale_requests")
    .update({ status: "completed", completed_at: today })
    .eq("id", sale.id);

  // 3. vehicle 매각 처리
  await admin
    .from("vehicles")
    .update({ status: "sold", sold_at: todayDate })
    .eq("id", sale.vehicle_id);

  // 4. 차주 영구 슬롯 +1
  const { data: credits } = await admin
    .from("user_credits")
    .select("permanent_free_slots")
    .eq("user_id", sale.user_id)
    .maybeSingle();
  const currentSlots = credits?.permanent_free_slots ?? 0;
  await admin.from("user_credits").upsert(
    {
      user_id: sale.user_id,
      permanent_free_slots: currentSlots + 1,
      updated_at: today,
    },
    { onConflict: "user_id" },
  );
  await admin.from("credit_transactions").insert({
    user_id: sale.user_id,
    type: "admin_grant",
    amount: 0,
    balance_after: 0,
    description: "카타이밍 매각 완료 — 영구 무료 차량 슬롯 +1",
    ref_id: sale.id,
  });

  // 5. 상대방에게 알림 생성
  if (dealerId) {
    // 딜러가 완료 처리 → 차주에게 알림
    await admin.from("notifications").insert({
      user_id: sale.user_id,
      vehicle_id: sale.vehicle_id,
      type: "system",
      title: "거래 완료 처리됨",
      message: `매각 완료가 처리되었습니다. 매각가 ${actualPrice.toLocaleString("ko-KR")}원. 후기를 작성해 주세요.`,
    });
  } else if (bid.dealer_id) {
    // 차주가 완료 처리 → 딜러에게 알림
    await admin.from("notifications").insert({
      user_id: bid.dealer_id,
      vehicle_id: sale.vehicle_id,
      type: "system",
      title: "거래 완료 처리됨",
      message: `차주가 거래 완료를 처리했습니다. 매각가 ${actualPrice.toLocaleString("ko-KR")}원. 수수료 ${feeAmount.toLocaleString("ko-KR")}원 안내가 곧 전달됩니다.`,
    });
  }

  return {
    ok: true,
    transactionId: txn.id,
    finalPrice: actualPrice,
    feeAmount,
  };
}
