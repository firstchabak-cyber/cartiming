import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  vehicleId: z.string().uuid(),
  currentMileage: z.number().int().nonnegative().optional(),
  contactPhone: z.string().trim().min(1),
  contactKakao: z.string().trim().optional(),
  saleLocation: z.string().trim().min(1, "판매 지역을 입력해주세요"),
  saleTiming: z
    .enum(["immediate", "within_week", "within_month", "undecided"])
    .optional(),
  saleReason: z.string().trim().max(500).optional(),
  additionalNotes: z.string().trim().max(2000).optional(),
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

  // 차량이 본인 소유 + 활성 상태인지 확인
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, status")
    .eq("id", parsed.data.vehicleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json(
      { error: "차량을 찾을 수 없습니다" },
      { status: 404 },
    );
  }
  if (vehicle.status !== "active") {
    return NextResponse.json(
      { error: "활성 상태의 차량만 매각 신청 가능합니다" },
      { status: 400 },
    );
  }

  // 이미 진행 중인 매각 신청이 있는지 체크
  const { data: existing } = await supabase
    .from("sale_requests")
    .select("id, status")
    .eq("vehicle_id", parsed.data.vehicleId)
    .in("status", ["pending", "bidding", "matched"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "이미 진행 중인 매각 신청이 있습니다", existing_id: existing.id },
      { status: 409 },
    );
  }

  // 키로수 업데이트 (입력했으면)
  if (parsed.data.currentMileage != null) {
    await supabase
      .from("vehicles")
      .update({ mileage: parsed.data.currentMileage })
      .eq("id", parsed.data.vehicleId);
  }

  const { data, error } = await supabase
    .from("sale_requests")
    .insert({
      vehicle_id: parsed.data.vehicleId,
      user_id: user.id,
      status: "pending", // 관리자 승인 대기
      current_mileage: parsed.data.currentMileage ?? null,
      contact_phone: parsed.data.contactPhone,
      contact_kakao: parsed.data.contactKakao ?? null,
      sale_location: parsed.data.saleLocation,
      sale_timing: parsed.data.saleTiming ?? null,
      sale_reason: parsed.data.saleReason ?? null,
      additional_notes: parsed.data.additionalNotes ?? null,
      bidding_closes_at: null, // 승인 시 설정
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "매각 신청 저장 실패", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id, status: "pending" }, { status: 201 });
}
