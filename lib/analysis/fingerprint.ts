import { createHash } from "crypto";
import type { VehicleForPrompt, MaintenanceRecord } from "./prompt";

// 객체 키를 재귀적으로 정렬해 직렬화 순서에 영향받지 않는 표준형(canonical)을 만든다.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = canonical(obj[k]);
    return sorted;
  }
  return value;
}

// 시세 분석 결과에 영향을 주는 차량 입력 필드들.
// (id·user_id·created_at 처럼 시세와 무관한 값은 제외)
const VEHICLE_FIELDS = [
  "manufacturer",
  "model",
  "trim",
  "year",
  "mileage",
  "fuel_type",
  "transmission",
  "displacement_cc",
  "body_type",
  "vehicle_class",
  "options",
  "damage_map",
  "wheel_scuff_count",
  "key_count",
  "damage_note",
  "plate_number",
  "color",
  "interior_color",
  "registered_at",
  "vin",
  "engine_code",
  "seating_capacity",
  "purchase_price",
  "loan_principal",
  "loan_started_at",
  "loan_months",
  "loan_apr",
] as const;

/**
 * 차량 입력값 + 정비이력으로 안정적인 지문(SHA-256)을 만든다.
 * 입력이 똑같으면 항상 같은 지문 → 같은 시세를 재사용할 수 있다.
 * (옵션 배열은 순서 무관하게 정렬, 정비이력도 정렬해 순서 영향 제거)
 */
export function computeInputHash(
  vehicle: VehicleForPrompt,
  maintenance: MaintenanceRecord[],
): string {
  const v = vehicle as unknown as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const f of VEHICLE_FIELDS) {
    let val: unknown = v[f] ?? null;
    if (f === "options" && Array.isArray(val)) {
      val = [...(val as unknown[])].map(String).sort();
    }
    picked[f] = val;
  }

  const mnt = (maintenance ?? []).map((m) => ({
    category: m.category ?? null,
    part: m.part ?? null,
    description: m.description ?? null,
    performed_at: m.performed_at ?? null,
    cost: m.cost ?? null,
  }));
  mnt.sort((a, b) =>
    JSON.stringify(a) < JSON.stringify(b) ? -1 : 1,
  );

  const str = JSON.stringify(canonical({ v: picked, m: mnt }));
  return createHash("sha256").update(str).digest("hex");
}
