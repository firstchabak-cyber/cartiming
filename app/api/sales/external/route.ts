import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { classifyPlate } from "@/lib/analysis/prompt";

export const dynamic = "force-dynamic";

const schema = z.object({
  vehicleId: z.string().uuid(),
  soldPrice: z.number().int().positive(),
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  buyerType: z.enum(["dealer", "individual", "unknown"]).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select(
      "id, user_id, status, manufacturer, model, trim, year, mileage, fuel_type, transmission, body_type, damage_map, plate_number",
    )
    .eq("id", parsed.data.vehicleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vehicle) {
    return NextResponse.json(
      { error: "차량을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  // 차량 스냅샷 데이터 준비
  const damageMap =
    vehicle.damage_map && typeof vehicle.damage_map === "object"
      ? (vehicle.damage_map as Record<string, string>)
      : {};
  const damageCount = Object.values(damageMap).filter(
    (s) => s && s !== "없음",
  ).length;
  const plateInfo = classifyPlate(vehicle.plate_number);

  const admin = createAdminClient();

  // sale_transactions 에 외부 거래 기록
  const { error: insertError } = await admin
    .from("sale_transactions")
    .insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      source_sale_request_id: null,
      channel: "external",
      sold_price: parsed.data.soldPrice,
      sold_at: parsed.data.soldAt,
      buyer_type: parsed.data.buyerType ?? "unknown",
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
    });
  if (insertError) {
    return NextResponse.json(
      { error: "외부 매각 기록 실패", detail: insertError.message },
      { status: 500 },
    );
  }

  // 차량 상태를 sold 로 (status + sold_at 업데이트)
  await admin
    .from("vehicles")
    .update({ status: "sold", sold_at: parsed.data.soldAt })
    .eq("id", vehicle.id);

  return NextResponse.json({ ok: true });
}
